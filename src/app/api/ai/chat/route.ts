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

const OFFLINE_REPLIES: Record<string, string> = {
  expense: 'Common allowable expenses: Use of Home (6/wk flat rate), mileage (45p/mile), equipment, training, professional subs, pension contributions. Enter your expenses in the Tax Estimator to see your exact saving.',
  pension: 'SIPP pension contributions reduce your taxable profit pound-for-pound. If your income is 100k-125k you are in the 60% trap -- a SIPP contribution below 100k saves you 60p per pound contributed.',
  dividend: 'Directors: the first 500 in dividends is tax-free (2026/27). Above that, basic rate is 10.75% and higher rate 35.75%. Optimal strategy is a salary at the NI threshold (12,570) plus dividends.',
  mileage: 'You can claim 45p per business mile for the first 10,000 miles, then 25p/mile. Keep a mileage log with dates, destinations and business purpose.',
}

function offlineReply(query: string): string {
  const q = query.toLowerCase()
  if (q.includes('pension') || q.includes('sipp')) return OFFLINE_REPLIES.pension
  if (q.includes('dividend')) return OFFLINE_REPLIES.dividend
  if (q.includes('mileage') || q.includes('miles') || q.includes('car')) return OFFLINE_REPLIES.mileage
  if (q.includes('expense') || q.includes('claim') || q.includes('deduct')) return OFFLINE_REPLIES.expense
  return 'I am currently offline but the Tax Estimator is fully working. Enter your income and expenses there to get your exact 2026/27 breakdown. Common tip: pension contributions and allowable expenses reduce your taxable profit directly.'
}

export async function POST(request: NextRequest) {
  const apiKey =
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
    process.env.NEXT_PUBLIC_GEMINI_API_KEY

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

  // Graceful offline fallback -- no error shown to user
  if (!apiKey) {
    return NextResponse.json({ answer: offlineReply(query), offline: true })
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
    // Still graceful -- return offline answer rather than an error
    return NextResponse.json({ answer: offlineReply(query), offline: true })
  }
}
