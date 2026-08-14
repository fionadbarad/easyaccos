/**
 * getValidAccessToken — the function every MTD route calls before touching
 * HMRC (TST-2). refresh-single-flight.test.ts covers the SEC-15 collapse
 * underneath it; nothing covered the boundary itself: the skew check, the
 * needsReauth mapping, the cookie write on refresh, the 502 on a malformed
 * refresh response, and the hard bound on the recent-refresh map.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'
import {
  getValidAccessToken,
  refreshTokensOnce,
  __resetRefreshStateForTests,
  type HmrcEnv,
} from '@/lib/hmrc/oauth'
import { TOKENS_COOKIE, readTokensCookie, type StoredTokens } from '@/lib/hmrc/cookies'
import { encrypt } from '@/lib/hmrc/crypto'

const ENV: HmrcEnv = {
  clientId: 'test-client-id',
  clientSecret: 'test-client-secret',
  apiBase: 'https://test-api.service.hmrc.gov.uk',
  loginBase: 'https://test-www.tax.service.gov.uk',
  redirectUri: 'http://localhost:3000/api/hmrc/auth/callback',
  scopes: 'read:self-assessment',
}

function makeReq(tokens?: StoredTokens): NextRequest {
  const headers = tokens
    ? { cookie: `${TOKENS_COOKIE}=${encrypt(JSON.stringify(tokens))}` }
    : undefined
  return new NextRequest('http://localhost:3000/api/hmrc/me', { headers })
}

function storedTokens(over: Partial<StoredTokens> = {}): StoredTokens {
  return {
    accessToken: 'old-access',
    refreshToken: 'old-refresh',
    scope: 'read:self-assessment',
    expiresAt: Date.now() + 60 * 60 * 1000, // fresh: an hour left
    userId: 'user-1',
    ...over,
  }
}

// Expiring inside the 60s refresh skew — forces the refresh branch.
const EXPIRING = () => storedTokens({ expiresAt: Date.now() + 30 * 1000 })

function refreshOkBody() {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      access_token: 'new-access',
      refresh_token: 'new-refresh',
      scope: 'read:self-assessment',
      expires_in: 14400,
    }),
  }
}

let fetchSpy: ReturnType<typeof vi.fn>

beforeEach(() => {
  __resetRefreshStateForTests()
  fetchSpy = vi.fn()
  vi.stubGlobal('fetch', fetchSpy)
  // 32 zero bytes, base64 — the cookie round-trip uses the real crypto.
  vi.stubEnv('HMRC_COOKIE_SECRET', Buffer.alloc(32).toString('base64'))
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('getValidAccessToken', () => {
  it('401s with needsReauth when no token cookie is present', async () => {
    // If this fails, a disconnected user gets an opaque HMRC error instead of
    // being sent back through the connect flow.
    const result = await getValidAccessToken(ENV, makeReq(), NextResponse.next(), 'user-1')

    expect(result).toEqual({
      ok: false,
      status: 401,
      message: 'Not connected to HMRC',
      needsReauth: true,
    })
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('returns a fresh token as-is without spending the refresh token', async () => {
    // If this fails, every MTD call redeems the single-use refresh token,
    // burning through HMRC's grant chain on requests that needed nothing.
    const res = NextResponse.next()
    const result = await getValidAccessToken(ENV, makeReq(storedTokens()), res, 'user-1')

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.accessToken).toBe('old-access')
      expect(result.refreshed).toBe(false)
    }
    expect(fetchSpy).not.toHaveBeenCalled()
    expect(res.cookies.get(TOKENS_COOKIE)).toBeUndefined()
  })

  it('refreshes a token inside the skew window and writes the new tokens onto the response cookie', async () => {
    // If this fails, either submissions go out with an about-to-expire token,
    // or the rotated tokens never reach the browser — the old refresh token is
    // already spent, so the user is silently disconnected from HMRC.
    fetchSpy.mockResolvedValueOnce(refreshOkBody())
    const res = NextResponse.next()

    const result = await getValidAccessToken(ENV, makeReq(EXPIRING()), res, 'user-1')

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.accessToken).toBe('new-access')
      expect(result.refreshed).toBe(true)
    }
    const body = String(fetchSpy.mock.calls[0]?.[1]?.body)
    expect(body).toContain('grant_type=refresh_token')
    expect(body).toContain('refresh_token=old-refresh')
    // Round-trip the Set-Cookie through the real reader: the browser must end
    // up holding the rotated pair.
    const written = res.cookies.get(TOKENS_COOKIE)?.value
    expect(written).toBeTruthy()
    const reread = readTokensCookie(
      new NextRequest('http://localhost:3000/x', {
        headers: { cookie: `${TOKENS_COOKIE}=${written}` },
      }),
    )
    expect(reread?.accessToken).toBe('new-access')
    expect(reread?.refreshToken).toBe('new-refresh')
  })

  it('401s when the cookie belongs to a different account, without touching HMRC', async () => {
    // If this fails, whoever signs in next on a shared browser inherits the
    // previous account's HMRC connection and files against their tax account.
    const res = NextResponse.next()
    const result = await getValidAccessToken(ENV, makeReq(storedTokens()), res, 'user-2')

    expect(result).toEqual({
      ok: false,
      status: 401,
      message: 'This HMRC connection belongs to a different easyacco account. Please reconnect.',
      needsReauth: true,
    })
    expect(fetchSpy).not.toHaveBeenCalled()
    expect(res.cookies.get(TOKENS_COOKIE)).toBeUndefined()
  })

  it('keeps the rotated cookie bound to the same account after a refresh', async () => {
    // If this fails, one refresh silently launders the cookie into an unbound
    // (or wrongly bound) token set and the mismatch check above stops holding.
    fetchSpy.mockResolvedValueOnce(refreshOkBody())
    const res = NextResponse.next()

    const result = await getValidAccessToken(ENV, makeReq(EXPIRING()), res, 'user-1')

    expect(result.ok).toBe(true)
    if (result.ok) expect(result.tokens.userId).toBe('user-1')
    const written = res.cookies.get(TOKENS_COOKIE)?.value
    const reread = readTokensCookie(
      new NextRequest('http://localhost:3000/x', {
        headers: { cookie: `${TOKENS_COOKIE}=${written}` },
      }),
    )
    expect(reread?.userId).toBe('user-1')
  })

  it('maps refresh 400/401 to needsReauth and other statuses to a retryable failure', async () => {
    // If this fails, a revoked grant loops the user through doomed retries, or
    // a transient HMRC 503 wrongly forces a full reconnect.
    fetchSpy.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ error: 'invalid_grant' }),
    })
    const revoked = await getValidAccessToken(
      ENV,
      makeReq(EXPIRING()),
      NextResponse.next(),
      'user-1',
    )
    expect(revoked.ok).toBe(false)
    if (!revoked.ok) expect(revoked.needsReauth).toBe(true)

    __resetRefreshStateForTests()
    fetchSpy.mockResolvedValueOnce({
      ok: false,
      status: 503,
      json: async () => ({ error: 'server_error' }),
    })
    const outage = await getValidAccessToken(
      ENV,
      makeReq(storedTokens({ expiresAt: Date.now() + 30 * 1000, refreshToken: 'other-refresh' })),
      NextResponse.next(),
      'user-1',
    )
    expect(outage.ok).toBe(false)
    if (!outage.ok) {
      expect(outage.status).toBe(503)
      expect(outage.needsReauth).toBe(false)
    }
  })

  it('502s when the refresh response is missing required fields, without needsReauth', async () => {
    // If this fails, a malformed HMRC response gets treated as a usable token
    // set — or as a revoked grant — instead of a server-side fault.
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ access_token: 'new-access' }), // no refresh_token / expires_in
    })

    const result = await getValidAccessToken(
      ENV,
      makeReq(EXPIRING()),
      NextResponse.next(),
      'user-1',
    )

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.status).toBe(502)
      expect(result.needsReauth).toBe(false)
      expect(result.message).toMatch(/missing required fields/)
    }
  })
})

describe('pruneRecent hard bound', () => {
  it('caps the recent-refresh map at MAX_TRACKED_REFRESHES by evicting the oldest entries', async () => {
    // If this fails, a map holding live HMRC tokens grows without limit under
    // unusual traffic — an unbounded in-memory token store.
    fetchSpy.mockResolvedValue(refreshOkBody())
    const now = Date.now()

    // Fill past the bound with distinct successful refreshes, all inside TTL.
    for (let i = 0; i <= 200; i++) {
      await refreshTokensOnce(ENV, `token-${i}`, now)
    }
    expect(fetchSpy).toHaveBeenCalledTimes(201)

    // The oldest entry is evicted by the hard bound, so re-asking for it must
    // hit HMRC again rather than the cache…
    await refreshTokensOnce(ENV, 'token-0', now)
    expect(fetchSpy).toHaveBeenCalledTimes(202)

    // …while a recent entry is still served from the cache.
    await refreshTokensOnce(ENV, 'token-200', now)
    expect(fetchSpy).toHaveBeenCalledTimes(202)
  })
})
