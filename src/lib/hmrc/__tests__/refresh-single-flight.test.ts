/**
 * SEC-15 — HMRC refresh tokens are single use.
 *
 * Two requests arriving near expiry read the same token from the same cookie
 * and both POST it. One wins; the loser gets `invalid_grant` for a token HMRC
 * has already retired, and whichever response writes last decides what the
 * browser keeps. The user is disconnected — typically mid-submission, which is
 * exactly when MTD-4 was about to let them retry.
 *
 * These tests pin the two guarantees `refreshTokensOnce` adds:
 *   1. concurrent callers redeem the token ONCE and share the answer;
 *   2. a caller arriving just after, still holding the spent token, gets the
 *      tokens that redemption produced rather than a failure.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { refreshTokensOnce, __resetRefreshStateForTests, type HmrcEnv } from '@/lib/hmrc/oauth'

const env: HmrcEnv = {
  clientId: 'cid',
  clientSecret: 'secret',
  apiBase: 'https://test-api.service.hmrc.gov.uk',
  loginBase: 'https://test-www.tax.service.hmrc.gov.uk',
  redirectUri: 'https://easyacco.uk/api/hmrc/auth/callback',
  scopes: 'read:vat write:vat',
}

function tokenResponse(accessToken: string, refreshToken: string) {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: 14_400,
      scope: 'read:vat write:vat',
      token_type: 'bearer',
    }),
  } as unknown as Response
}

let fetchMock: ReturnType<typeof vi.fn>

beforeEach(() => {
  __resetRefreshStateForTests()
  fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
  __resetRefreshStateForTests()
})

describe('refreshTokensOnce collapses concurrent redemptions', () => {
  it('POSTs once when two callers race with the same token', async () => {
    let release: (() => void) | null = null
    const gate = new Promise<void>((r) => {
      release = r
    })
    fetchMock.mockImplementation(async () => {
      await gate
      return tokenResponse('new-access', 'new-refresh')
    })

    // Both start before either finishes — the race the cookie read creates.
    const a = refreshTokensOnce(env, 'shared-refresh-token')
    const b = refreshTokensOnce(env, 'shared-refresh-token')
    release!()
    const [ra, rb] = await Promise.all([a, b])

    // One network call, not two: the second caller never sends the token HMRC
    // is in the middle of retiring.
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(ra.ok).toBe(true)
    expect(rb.ok).toBe(true)
    // …and both hold the SAME new tokens, so whichever response writes the
    // cookie last, the browser ends up with a live token either way.
    expect(ra.ok && ra.tokens.accessToken).toBe('new-access')
    expect(rb.ok && rb.tokens.accessToken).toBe('new-access')
    expect(rb.ok && rb.tokens.refreshToken).toBe('new-refresh')
  })

  it('answers a straggler holding the already-spent token', async () => {
    fetchMock.mockResolvedValue(tokenResponse('new-access', 'new-refresh'))

    const first = await refreshTokensOnce(env, 'spent-token')
    expect(first.ok).toBe(true)

    // A request that read the cookie a moment before the rotation lands still
    // has the old token. Replaying it to HMRC would fail; it gets the result of
    // the redemption that already happened instead.
    const straggler = await refreshTokensOnce(env, 'spent-token')
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(straggler.ok && straggler.tokens.accessToken).toBe('new-access')
  })

  it('expires the memo so a genuinely later refresh goes to HMRC', async () => {
    fetchMock.mockResolvedValue(tokenResponse('a1', 'r1'))
    const t0 = 1_000_000
    await refreshTokensOnce(env, 'tok', t0)
    // Beyond the 30s memo window this is no longer the same moment in time —
    // the caller means it, and must reach HMRC.
    await refreshTokensOnce(env, 'tok', t0 + 31_000)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('does not memoise failures', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 503,
      json: async () => ({ error: 'server_error' }),
    } as unknown as Response)
    const failed = await refreshTokensOnce(env, 'tok')
    expect(failed.ok).toBe(false)

    // A 503 is transient and does not retire the token. Replaying that failure
    // for 30 seconds would turn one bad moment into a refusal to try again.
    fetchMock.mockResolvedValueOnce(tokenResponse('a2', 'r2'))
    const retried = await refreshTokensOnce(env, 'tok')
    expect(retried.ok).toBe(true)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('keeps different tokens independent', async () => {
    fetchMock.mockResolvedValueOnce(tokenResponse('a1', 'r1'))
    fetchMock.mockResolvedValueOnce(tokenResponse('a2', 'r2'))
    const [x, y] = await Promise.all([
      refreshTokensOnce(env, 'token-one'),
      refreshTokensOnce(env, 'token-two'),
    ])
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(x.ok && x.tokens.accessToken).not.toBe(y.ok && y.tokens.accessToken)
  })
})
