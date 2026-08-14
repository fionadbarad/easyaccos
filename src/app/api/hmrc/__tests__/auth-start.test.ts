/**
 * /api/hmrc/auth/start — the guard that stops a signed-out visitor reaching
 * HMRC's consent screen.
 *
 * /dashboard is usable as a guest by design, so this route is reachable with
 * no session. Without the guard the visitor grants authority at HMRC, returns,
 * and is refused — leaving a live grant on their HMRC account that nothing
 * here can use and only they can withdraw. The assertions below are that no
 * redirect to HMRC is issued and no state cookie is minted for a guest.
 *
 * Follows the shape of auth-callback.test.ts: a hoisted session mock that
 * individual cases sign out.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { STATE_COOKIE } from '@/lib/hmrc/cookies'

const ROUTE = '@/app/api/hmrc/auth/start/route'

const session = vi.hoisted(() => ({ user: { id: 'user-1' } as { id: string } | null }))

vi.mock('@/lib/supabase-server', () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: session.user }, error: null }) },
  }),
}))

beforeEach(() => {
  vi.resetModules()
  session.user = { id: 'user-1' }
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
})

describe('GET /api/hmrc/auth/start', () => {
  it('redirects a signed-out visitor back to the connect page without contacting HMRC', async () => {
    session.user = null
    const { GET } = await import(ROUTE)
    const res = await GET()

    expect(res.status).toBe(302)
    const location = res.headers.get('Location') ?? ''
    expect(location).toBe('/dashboard/hmrc?hmrc_error=not_signed_in')
    // The load-bearing assertion: nowhere near HMRC's authorize endpoint.
    expect(location).not.toContain('oauth/authorize')
    expect(location).not.toContain('tax.service.gov.uk')
  })

  it('mints no state cookie for a signed-out visitor', async () => {
    session.user = null
    const { GET } = await import(ROUTE)
    const res = await GET()

    // A state cookie handed to a guest is a CSRF token bound to nobody, and it
    // would still be sitting there if they signed in and started a real flow.
    expect(res.headers.get('Set-Cookie')).toBeNull()
  })

  it('sends a signed-in user to HMRC with a state cookie', async () => {
    const { GET } = await import(ROUTE)
    const res = await GET()

    expect(res.status).toBe(302)
    const location = res.headers.get('Location') ?? ''
    expect(location).toContain('https://test-www.tax.service.gov.uk/oauth/authorize')
    expect(location).toContain('response_type=code')

    const cookie = res.headers.get('Set-Cookie') ?? ''
    expect(cookie).toContain(`${STATE_COOKIE}=`)
    expect(cookie).toContain('HttpOnly')
    expect(cookie).toContain('SameSite=Lax')

    // The state in the cookie must be the state in the URL, or the callback's
    // CSRF check compares a value against a different one and always fails.
    const cookieState = new RegExp(`(?:^|;\\s*)${STATE_COOKIE}=([^;]+)`).exec(cookie)?.[1]
    expect(cookieState).toBeTruthy()
    expect(new URL(location).searchParams.get('state')).toBe(cookieState)
  })

  it('does not cache the redirect', async () => {
    const { GET } = await import(ROUTE)
    const res = await GET()
    // A cached 302 leaks one user's state cookie to the next visitor.
    expect(res.headers.get('Cache-Control')).toContain('no-store')
  })
})
