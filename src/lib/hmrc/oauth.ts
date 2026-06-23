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

export type TokenExchangeResult =
  | { ok: true; tokens: StoredTokens }
  | { ok: false; status: number; body: unknown; message: string }

function tokensFromResponse(json: TokenResponse): StoredTokens | null {
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
): Promise<AccessTokenResult> {
  const stored = readTokensCookie(req)
  if (!stored) {
    return { ok: false, status: 401, message: 'Not connected to HMRC', needsReauth: true }
  }
  if (stored.expiresAt - Date.now() > REFRESH_SKEW_MS) {
    return { ok: true, accessToken: stored.accessToken, tokens: stored, refreshed: false }
  }
  const refreshed = await refreshTokens(env, stored.refreshToken)
  if (!refreshed.ok) {
    return {
      ok: false,
      status: refreshed.status,
      message: refreshed.message,
      needsReauth: refreshed.status === 400 || refreshed.status === 401,
    }
  }
  setTokensCookie(res, refreshed.tokens)
  return { ok: true, accessToken: refreshed.tokens.accessToken, tokens: refreshed.tokens, refreshed: true }
}
