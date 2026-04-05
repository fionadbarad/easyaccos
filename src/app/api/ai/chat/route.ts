import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

const SYSTEM =
  'You are Kittax, an expert UK tax advisor in EasyAcco. ' +
  'Help freelancers, directors and employees legally minimise their UK tax for 2026/27. ' +
  'Suggest allowable expenses: Use of Home (6 pounds/week flat rate), SIPP pension, ' +
  'mileage (45p/mile), equipment, training, professional subscriptions, director salary+dividends. ' +
  'Mention the 60% effective tax trap (income 100k-125.14k) and how SIPP fixes it. ' +
  'Keep answers concise, practical and HMRC-accurate. ' +
  'Recommend professional advice for complex situations.'

export async function POST(request: NextRequest) {
  const apiKey =
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
    process.env.NEXT_PUBLIC_GEMINI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'AI service not configured' }, { status: 503 })
  }

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

  try {
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      systemInstruction: SYSTEM,
    })

    const result = await model.generateContent(query)
    const answer = result.response.text()

    return NextResponse.json({ answer })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unexpected server error'
    console.error('Kittax AI error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
