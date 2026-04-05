import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

type ChatPart = { text: string }
type ChatMessage = { role: 'user' | 'model'; parts: ChatPart[] }

type AIRequest = {
  message?: string
  query?: string
  history?: ChatMessage[]
}

export async function POST(request: NextRequest) {
  const apiKey =
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
    process.env.NEXT_PUBLIC_GEMINI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'AI service not configured' }, { status: 503 })
  }

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

  try {
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      systemInstruction:
        'You are a helpful UK tax assistant for self-employed freelancers. ' +
        'Provide accurate, concise information about HMRC rules, Self Assessment, ' +
        'National Insurance, allowable expenses, and tax deadlines for 2026/27. ' +
        'Always clarify when professional advice is recommended.',
    })

    const chat = model.startChat({ history: body.history ?? [] })
    const result = await chat.sendMessage(query)
    const answer = result.response.text()

    return NextResponse.json({ answer })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unexpected server error'
    console.error('AI route error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
