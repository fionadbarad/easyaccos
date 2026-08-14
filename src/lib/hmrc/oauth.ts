import type { NextRequest, NextResponse } from 'next/server'
import { readTokensCookie, setTokensCookie, type StoredTokens } from './cookies'

export type HmrcEnv = {
  clientId: string
  clientSecret: string
  apiBase: string
  loginBase: string
  redirectUri: string
  scopes: string
}

export function readHmrcEnv(): HmrcEnv | { error: string } {
  const clientId = process.env.HMRC_CLIENT_ID
  const clientSecret = process.env.HMRC_CLIENT_SECRET
  const apiBase = process.env.HMRC_API_BASE
  const loginBase = process.env.HMRC_LOGIN_BASE
  const redirectUri = process.env.HMRC_REDIRECT_URI
  const scopes = process.env.HMRC_SCOPES
  const missing: string[] = []
  if (!clientId) missing.push('HMRC_CLIENT_ID')
  if (!clientSecret) missing.push('HMRC_CLIENT_SECRET')
  if (!apiBase) missing.push('HMRC_API_BASE')
  if (!loginBase) missing.push('HMRC_LOGIN_BASE')
  if (!redirectUri) missing.push('HMRC_REDIRECT_URI')
  if (!scopes) missing.push('HMRC_SCOPES')
  if (missing.length > 0) {
    return { error: `Missing env vars: ${missing.join(', ')}` }
  }
  return {
    clientId: clientId!,
    clientSecret: clientSecret!,
    apiBase: apiBase!,
    loginBase: loginBase!,
    redirectUri: redirectUri!,
    scopes: scopes!,
  }
}

type TokenResponse = {
  access_token?: string
  refresh_token?: string
  scope?: string
  expires_in?: number
  token_type?: string
  error?: string
  error_description?: string
}

// What HMRC's token endpoint yields. The Supabase `userId` binding is ours,
// not HMRC's — it is attached where the cookie is written, never here.
export type OAuthTokens = Omit<StoredTokens, 'userId'>

export type TokenExchangeResult =
  { ok: true; tokens: OAuthTokens } | { ok: false; status: number; body: unknown; message: string }

function tokensFromResponse(json: TokenResponse): OAuthTokens | null {
  if (!json.access_token || !json.refresh_token || typeof json.expires_in !== 'number') {
    return null
  }
  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token,
    scope: json.scope ?? '',
    expiresAt: Date.now() + json.expires_in * 1000,
  }
}

export async function exchangeCodeForTokens(
  env: HmrcEnv,
  code: string,
): Promise<TokenExchangeResult> {
  const res = await fetch(`${env.apiBase}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: env.clientId,
      client_secret: env.clientSecret,
      grant_type: 'authorization_code',
      redirect_uri: env.redirectUri,
      code,
    }),
    cache: 'no-store',
  })
  const json = (await res.json()) as TokenResponse
  if (!res.ok) {
    return {
      ok: false,
      status: res.status,
      body: json,
      message: json.error_description ?? json.error ?? `HMRC returned ${res.status}`,
    }
  }
  const tokens = tokensFromResponse(json)
  if (!tokens) {
    return {
      ok: false,
      status: 502,
      body: json,
      message: 'HMRC token response missing access_token / refresh_token / expires_in',
    }
  }
  return { ok: true, tokens }
}

export async function refreshTokens(
  env: HmrcEnv,
  refreshToken: string,
): Promise<TokenExchangeResult> {
  const res = await fetch(`${env.apiBase}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: env.clientId,
      client_secret: env.clientSecret,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
    cache: 'no-store',
  })
  const json = (await res.json()) as TokenResponse
  if (!res.ok) {
    return {
      ok: false,
      status: res.status,
      body: json,
      message: json.error_description ?? json.error ?? `HMRC refresh returned ${res.status}`,
    }
  }
  const tokens = tokensFromResponse(json)
  if (!tokens) {
    return {
      ok: false,
      status: 502,
      body: json,
      message: 'HMRC refresh response missing required fields',
    }
  }
  return { ok: true, tokens }
}

const REFRESH_SKEW_MS = 60 * 1000 // refresh 1 min before expiry

// ─── Single-flight refresh (SEC-15) ──────────────────────────────────────────
//
// HMRC refresh tokens are SINGLE USE: redeeming one immediately retires it.
// Two requests arriving near expiry — a page making parallel calls, two tabs,
// a retry landing on top of the original — both read the same token from the
// cookie and both POST it. One wins; the loser gets an `invalid_grant` for a
// token HMRC has already retired, and whichever response writes last decides
// what the browser ends up holding. The user is disconnected mid-submission.
//
// Two structures fix that within a process:
//
//   inFlight  collapses concurrent redemptions of the same token onto one
//             request, so the second caller awaits the first rather than
//             racing it.
//   recent    answers a caller that arrives just AFTER the redemption landed,
//             still holding the now-spent token from its own cookie read, with
//             the tokens that redemption produced — instead of sending a
//             retired token to HMRC and failing.
//
// SCOPE, honestly: this is per-instance. On a serverless deployment two
// requests handled by different instances still race, exactly as
// `rateLimit` is per-instance for the same reason. It removes the common case
// (one instance, concurrent handlers) and nothing more; a guarantee across
// instances needs the tokens in a shared store with a lock, which is a
// different design. See docs/AUDIT.md SEC-15.
const REFRESH_RESULT_TTL_MS = 30_000
const MAX_TRACKED_REFRESHES = 200

const inFlight = new Map<string, Promise<TokenExchangeResult>>()
const recent = new Map<string, { at: number; result: TokenExchangeResult }>()

function pruneRecent(now: number): void {
  for (const [k, v] of recent) {
    if (now - v.at > REFRESH_RESULT_TTL_MS) recent.delete(k)
  }
  // Hard bound as well as a TTL: these entries hold live tokens, so the map
  // must not be able to grow without limit under unusual traffic.
  if (recent.size > MAX_TRACKED_REFRESHES) {
    const excess = recent.size - MAX_TRACKED_REFRESHES
    let dropped = 0
    for (const k of recent.keys()) {
      if (dropped++ >= excess) break
      recent.delete(k)
    }
  }
}

/**
 * Redeem `refreshToken` at most once, however many callers ask concurrently.
 *
 * Only SUCCESSES are remembered. A failure may be transient (a network blip, a
 * 503) and replaying it would turn one bad moment into 30 seconds of refusing
 * to try again; a failed attempt also does not retire the token, so there is
 * nothing to protect a later caller from.
 */
export async function refreshTokensOnce(
  env: HmrcEnv,
  refreshToken: string,
  now: number = Date.now(),
): Promise<TokenExchangeResult> {
  pruneRecent(now)

  const cached = recent.get(refreshToken)
  if (cached && now - cached.at <= REFRESH_RESULT_TTL_MS) return cached.result

  const pending = inFlight.get(refreshToken)
  if (pending) return pending

  const attempt = (async () => {
    try {
      const result = await refreshTokens(env, refreshToken)
      // Stamped with the injected `now`, NOT Date.now(): mixing the two makes
      // the age comparison meaningless under a test clock (and the entry
      // effectively immortal), and a refresh completes well inside the TTL, so
      // call time is the right reading either way.
      if (result.ok) recent.set(refreshToken, { at: now, result })
      return result
    } finally {
      inFlight.delete(refreshToken)
    }
  })()

  inFlight.set(refreshToken, attempt)
  return attempt
}

/** Test-only: drop single-flight state so cases cannot leak into each other. */
export function __resetRefreshStateForTests(): void {
  inFlight.clear()
  recent.clear()
}

export type AccessTokenResult =
  | { ok: true; accessToken: string; tokens: StoredTokens; refreshed: boolean }
  | { ok: false; status: number; message: string; needsReauth?: boolean }

// Returns a valid access token, refreshing transparently if the current one
// is within 1 min of expiry. If refresh succeeds, the new tokens are written
// to the response cookie so the caller doesn't need to handle it.
export async function getValidAccessToken(
  env: HmrcEnv,
  req: NextRequest,
  res: NextResponse,
  expectedUserId: string,
): Promise<AccessTokenResult> {
  const stored = readTokensCookie(req)
  if (!stored) {
    return { ok: false, status: 401, message: 'Not connected to HMRC', needsReauth: true }
  }
  // The cookie is bound to the Supabase account that ran the connect flow.
  // A different account on the same browser must never file with these tokens.
  if (stored.userId !== expectedUserId) {
    return {
      ok: false,
      status: 401,
      message: 'This HMRC connection belongs to a different easyacco account. Please reconnect.',
      needsReauth: true,
    }
  }
  if (stored.expiresAt - Date.now() > REFRESH_SKEW_MS) {
    return { ok: true, accessToken: stored.accessToken, tokens: stored, refreshed: false }
  }
  // refreshTokensOnce, not refreshTokens: concurrent handlers holding the same
  // cookie must not each redeem the same single-use token (SEC-15).
  const refreshed = await refreshTokensOnce(env, stored.refreshToken)
  if (!refreshed.ok) {
    return {
      ok: false,
      status: refreshed.status,
      message: refreshed.message,
      needsReauth: refreshed.status === 400 || refreshed.status === 401,
    }
  }
  const rotated: StoredTokens = { ...refreshed.tokens, userId: stored.userId }
  setTokensCookie(res, rotated)
  return {
    ok: true,
    accessToken: rotated.accessToken,
    tokens: rotated,
    refreshed: true,
  }
}
