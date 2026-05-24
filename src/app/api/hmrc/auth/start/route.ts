import { NextResponse } from 'next/server'
import { setStateCookie } from '@/lib/hmrc/cookies'
import { randomToken } from '@/lib/hmrc/crypto'
import { readHmrcEnv } from '@/lib/hmrc/oauth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

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

  const res = NextResponse.redirect(url.toString(), 302)
  setStateCookie(res, state)
  return res
}
