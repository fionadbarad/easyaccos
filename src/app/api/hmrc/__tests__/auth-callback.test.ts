/**
 * /api/hmrc/auth/callback — the security boundary of the HMRC integration
 * (TST-3). CSRF state verification, the code exchange, and the token cookie
 * write all live here, and none of it was tested. Follows the shape of
 * hello-auth.test.ts: stubbed fetch as the load-bearing assertion.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { STATE_COOKIE, TOKENS_COOKIE } from '@/lib/hmrc/cookies'

const ROUTE = '@/app/api/hmrc/auth/callback/route'

vi.mock('@/lib/monitor', () => ({ reportError: vi.fn(), reportWarn: vi.fn() }))

let fetchSpy: ReturnType<typeof vi.fn>

beforeEach(() => {
  vi.resetModules()
  fetchSpy = vi.fn()
  vi.stubGlobal('fetch', fetchSpy)
  vi.stubEnv('HMRC_CLIENT_ID', 'test-client-id')
  vi.stubEnv('HMRC_CLIENT_SECRET', 'test-client-secret')
  vi.stubEnv('HMRC_API_BASE', 'https://test-api.service.hmrc.gov.uk')
  vi.stubEnv('HMRC_LOGIN_BASE', 'https://test-www.tax.service.gov.uk')
  vi.stubEnv('HMRC_REDIRECT_URI', 'http://localhost:3000/api/hmrc/auth/callback')
  vi.stubEnv('HMRC_SCOPES', 'read:self-assessment')
  vi.stubEnv('HMRC_COOKIE_SECRET', Buffer.alloc(32).toString('base64'))
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

function makeReq(query: Record<string, string>, stateCookie?: string): NextRequest {
  const url = new URL('http://localhost:3000/api/hmrc/auth/callback')
  for (const [k, v] of Object.entries(query)) url.searchParams.set(k, v)
  return new NextRequest(url, {
    headers: stateCookie ? { cookie: `${STATE_COOKIE}=${stateCookie}` } : undefined,
  })
}

function location(res: Response): URL {
  return new URL(res.headers.get('Location')!)
}

describe('/api/hmrc/auth/callback CSRF state check', () => {
  it('rejects a mismatched state without exchanging the code', async () => {
    // If this fails, an attacker-crafted callback link can splice their HMRC
    // account tokens into a victim's session — the CSRF the state exists for.
    const { GET } = await import(ROUTE)
    const res = await GET(makeReq({ code: 'auth-code', state: 'attacker' }, 'real-state'))

    expect(res.status).toBe(302)
    expect(location(res).searchParams.get('hmrc_error')).toBe('state_mismatch')
    expect(fetchSpy).not.toHaveBeenCalled()
    const cookies = res.headers.getSetCookie().join('\n')
    expect(cookies).not.toContain(`${TOKENS_COOKIE}=`)
  })

  it('rejects missing params without leaking the server-side diagnostic into the redirect', async () => {
    // If this fails, cookie names / host / referer travel back in the URL and
    // land in browser history — the SEC-11 leak.
    const { GET } = await import(ROUTE)
    const res = await GET(makeReq({ code: 'auth-code' })) // no state, no cookie

    const loc = location(res)
    expect(loc.searchParams.get('hmrc_error')).toBe('missing_params')
    expect(loc.toString()).not.toMatch(/host=|cookies=|referer=/)
    expect(fetchSpy).not.toHaveBeenCalled()
  })
})

describe('/api/hmrc/auth/callback code exchange', () => {
  it('exchanges the code and writes the encrypted token cookie on success', async () => {
    // If this fails, a user completes HMRC consent but never becomes
    // connected — or the tokens are written unencrypted.
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        access_token: 'access-1',
        refresh_token: 'refresh-1',
        scope: 'read:self-assessment',
        expires_in: 14400,
      }),
    })
    const { GET } = await import(ROUTE)
    const res = await GET(makeReq({ code: 'auth-code', state: 's1' }, 's1'))

    expect(res.status).toBe(302)
    expect(location(res).searchParams.get('hmrc_connected')).toBe('1')
    const body = String(fetchSpy.mock.calls[0]?.[1]?.body)
    expect(body).toContain('grant_type=authorization_code')
    expect(body).toContain('code=auth-code')

    const setCookies = res.headers.getSetCookie()
    const tokenCookie = setCookies.find((c: string) => c.startsWith(`${TOKENS_COOKIE}=`))
    expect(tokenCookie).toMatch(/HttpOnly/)
    // Encrypted at rest: the raw token must not appear in the cookie value.
    expect(tokenCookie).not.toContain('access-1')
    // Round-trip through the real reader to prove the browser ends up
    // holding usable tokens.
    const { readTokensCookie } = await import('@/lib/hmrc/cookies')
    const value = tokenCookie!.split(';')[0]!.slice(`${TOKENS_COOKIE}=`.length)
    const reread = readTokensCookie(
      new NextRequest('http://localhost:3000/x', {
        headers: { cookie: `${TOKENS_COOKIE}=${value}` },
      }),
    )
    expect(reread?.accessToken).toBe('access-1')
    // The single-use state cookie is retired in the same response.
    expect(setCookies.some((c: string) => c.startsWith(`${STATE_COOKIE}=;`))).toBe(true)
  })

  it('reports a failed exchange without setting a token cookie', async () => {
    // If this fails, a rejected code leaves the user looking connected while
    // holding no usable tokens.
    fetchSpy.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ error: 'invalid_grant', error_description: 'code expired' }),
    })
    const { GET } = await import(ROUTE)
    const res = await GET(makeReq({ code: 'stale-code', state: 's1' }, 's1'))

    const loc = location(res)
    expect(loc.searchParams.get('hmrc_error')).toBe('token_exchange_failed')
    expect(res.headers.getSetCookie().join('\n')).not.toContain(`${TOKENS_COOKIE}=`)
  })

  it('passes an HMRC error param straight back without calling out', async () => {
    // If this fails, a user who clicked "deny" at HMRC triggers a doomed code
    // exchange instead of a clean explanation.
    const { GET } = await import(ROUTE)
    const res = await GET(makeReq({ error: 'access_denied' }, 's1'))

    expect(location(res).searchParams.get('hmrc_error')).toBe('access_denied')
    expect(fetchSpy).not.toHaveBeenCalled()
  })
})
