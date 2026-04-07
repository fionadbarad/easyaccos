import { NextRequest, NextResponse } from 'next/server'
import { kittaxAnswer } from '@/lib/kittax-brain'

type AIRequest = {
  message?: string
  query?:   string
}

export async function POST(request: NextRequest) {
  let body: AIRequest
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const query = (body.query || body.message || '').trim()
  if (!query) {
    return NextResponse.json({ error: 'Query or message is required' }, { status: 400 })
  }

  const answer = kittaxAnswer(query)
  return NextResponse.json({ answer })
}
