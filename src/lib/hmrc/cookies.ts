import type { NextRequest, NextResponse } from 'next/server'
import { decrypt, encrypt } from './crypto'

export const TOKENS_COOKIE = 'hmrc_tokens'
export const STATE_COOKIE = 'hmrc_oauth_state'

export type StoredTokens = {
  accessToken: string
  refreshToken: string
  scope: string
  expiresAt: number // ms epoch when access token expires
  userId: string // Supabase user the connection belongs to
}

const SECURE = process.env.NODE_ENV === 'production'

export function setTokensCookie(res: NextResponse, tokens: StoredTokens): void {
  res.cookies.set(TOKENS_COOKIE, encrypt(JSON.stringify(tokens)), {
    httpOnly: true,
    secure: SECURE,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  })
}

export function clearTokensCookie(res: NextResponse): void {
  res.cookies.set(TOKENS_COOKIE, '', {
    httpOnly: true,
    secure: SECURE,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  })
}

export function readTokensCookie(req: NextRequest): StoredTokens | null {
  const raw = req.cookies.get(TOKENS_COOKIE)?.value
  if (!raw) return null
  const dec = decrypt(raw)
  if (!dec) return null
  try {
    const parsed = JSON.parse(dec) as Partial<StoredTokens>
    if (
      typeof parsed.accessToken !== 'string' ||
      typeof parsed.refreshToken !== 'string' ||
      typeof parsed.scope !== 'string' ||
      typeof parsed.expiresAt !== 'number' ||
      typeof parsed.userId !== 'string'
    ) {
      return null
    }
    return parsed as StoredTokens
  } catch {
    return null
  }
}

/**
 * Move any cookies written to `carrier` onto `res`, and return `res`.
 *
 * A route handler cannot know at auth time which response it will eventually
 * send, so `getValidAccessToken` writes the rotated tokens to a throwaway
 * carrier response. Every exit path then has to carry them across — including
 * the failure paths. HMRC's refresh tokens are single-use: once a refresh has
 * been redeemed the old token is dead, so dropping the new one because the
 * submission itself was rejected leaves the browser holding a spent token and
 * forces the user to reconnect to HMRC before they can fix and resend the
 * return — exactly when they least expect it.
 */
export function carryCookies<T>(carrier: NextResponse, res: NextResponse<T>): NextResponse<T> {
  for (const cookie of carrier.cookies.getAll()) {
    res.cookies.set(cookie)
  }
  return res
}

export function setStateCookie(res: NextResponse, state: string): void {
  // 10 min — same as HMRC authorization code lifetime
  res.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: SECURE,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 10,
  })
}

export function clearStateCookie(res: NextResponse): void {
  res.cookies.set(STATE_COOKIE, '', {
    httpOnly: true,
    secure: SECURE,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  })
}

export function readStateCookie(req: NextRequest): string | null {
  return req.cookies.get(STATE_COOKIE)?.value ?? null
}
