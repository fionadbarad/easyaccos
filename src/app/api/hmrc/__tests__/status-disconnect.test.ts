/**
 * /api/hmrc/status and /api/hmrc/auth/disconnect — previously 0 % (TST-3).
 * Status is what the dashboard trusts to say "connected"; disconnect is the
 * only way a user cuts this app off from HMRC, and SEC-10 promises it tells
 * the truth about what it cannot revoke.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { TOKENS_COOKIE, type StoredTokens } from '@/lib/hmrc/cookies'
import { encrypt } from '@/lib/hmrc/crypto'

// Status only reports "connected" to the Supabase account the cookie is bound
// to. Signed in as user-1 by default; cases flip it. Same shape as
// hello-auth.test.ts.
const session = vi.hoisted(() => ({ user: { id: 'user-1' } as { id: string } | null }))

vi.mock('@/lib/supabase-server', () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: session.user }, error: null }) },
  }),
}))

beforeEach(() => {
  vi.resetModules()
  session.user = { id: 'user-1' }
  vi.stubEnv('HMRC_COOKIE_SECRET', Buffer.alloc(32).toString('base64'))
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('/api/hmrc/status', () => {
  it('reports connected with scope and expiry when a valid token cookie exists', async () => {
    // If this fails, the dashboard shows "not connected" to a connected user
    // (or the reverse) and submissions are attempted in the wrong state.
    const tokens: StoredTokens = {
      accessToken: 'a',
      refreshToken: 'r',
      scope: 'read:self-assessment',
      expiresAt: Date.now() + 60_000,
      userId: 'user-1',
    }
    const { GET } = await import('@/app/api/hmrc/status/route')
    const res = await GET(
      new NextRequest('http://localhost:3000/api/hmrc/status', {
        headers: { cookie: `${TOKENS_COOKIE}=${encrypt(JSON.stringify(tokens))}` },
      }),
    )
    const body = await res.json()

    expect(body.connected).toBe(true)
    expect(body.scope).toBe('read:self-assessment')
    // The tokens themselves must never appear in the status body.
    expect(JSON.stringify(body)).not.toMatch(/accessToken|refreshToken|"a"|"r"/)
  })

  it('reports not connected for a missing or undecryptable cookie', async () => {
    // If this fails, a tampered cookie is treated as a live connection.
    const { GET } = await import('@/app/api/hmrc/status/route')
    const none = await GET(new NextRequest('http://localhost:3000/api/hmrc/status'))
    expect((await none.json()).connected).toBe(false)

    const garbage = await GET(
      new NextRequest('http://localhost:3000/api/hmrc/status', {
        headers: { cookie: `${TOKENS_COOKIE}=not-a-real-ciphertext` },
      }),
    )
    expect((await garbage.json()).connected).toBe(false)
  })

  it('reports not connected when the cookie is bound to a different account, or nobody is signed in', async () => {
    // If this fails, the dashboard shows the previous account's HMRC
    // connection as live to whoever signs in next on the same browser.
    const tokens: StoredTokens = {
      accessToken: 'a',
      refreshToken: 'r',
      scope: 'read:self-assessment',
      expiresAt: Date.now() + 60_000,
      userId: 'someone-else',
    }
    const req = () =>
      new NextRequest('http://localhost:3000/api/hmrc/status', {
        headers: { cookie: `${TOKENS_COOKIE}=${encrypt(JSON.stringify(tokens))}` },
      })
    const { GET } = await import('@/app/api/hmrc/status/route')

    expect((await (await GET(req())).json()).connected).toBe(false)

    session.user = null
    expect((await (await GET(req())).json()).connected).toBe(false)
  })
})

describe('/api/hmrc/auth/disconnect', () => {
  it('expires both HMRC cookies and points the user at HMRC manage-authority (SEC-10)', async () => {
    // If this fails, "disconnect" either leaves live tokens in the browser or
    // implies the HMRC-side grant was revoked when it was not.
    const { POST } = await import('@/app/api/hmrc/auth/disconnect/route')
    const res = await POST()
    const body = await res.json()

    expect(body.ok).toBe(true)
    expect(body.manageAuthorityUrl).toMatch(/^https?:\/\//)
    const tokenCookie = res.cookies.get(TOKENS_COOKIE)
    expect(tokenCookie?.value).toBe('')
    expect(tokenCookie?.maxAge).toBe(0)
    expect(res.cookies.get('hmrc_oauth_state')?.maxAge).toBe(0)
  })
})
