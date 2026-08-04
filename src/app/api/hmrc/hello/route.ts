import { NextResponse } from 'next/server'
import { reportError } from '@/lib/monitor'
import { rateLimit } from '@/lib/rate-limit'
import { createClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type SuccessBody = {
  ok: true
  tokenStatus: number
  scope: string
  expiresIn: number
  helloStatus: number
  helloBody: unknown
}

type FailureBody = {
  ok: false
  stage: 'auth' | 'env' | 'token' | 'hello'
  message?: string
  status?: number
  body?: unknown
}

export async function GET(): Promise<NextResponse<SuccessBody | FailureBody>> {
  // This route is a diagnostic, but not a harmless one: every call spends a
  // client_credentials grant against our HMRC application's own credentials and
  // then makes a second call to HMRC. Ungated, an anonymous caller could sit on
  // it and drain the application's rate allowance — and learn from the `env`
  // branch below whether our HMRC credentials are configured at all.
  //
  // The only caller is the HMRC page inside /dashboard, which is already behind
  // a session, so requiring one here costs nothing. Auth runs BEFORE the env
  // check so a signed-out caller learns nothing about our configuration, and
  // before any fetch so it costs nothing to refuse. getUser() validates against
  // Supabase's auth server rather than trusting the cookie (docs/AUDIT.md SEC-8).
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json<FailureBody>(
      { ok: false, stage: 'auth', message: 'You must be signed in to run this check.' },
      { status: 401 },
    )
  }

  // 10/min per user. This is a button a human clicks, so a real user never
  // reaches it; a script in a loop does immediately (docs/AUDIT.md SEC-6).
  const limit = rateLimit(`hmrc:hello:${user.id}`, 10, 60_000)
  if (!limit.ok) {
    return NextResponse.json<FailureBody>(
      { ok: false, stage: 'auth', message: 'Too many requests. Please slow down.' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSec) } },
    )
  }

  const id = process.env.HMRC_CLIENT_ID
  const secret = process.env.HMRC_CLIENT_SECRET
  const base = process.env.HMRC_API_BASE

  if (!id || !secret || !base) {
    return NextResponse.json<FailureBody>(
      {
        ok: false,
        stage: 'env',
        message:
          'Missing one of HMRC_CLIENT_ID, HMRC_CLIENT_SECRET, HMRC_API_BASE in server environment',
      },
      { status: 500 },
    )
  }

  let tokenRes: Response
  let tokenJson: {
    access_token?: string
    scope?: string
    expires_in?: number
    error?: string
    error_description?: string
  }
  try {
    tokenRes = await fetch(`${base}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: id,
        client_secret: secret,
        grant_type: 'client_credentials',
        scope: 'hello',
      }),
      cache: 'no-store',
    })
    tokenJson = await tokenRes.json()
  } catch (err) {
    reportError('hmrc.hello.token', err)
    return NextResponse.json<FailureBody>(
      { ok: false, stage: 'token', message: 'Network error reaching HMRC OAuth endpoint' },
      { status: 502 },
    )
  }

  if (!tokenRes.ok || !tokenJson.access_token) {
    return NextResponse.json<FailureBody>(
      { ok: false, stage: 'token', status: tokenRes.status, body: tokenJson },
      { status: 502 },
    )
  }

  let helloRes: Response
  let helloRaw: string
  try {
    helloRes = await fetch(`${base}/hello/application`, {
      headers: {
        Accept: 'application/vnd.hmrc.1.0+json',
        Authorization: `Bearer ${tokenJson.access_token}`,
      },
      cache: 'no-store',
    })
    helloRaw = await helloRes.text()
  } catch (err) {
    reportError('hmrc.hello.request', err)
    return NextResponse.json<FailureBody>(
      { ok: false, stage: 'hello', message: 'Network error reaching HMRC hello endpoint' },
      { status: 502 },
    )
  }

  let helloBody: unknown = helloRaw
  try {
    helloBody = JSON.parse(helloRaw)
  } catch {
    // leave as raw string
  }

  if (!helloRes.ok) {
    return NextResponse.json<FailureBody>(
      { ok: false, stage: 'hello', status: helloRes.status, body: helloBody },
      { status: 502 },
    )
  }

  return NextResponse.json<SuccessBody>({
    ok: true,
    tokenStatus: tokenRes.status,
    scope: tokenJson.scope ?? '',
    expiresIn: tokenJson.expires_in ?? 0,
    helloStatus: helloRes.status,
    helloBody,
  })
}
