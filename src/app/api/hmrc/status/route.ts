import { type NextRequest, NextResponse } from 'next/server'
import { getCachedUser } from '@/lib/auth-shared'
import { readTokensCookie } from '@/lib/hmrc/cookies'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type StatusBody =
  { connected: false } | { connected: true; scope: string; expiresAt: number; expiresInMs: number }

export async function GET(req: NextRequest): Promise<NextResponse<StatusBody>> {
  const tokens = readTokensCookie(req)
  if (!tokens) {
    return NextResponse.json<StatusBody>({ connected: false })
  }
  // A connection bound to a different Supabase account (or lingering after
  // sign-out) must not show as connected — it cannot be used to file anyway.
  const user = await getCachedUser()
  if (!user || tokens.userId !== user.id) {
    return NextResponse.json<StatusBody>({ connected: false })
  }
  return NextResponse.json<StatusBody>({
    connected: true,
    scope: tokens.scope,
    expiresAt: tokens.expiresAt,
    expiresInMs: tokens.expiresAt - Date.now(),
  })
}
