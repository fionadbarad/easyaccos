import { timingSafeEqual } from 'node:crypto'
import { type NextRequest, NextResponse } from 'next/server'
import { STATE_COOKIE, TOKENS_COOKIE, readStateCookie, type StoredTokens } from '@/lib/hmrc/cookies'
import { encrypt } from '@/lib/hmrc/crypto'
import { exchangeCodeForTokens, readHmrcEnv } from '@/lib/hmrc/oauth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// IMPORTANT: cookies are attached via explicit Set-Cookie header strings
// rather than `res.cookies.set(...)`. In Next.js 16 + Vercel, the cookies
// API silently fails to serialise Set-Cookie onto `NextResponse.redirect()`
// responses — cookies set via that path never reach the browser. We hit this
// bug at the missing_params diagnostic step (Phase 2 in prod).

const SECURE_SUFFIX = process.env.NODE_ENV === 'production' ? '; Secure' : ''

function stateClearCookie(): string {
  return `${STATE_COOKIE}=; Path=/; HttpOnly${SECURE_SUFFIX}; SameSite=Lax; Max-Age=0`
}

function tokensSetCookie(tokens: StoredTokens): string {
  const value = encrypt(JSON.stringify(tokens))
  const maxAge = 60 * 60 * 24 * 30
  return `${TOKENS_COOKIE}=${value}; Path=/; HttpOnly${SECURE_SUFFIX}; SameSite=Lax; Max-Age=${maxAge}`
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)
  if (ab.length !== bb.length) return false
  return timingSafeEqual(ab, bb)
}

function redirectDashboard(
  req: NextRequest,
  params: Record<string, string>,
  extraSetCookies: string[] = [],
): NextResponse {
  const url = new URL('/dashboard/hmrc', req.nextUrl.origin)
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v)
  }
  const headers = new Headers({
    Location: url.toString(),
    'Cache-Control': 'private, no-store',
  })
  // Headers#append allows multiple Set-Cookie values
  for (const cookie of extraSetCookies) {
    headers.append('Set-Cookie', cookie)
  }
  return new NextResponse(null, { status: 302, headers })
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const env = readHmrcEnv()
  if ('error' in env) {
    return redirectDashboard(req, { hmrc_error: 'env', detail: env.error })
  }

  const sp = req.nextUrl.searchParams
  const errParam = sp.get('error')
  if (errParam) {
    const desc = sp.get('error_description') ?? errParam
    return redirectDashboard(req, { hmrc_error: errParam, detail: desc }, [stateClearCookie()])
  }

  const code = sp.get('code')
  const state = sp.get('state')
  const storedState = readStateCookie(req)
  if (!code || !state || !storedState) {
    const cookieNames = req.cookies.getAll().map((c) => c.name).join(',') || '(none)'
    const queryKeys = Array.from(sp.keys()).join(',') || '(none)'
    const host = req.headers.get('host') ?? '(unknown)'
    const diag = `code=${code ? 'present' : 'MISSING'} state=${state ? 'present' : 'MISSING'} cookie=${storedState ? 'present' : 'MISSING'} | host=${host} | cookies=[${cookieNames}] | query=[${queryKeys}]`
    console.error('[hmrc/callback] missing_params', diag)
    return redirectDashboard(
      req,
      { hmrc_error: 'missing_params', detail: diag },
      [stateClearCookie()],
    )
  }

  if (!safeEqual(state, storedState)) {
    return redirectDashboard(
      req,
      { hmrc_error: 'state_mismatch', detail: 'CSRF state did not match. Restart connect flow.' },
      [stateClearCookie()],
    )
  }

  const result = await exchangeCodeForTokens(env, code)
  if (!result.ok) {
    return redirectDashboard(
      req,
      { hmrc_error: 'token_exchange_failed', detail: result.message },
      [stateClearCookie()],
    )
  }

  return redirectDashboard(req, { hmrc_connected: '1' }, [
    stateClearCookie(),
    tokensSetCookie(result.tokens),
  ])
}
