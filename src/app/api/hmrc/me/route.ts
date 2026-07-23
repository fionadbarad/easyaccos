import { type NextRequest, NextResponse } from 'next/server'
import { getValidAccessToken, readHmrcEnv } from '@/lib/hmrc/oauth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// User-restricted probe: calls HMRC's /hello/user (scope `hello`) using the
// access token stored in the user's encrypted cookie. Proves the full
// authorization_code flow + auto-refresh path end-to-end.

type Ok = {
  ok: true
  refreshed: boolean
  scope: string
  expiresAt: number
  helloStatus: number
  helloBody: unknown
}

type Fail = {
  ok: false
  stage: 'env' | 'auth' | 'hello'
  message: string
  status?: number
  body?: unknown
  needsReauth?: boolean
}

export async function GET(req: NextRequest): Promise<NextResponse<Ok | Fail>> {
  const env = readHmrcEnv()
  if ('error' in env) {
    return NextResponse.json<Fail>({ ok: false, stage: 'env', message: env.error }, { status: 500 })
  }

  // Build a placeholder response we'll mutate (cookie writes happen via res)
  const res = NextResponse.json<Ok | Fail>(
    { ok: false, stage: 'auth', message: 'unreachable' },
    { status: 500 },
  )

  const auth = await getValidAccessToken(env, req, res)
  if (!auth.ok) {
    const body: Fail = {
      ok: false,
      stage: 'auth',
      message: auth.message,
      needsReauth: auth.needsReauth,
    }
    return NextResponse.json<Fail>(body, { status: auth.status })
  }

  let helloRes: Response
  let helloRaw: string
  try {
    helloRes = await fetch(`${env.apiBase}/hello/user`, {
      headers: {
        Accept: 'application/vnd.hmrc.1.0+json',
        Authorization: `Bearer ${auth.accessToken}`,
      },
      cache: 'no-store',
    })
    helloRaw = await helloRes.text()
  } catch (err) {
    console.error('[hmrc/me] network error:', err instanceof Error ? err.message : err)
    return NextResponse.json<Fail>(
      { ok: false, stage: 'hello', message: 'Network error calling /hello/user' },
      { status: 502 },
    )
  }

  let helloBody: unknown = helloRaw
  try {
    helloBody = JSON.parse(helloRaw)
  } catch {
    // leave as raw
  }

  if (!helloRes.ok) {
    return NextResponse.json<Fail>(
      {
        ok: false,
        stage: 'hello',
        status: helloRes.status,
        body: helloBody,
        message: `HMRC returned ${helloRes.status}`,
      },
      { status: 502 },
    )
  }

  const ok: Ok = {
    ok: true,
    refreshed: auth.refreshed,
    scope: auth.tokens.scope,
    expiresAt: auth.tokens.expiresAt,
    helloStatus: helloRes.status,
    helloBody,
  }
  // Preserve any Set-Cookie headers written by getValidAccessToken's refresh
  const finalRes = NextResponse.json<Ok>(ok)
  for (const cookie of res.cookies.getAll()) {
    finalRes.cookies.set(cookie)
  }
  return finalRes
}
