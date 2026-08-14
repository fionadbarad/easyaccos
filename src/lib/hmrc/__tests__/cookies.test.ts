/**
 * cookies.ts decides how the HMRC OAuth tokens are stored in the browser.
 *
 * crypto.ts next door is well covered, but the encryption is only half of it:
 * the cookie ATTRIBUTES are what stop a refresh token being readable by any
 * script on the page. Nothing asserted them, so dropping `httpOnly` — a
 * one-word edit — would have passed review, passed CI, and shipped.
 *
 * These tests pin the security-relevant attributes, the round trip, and the
 * rejection of anything that does not decrypt to a well-formed token set.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import type { NextRequest, NextResponse } from 'next/server'
import {
  TOKENS_COOKIE,
  STATE_COOKIE,
  setTokensCookie,
  clearTokensCookie,
  readTokensCookie,
  setStateCookie,
  readStateCookie,
  type StoredTokens,
} from '@/lib/hmrc/cookies'

// 32 bytes, base64 — the key length crypto.ts requires.
const TEST_KEY = Buffer.alloc(32, 7).toString('base64')

type SetCall = { name: string; value: string; options: Record<string, unknown> }

/** Minimal stand-ins: cookies.ts only ever touches res.cookies.set / req.cookies.get. */
function fakeRes() {
  const calls: SetCall[] = []
  const res = {
    cookies: {
      set: (name: string, value: string, options: Record<string, unknown> = {}) => {
        calls.push({ name, value, options })
      },
    },
  }
  return { res: res as unknown as NextResponse, calls }
}

function fakeReq(cookies: Record<string, string>) {
  return {
    cookies: {
      get: (name: string) => (name in cookies ? { name, value: cookies[name] } : undefined),
    },
  } as unknown as NextRequest
}

const tokens: StoredTokens = {
  accessToken: 'access-token-value',
  refreshToken: 'refresh-token-value',
  scope: 'read:vat write:vat',
  expiresAt: 1_800_000_000_000,
  userId: 'user-1',
}

beforeEach(() => {
  vi.stubEnv('HMRC_COOKIE_SECRET', TEST_KEY)
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('the HMRC token cookie is not reachable from JavaScript', () => {
  it('sets httpOnly, sameSite=lax and a site-wide path', () => {
    const { res, calls } = fakeRes()
    setTokensCookie(res, tokens)

    expect(calls).toHaveLength(1)
    const { name, options } = calls[0]!
    expect(name).toBe(TOKENS_COOKIE)
    expect(options.httpOnly).toBe(true)
    expect(options.sameSite).toBe('lax')
    expect(options.path).toBe('/')
  })

  it('does not write the tokens in the clear', () => {
    const { res, calls } = fakeRes()
    setTokensCookie(res, tokens)

    const written = calls[0]!.value
    expect(written).not.toContain(tokens.accessToken)
    expect(written).not.toContain(tokens.refreshToken)
    expect(written).not.toContain('accessToken')
  })

  it('marks the cookie Secure in production and not in local dev', () => {
    // SECURE is read at module load, so each case needs a fresh import.
    vi.resetModules()
    vi.stubEnv('NODE_ENV', 'production')
    return import('@/lib/hmrc/cookies').then(async (prod) => {
      const a = fakeRes()
      prod.setTokensCookie(a.res, tokens)
      expect(a.calls[0]!.options.secure).toBe(true)

      vi.resetModules()
      vi.stubEnv('NODE_ENV', 'development')
      const dev = await import('@/lib/hmrc/cookies')
      const b = fakeRes()
      dev.setTokensCookie(b.res, tokens)
      // Secure cookies are dropped over plain http, which would break localhost.
      expect(b.calls[0]!.options.secure).toBe(false)
    })
  })

  it('expires the cookie immediately when cleared, keeping the same attributes', () => {
    const { res, calls } = fakeRes()
    clearTokensCookie(res)

    const { value, options } = calls[0]!
    expect(value).toBe('')
    expect(options.maxAge).toBe(0)
    expect(options.httpOnly).toBe(true)
    expect(options.path).toBe('/')
  })
})

describe('reading the cookie back', () => {
  it('round-trips a token set through encryption', () => {
    const { res, calls } = fakeRes()
    setTokensCookie(res, tokens)

    const read = readTokensCookie(fakeReq({ [TOKENS_COOKIE]: calls[0]!.value }))
    expect(read).toEqual(tokens)
  })

  it('returns null when the cookie is absent', () => {
    expect(readTokensCookie(fakeReq({}))).toBeNull()
  })

  it('returns null for a tampered value rather than throwing', () => {
    const { res, calls } = fakeRes()
    setTokensCookie(res, tokens)
    const good = calls[0]!.value

    // Flip a character in the ciphertext segment. AES-GCM's auth tag must catch
    // it — a caller that got a partial object back would be worse than nothing.
    const parts = good.split('.')
    const ct = parts[2]!
    const flipped = (ct[0] === 'A' ? 'B' : 'A') + ct.slice(1)
    expect(
      readTokensCookie(fakeReq({ [TOKENS_COOKIE]: `${parts[0]}.${parts[1]}.${flipped}` })),
    ).toBeNull()
  })

  it('returns null for junk that is not an envelope at all', () => {
    for (const bad of ['', 'not-a-cookie', 'a.b', 'a.b.c.d']) {
      expect(readTokensCookie(fakeReq({ [TOKENS_COOKIE]: bad })), bad).toBeNull()
    }
  })

  it('rejects a payload that decrypts but is missing a field', () => {
    // Encrypted by us, so it authenticates — but it is not a usable token set,
    // and handing back a half-populated object would surface as a confusing
    // failure much later, at the HMRC call.
    vi.resetModules()
    return import('@/lib/hmrc/crypto').then(async ({ encrypt }) => {
      const { readTokensCookie: read, TOKENS_COOKIE: NAME } = await import('@/lib/hmrc/cookies')
      const partial = encrypt(JSON.stringify({ accessToken: 'a', scope: '', expiresAt: 1 }))
      expect(read(fakeReq({ [NAME]: partial }))).toBeNull()

      const wrongType = encrypt(
        JSON.stringify({ accessToken: 'a', refreshToken: 'r', scope: '', expiresAt: 'soon' }),
      )
      expect(read(fakeReq({ [NAME]: wrongType }))).toBeNull()

      // A pre-binding cookie: valid tokens but no Supabase userId. It cannot
      // be attributed to an account, so it must read as "never connected" and
      // force a reconnect rather than let anyone file with it.
      const unbound = encrypt(
        JSON.stringify({ accessToken: 'a', refreshToken: 'r', scope: '', expiresAt: 1 }),
      )
      expect(read(fakeReq({ [NAME]: unbound }))).toBeNull()
    })
  })
})

describe('the OAuth state cookie', () => {
  it('is httpOnly and expires with the authorization code', () => {
    const { res, calls } = fakeRes()
    setStateCookie(res, 'random-state-value')

    const { options } = calls[0]!
    expect(options.httpOnly).toBe(true)
    expect(options.sameSite).toBe('lax')
    // HMRC authorization codes live 10 minutes; the CSRF state must not outlast
    // the flow it protects.
    expect(options.maxAge).toBe(600)
  })

  it('reads back what was set, and null when absent', () => {
    expect(readStateCookie(fakeReq({ [STATE_COOKIE]: 'abc' }))).toBe('abc')
    expect(readStateCookie(fakeReq({}))).toBeNull()
  })
})
