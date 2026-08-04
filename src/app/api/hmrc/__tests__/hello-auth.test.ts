/**
 * /api/hmrc/hello is a diagnostic that spends real credentials.
 *
 * Each call performs a client_credentials grant using HMRC_CLIENT_SECRET and
 * then a second authenticated call to HMRC. Deployed without a gate it is an
 * anonymous handle on our HMRC application's rate allowance, and its `env`
 * failure branch tells an unauthenticated caller whether our HMRC credentials
 * are configured.
 *
 * The load-bearing assertion in every case below is `fetchSpy` — a refusal that
 * still made the outbound token request would not be a fix. Following the shape
 * of ai-disabled.test.ts, which locks the AI kill-switch the same way.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

const ROUTE = '@/app/api/hmrc/hello/route'

const session = vi.hoisted(() => ({ user: null as { id: string } | null }))

vi.mock('@/lib/supabase-server', () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: session.user }, error: null }) },
  }),
}))

let fetchSpy: ReturnType<typeof vi.fn>

beforeEach(async () => {
  vi.resetModules()
  session.user = null
  fetchSpy = vi.fn()
  vi.stubGlobal('fetch', fetchSpy)
  // Present and plausible, so nothing below can pass merely because the
  // environment was empty.
  vi.stubEnv('HMRC_CLIENT_ID', 'test-client-id')
  vi.stubEnv('HMRC_CLIENT_SECRET', 'test-client-secret')
  vi.stubEnv('HMRC_API_BASE', 'https://test-api.service.hmrc.gov.uk')
  const { __resetRateLimitForTests } = await import('@/lib/rate-limit')
  __resetRateLimitForTests()
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('/api/hmrc/hello requires a session', () => {
  it('401s a signed-out caller without spending a credential', async () => {
    const { GET } = await import(ROUTE)
    const res = await GET()

    expect(res.status).toBe(401)
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('does not reveal whether HMRC credentials are configured', async () => {
    // The env branch is a configuration oracle. A signed-out caller must get
    // the same 401 whether or not the secrets are set.
    vi.stubEnv('HMRC_CLIENT_ID', '')
    vi.stubEnv('HMRC_CLIENT_SECRET', '')
    vi.stubEnv('HMRC_API_BASE', '')

    const { GET } = await import(ROUTE)
    const res = await GET()
    const body = (await res.json()) as { stage: string; message?: string }

    expect(res.status).toBe(401)
    expect(body.stage).toBe('auth')
    expect(body.message).not.toMatch(/HMRC_CLIENT|env/i)
  })

  it('lets a signed-in caller through', async () => {
    session.user = { id: 'user-1' }
    fetchSpy
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ access_token: 'tok', scope: 'hello', expires_in: 14400 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ message: 'Hello Application!' }),
      })

    const { GET } = await import(ROUTE)
    const res = await GET()
    const body = (await res.json()) as { ok: boolean; helloBody: unknown }

    expect(res.status).toBe(200)
    expect(body.ok).toBe(true)
    expect(body.helloBody).toEqual({ message: 'Hello Application!' })
    expect(fetchSpy).toHaveBeenCalledTimes(2)
  })
})

describe('/api/hmrc/hello is rate limited per user', () => {
  it('429s the 11th call in a minute and stops calling out', async () => {
    session.user = { id: 'user-rate-limited' }
    fetchSpy.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ access_token: 'tok', scope: 'hello', expires_in: 14400 }),
      text: async () => '{}',
    })

    const { GET } = await import(ROUTE)
    for (let i = 0; i < 10; i++) {
      expect((await GET()).status, `call ${i + 1}`).toBe(200)
    }
    const callsWhileAllowed = fetchSpy.mock.calls.length

    const blocked = await GET()
    expect(blocked.status).toBe(429)
    expect(blocked.headers.get('Retry-After')).toBeTruthy()
    // Nothing further left the server.
    expect(fetchSpy.mock.calls.length).toBe(callsWhileAllowed)
  })

  it('meters each user separately', async () => {
    const { GET } = await import(ROUTE)
    fetchSpy.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ access_token: 'tok', scope: 'hello', expires_in: 14400 }),
      text: async () => '{}',
    })

    session.user = { id: 'noisy' }
    for (let i = 0; i < 10; i++) await GET()
    expect((await GET()).status).toBe(429)

    session.user = { id: 'quiet' }
    expect((await GET()).status).toBe(200)
  })
})
