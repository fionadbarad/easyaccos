import { NextResponse } from 'next/server'
import { STATE_COOKIE } from '@/lib/hmrc/cookies'
import { randomToken } from '@/lib/hmrc/crypto'
import { readHmrcEnv } from '@/lib/hmrc/oauth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// IMPORTANT: We construct the response with `new NextResponse(null, { status, headers })`
// and set Set-Cookie as an explicit header rather than calling
// `NextResponse.redirect(...).cookies.set(...)`. In Next.js 16 the latter
// does NOT serialise the Set-Cookie header onto the outgoing 302 response on
// Vercel — the cookie is set on the internal cookies object but stripped from
// the wire. Cache-Control: private, no-store also ensures Vercel's CDN does
// not cache the redirect (which would cause cookie leakage between users).
export async function GET(): Promise<NextResponse> {
  const env = readHmrcEnv()
  if ('error' in env) {
    return NextResponse.json({ ok: false, stage: 'env', message: env.error }, { status: 500 })
  }

  const state = randomToken(32)

  const url = new URL(`${env.loginBase}/oauth/authorize`)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('client_id', env.clientId)
  url.searchParams.set('scope', env.scopes)
  url.searchParams.set('redirect_uri', env.redirectUri)
  url.searchParams.set('state', state)

  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : ''
  // 30 min — wider than HMRC's 10-min authorization code lifetime so a slow
  // sandbox consent (SCA, password recovery, etc.) doesn't expire the state
  // cookie mid-flow and return missing_params after a successful consent.
  const cookie = `${STATE_COOKIE}=${state}; Path=/; HttpOnly${secure}; SameSite=Lax; Max-Age=1800`

  return new NextResponse(null, {
    status: 302,
    headers: {
      Location: url.toString(),
      'Set-Cookie': cookie,
      'Cache-Control': 'private, no-store',
    },
  })
}
