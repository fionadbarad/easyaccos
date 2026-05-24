import { NextResponse } from 'next/server'
import { clearStateCookie, clearTokensCookie } from '@/lib/hmrc/cookies'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(): Promise<NextResponse> {
  const res = NextResponse.json({ ok: true })
  clearTokensCookie(res)
  clearStateCookie(res)
  return res
}
