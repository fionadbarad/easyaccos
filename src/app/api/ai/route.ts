import { NextRequest, NextResponse } from 'next/server'

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY

type GeminiRequest = {
  message?: string
  query?: string
  history?: unknown
}

type GeminiResponse = {
  answer: string
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as GeminiRequest
    const query = (body.query || body.message || '').trim()
    if (!query) {
      return NextResponse.json({ error: 'Query or message is required' }, { status: 400 })
    }

    const res = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${GOOGLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini',
        input: query,
      }),
    })

    if (!res.ok) {
      const text = await res.text()
      return NextResponse.json({ error: 'AI request failed', details: text }, { status: 502 })
    }

    const payload = await res.json()
    const answer =
      payload?.output?.[0]?.content?.find((c: any) => c.type === 'output_text')?.text ||
      payload?.output?.[0]?.content?.map((c: any) => c.text || '').join(' ') ||
      ''

    const aiResponse: GeminiResponse = {
      answer: answer.trim() || 'I could not generate a response. Try again with more detail.',
    }

    return NextResponse.json(aiResponse)
  } catch (error: any) {
    console.error('Gemini route error:', error)
    return NextResponse.json({ error: error?.message ?? 'Unexpected server error' }, { status: 500 })
  }
}
