import { NextRequest, NextResponse } from 'next/server'
import { kittaxAnswer } from '@/lib/kittax-brain'

export async function POST(request: NextRequest) {
  let body: { message?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const query = (body.message ?? '').trim()
  if (!query) {
    return NextResponse.json({ error: 'message is required' }, { status: 400 })
  }

  const answer = kittaxAnswer(query)
  return NextResponse.json({ answer })
}
