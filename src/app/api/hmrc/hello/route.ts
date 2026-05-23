import { NextResponse } from 'next/server'

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
  stage: 'env' | 'token' | 'hello'
  message?: string
  status?: number
  body?: unknown
}

export async function GET(): Promise<NextResponse<SuccessBody | FailureBody>> {
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
  let tokenJson: { access_token?: string; scope?: string; expires_in?: number; error?: string; error_description?: string }
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
    console.error('[hmrc/hello] token network error:', err instanceof Error ? err.message : err)
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
    console.error('[hmrc/hello] hello network error:', err instanceof Error ? err.message : err)
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
