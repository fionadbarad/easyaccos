import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

const CATEGORIES = [
  'Office & Equipment',
  'Travel & Transport',
  'Software & Subscriptions',
  'Marketing & Advertising',
  'Professional Services',
  'Training & Education',
  'Utilities',
  'Meals (business)',
  'Other',
] as const

type Category = typeof CATEGORIES[number]

const KEYWORDS: Array<[RegExp, Category]> = [
  [/\b(uber|train|rail|taxi|tfl|bus|parking|fuel|petrol|diesel|mileage|flight|airline|hotel)\b/i, 'Travel & Transport'],
  [/\b(adobe|figma|github|aws|vercel|notion|slack|zoom|microsoft|google workspace|subscription|saas|netflix|spotify)\b/i, 'Software & Subscriptions'],
  [/\b(facebook ads|google ads|linkedin|marketing|advert|campaign|seo|ppc)\b/i, 'Marketing & Advertising'],
  [/\b(accountant|solicitor|lawyer|consultant|legal|advisor|bookkeep)\b/i, 'Professional Services'],
  [/\b(course|training|udemy|coursera|book|ebook|conference|workshop)\b/i, 'Training & Education'],
  [/\b(electric|gas|water|broadband|internet|phone|mobile|ee|bt|vodafone|o2|three)\b/i, 'Utilities'],
  [/\b(lunch|dinner|meal|restaurant|cafe|coffee|starbucks|pret|greggs|client lunch)\b/i, 'Meals (business)'],
  [/\b(laptop|monitor|keyboard|mouse|desk|chair|printer|paper|pen|stationery|office)\b/i, 'Office & Equipment'],
]

function heuristic(description: string): Category {
  for (const [pattern, cat] of KEYWORDS) {
    if (pattern.test(description)) return cat
  }
  return 'Other'
}

let _genAI: GoogleGenerativeAI | null = null
function getGenAI(apiKey: string): GoogleGenerativeAI {
  if (!_genAI) _genAI = new GoogleGenerativeAI(apiKey)
  return _genAI
}

const SYSTEM = `You are a UK sole-trader expense categoriser. Respond with exactly one category from this list, and nothing else:
${CATEGORIES.join('\n')}

If unsure, answer "Other".`

export async function POST(request: NextRequest) {
  let body: { description?: string; amount?: number }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const description = (body.description ?? '').trim()
  if (!description) {
    return NextResponse.json({ error: 'description is required' }, { status: 400 })
  }
  if (description.length > 500) {
    return NextResponse.json({ error: 'description too long (max 500 chars)' }, { status: 400 })
  }
  const amt = typeof body.amount === 'number' && Number.isFinite(body.amount) && body.amount >= 0 ? body.amount : undefined

  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY
  if (!apiKey) {
    return NextResponse.json({ category: heuristic(description), source: 'heuristic' })
  }

  try {
    const model = getGenAI(apiKey).getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction: SYSTEM,
    })
    const prompt = `Categorise this expense: "${description}"${
      amt !== undefined ? ` (£${amt.toFixed(2)})` : ''
    }`
    const result = await model.generateContent(prompt)
    const text = (result.response.text() || '').trim()
    const match = CATEGORIES.find((c) => text.toLowerCase().includes(c.toLowerCase())) ?? heuristic(description)
    return NextResponse.json({ category: match, source: 'ai' })
  } catch (err) {
    console.error('[ai/categorise] Gemini error:', err instanceof Error ? err.message : err)
    return NextResponse.json({ category: heuristic(description), source: 'heuristic-fallback' })
  }
}
