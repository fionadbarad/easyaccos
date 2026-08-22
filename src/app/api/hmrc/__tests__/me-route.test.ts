/**
 * `/api/hmrc/me` — the user-restricted probe behind the dashboard's "test the
 * connection" button. It had no test of any kind.
 *
 * The case that matters most is the last one. HMRC's refresh tokens are
 * single-use: the moment `getValidAccessToken` redeems one, the old token is
 * spent at HMRC and only the rotated cookie can call again. This route wrote
 * that cookie onto a placeholder response and then copied it across on the
 * success path only — so a refresh followed by a failing `/hello/user` threw
 * the replacement away and left the browser holding a token HMRC had already
 * retired. The connection looked healthy and failed on the next call, with a
 * full reconnect the only way out.
 *
 * The submit routes fixed exactly this with `carryCookies`; this route was
 * missed, which is the propagation failure `docs/AUDIT.md` warns about.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

const ROUTE = '@/app/api/hmrc/me/route'

const H = vi.hoisted(() => ({
  apiBase: 'https://test-api.service.hmrc.gov.uk',
  user: null as { id: string } | null,
  auth: {
    fail: null as { status: number; message: string; needsReauth?: boolean } | null,
    refreshed: false,
    rotateCookie: false,
  },
}))

vi.mock('@/lib/auth-shared', () => ({
  getCachedUser: async () => H.user,
}))

vi.mock('@/lib/hmrc/oauth', () => ({
  readHmrcEnv: () => ({
    clientId: 'id',
    clientSecret: 'secret',
    apiBase: H.apiBase,
    loginBase: 'https://test-www.tax.service.gov.uk',
    redirectUri: 'https://easyacco.uk/api/hmrc/auth/callback',
    scopes: 'hello',
  }),
  getValidAccessToken: async (
    _env: unknown,
    _req: unknown,
    res: { cookies: { set: (n: string, v: string, o: unknown) => void } },
  ) => {
    // A refresh writes the rotated tokens onto the response before anything
    // else can fail — which is the whole point of the cases below.
    if (H.auth.rotateCookie) res.cookies.set('hmrc_tokens', 'rotated', { path: '/' })
    if (H.auth.fail) return { ok: false, ...H.auth.fail }
    return {
      ok: true,
      accessToken: 'access-token',
      tokens: { scope: 'hello', expiresAt: 1_800_000_000_000 },
      refreshed: H.auth.refreshed,
    }
  },
}))

function get() {
  return new Request('https://easyacco.uk/api/hmrc/me') as never
}

let fetchSpy: ReturnType<typeof vi.fn>

function hmrcReplies(init: { ok?: boolean; status?: number; body?: unknown }) {
  fetchSpy.mockResolvedValue({
    ok: init.ok ?? true,
    status: init.status ?? 200,
    text: async () => JSON.stringify(init.body ?? {}),
    headers: new Headers(),
  })
}

beforeEach(() => {
  vi.resetModules()
  H.user = { id: 'user-1' }
  H.auth.fail = null
  H.auth.refreshed = false
  H.auth.rotateCookie = false
  fetchSpy = vi.fn()
  hmrcReplies({ status: 200, body: { message: 'Hello User' } })
  vi.stubGlobal('fetch', fetchSpy)
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('GET /api/hmrc/me', () => {
  it('probes /hello/user with the stored token and reports what came back', async () => {
    const { GET } = await import(ROUTE)
    const res = await GET(get())
    const json = await res.json()

    const [url, init] = fetchSpy.mock.calls[0] as [string, { headers: Record<string, string> }]
    expect(url).toBe(`${H.apiBase}/hello/user`)
    expect(init.headers.Authorization).toBe('Bearer access-token')
    expect(init.headers.Accept).toBe('application/vnd.hmrc.1.0+json')

    expect(res.status).toBe(200)
    expect(json.ok).toBe(true)
    // The dashboard shows the scope and expiry, so they are part of the contract.
    expect(json.scope).toBe('hello')
    expect(json.expiresAt).toBe(1_800_000_000_000)
    expect(json.helloBody.message).toBe('Hello User')
  })

  it('401s a signed-out caller without spending the stored credential', async () => {
    H.user = null
    const { GET } = await import(ROUTE)
    const res = await GET(get())

    expect(res.status).toBe(401)
    expect((await res.json()).message).toBe('Not signed in')
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('passes an auth failure through with needsReauth so the UI can offer a reconnect', async () => {
    H.auth.fail = {
      status: 401,
      message: 'This HMRC connection belongs to a different easyacco account. Please reconnect.',
      needsReauth: true,
    }
    const { GET } = await import(ROUTE)
    const res = await GET(get())
    const json = await res.json()

    expect(res.status).toBe(401)
    expect(json.stage).toBe('auth')
    expect(json.needsReauth).toBe(true)
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('reports an HMRC rejection as 502 and keeps the original status on the body', async () => {
    hmrcReplies({ ok: false, status: 403, body: { code: 'INVALID_SCOPE' } })
    const { GET } = await import(ROUTE)
    const res = await GET(get())
    const json = await res.json()

    expect(res.status).toBe(502)
    expect(json.stage).toBe('hello')
    expect(json.status).toBe(403)
    expect(json.body.code).toBe('INVALID_SCOPE')
  })

  it('keeps the rotated token cookie even when the probe itself fails', async () => {
    // Without this the refresh is spent at HMRC and the replacement discarded,
    // silently disconnecting a user whose connection was in fact fine.
    H.auth.refreshed = true
    H.auth.rotateCookie = true
    const { GET } = await import(ROUTE)

    const okRes = await GET(get())
    expect((await okRes.json()).refreshed).toBe(true)
    expect(okRes.cookies.get('hmrc_tokens')?.value).toBe('rotated')

    hmrcReplies({ ok: false, status: 403, body: { code: 'INVALID_SCOPE' } })
    const rejected = await GET(get())
    expect(rejected.status).toBe(502)
    expect(rejected.cookies.get('hmrc_tokens')?.value).toBe('rotated')

    fetchSpy.mockRejectedValue(new Error('ECONNRESET'))
    const failed = await GET(get())
    expect(failed.status).toBe(502)
    expect(failed.cookies.get('hmrc_tokens')?.value).toBe('rotated')
  })
})
