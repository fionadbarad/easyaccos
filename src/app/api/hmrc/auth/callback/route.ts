import { timingSafeEqual } from 'node:crypto'
import { type NextRequest, NextResponse } from 'next/server'
import {
  clearStateCookie,
  readStateCookie,
  setTokensCookie,
} from '@/lib/hmrc/cookies'
import { exchangeCodeForTokens, readHmrcEnv } from '@/lib/hmrc/oauth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)
  if (ab.length !== bb.length) return false
  return timingSafeEqual(ab, bb)
}

function dashboardRedirect(req: NextRequest, params: Record<string, string>): NextResponse {
  const url = new URL('/dashboard/hmrc', req.nextUrl.origin)
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v)
  }
  return NextResponse.redirect(url.toString(), 302)
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const env = readHmrcEnv()
  if ('error' in env) {
    return dashboardRedirect(req, { hmrc_error: 'env', detail: env.error })
  }

  const sp = req.nextUrl.searchParams
  const errParam = sp.get('error')
  if (errParam) {
    const desc = sp.get('error_description') ?? errParam
    const res = dashboardRedirect(req, { hmrc_error: errParam, detail: desc })
    clearStateCookie(res)
    return res
  }

  const code = sp.get('code')
  const state = sp.get('state')
  const storedState = readStateCookie(req)
  if (!code || !state || !storedState) {
    // Diagnostic: surface what arrived so we can debug cookie/redirect issues.
    const cookieNames = req.cookies.getAll().map((c) => c.name).join(',') || '(none)'
    const queryKeys = Array.from(sp.keys()).join(',') || '(none)'
    const host = req.headers.get('host') ?? '(unknown)'
    const referer = req.headers.get('referer') ?? '(none)'
    const diag = `code=${code ? 'present' : 'MISSING'} state=${state ? 'present' : 'MISSING'} cookie=${storedState ? 'present' : 'MISSING'} | host=${host} | cookies=[${cookieNames}] | query=[${queryKeys}] | referer=${referer}`
    console.error('[hmrc/callback] missing_params', diag)
    const res = dashboardRedirect(req, {
      hmrc_error: 'missing_params',
      detail: diag,
    })
    clearStateCookie(res)
    return res
  }
  if (!safeEqual(state, storedState)) {
    const res = dashboardRedirect(req, {
      hmrc_error: 'state_mismatch',
      detail: 'CSRF state did not match. Restart connect flow.',
    })
    clearStateCookie(res)
    return res
  }

  const result = await exchangeCodeForTokens(env, code)
  if (!result.ok) {
    const res = dashboardRedirect(req, {
      hmrc_error: 'token_exchange_failed',
      detail: result.message,
    })
    clearStateCookie(res)
    return res
  }

  const res = dashboardRedirect(req, { hmrc_connected: '1' })
  clearStateCookie(res)
  setTokensCookie(res, result.tokens)
  return res
}
