import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenAI } from '@google/genai'
import { CategoriseRequestSchema } from '@/app/api/ai/schemas'
import { reportError } from '@/lib/monitor'

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

type Category = (typeof CATEGORIES)[number]

const KEYWORDS: Array<[RegExp, Category]> = [
  [
    /\b(uber|train|rail|taxi|tfl|bus|parking|fuel|petrol|diesel|mileage|flight|airline|hotel)\b/i,
    'Travel & Transport',
  ],
  [
    /\b(adobe|figma|github|aws|vercel|notion|slack|zoom|microsoft|google workspace|subscription|saas|netflix|spotify)\b/i,
    'Software & Subscriptions',
  ],
  [
    /\b(facebook ads|google ads|linkedin|marketing|advert|campaign|seo|ppc)\b/i,
    'Marketing & Advertising',
  ],
  [/\b(accountant|solicitor|lawyer|consultant|legal|advisor|bookkeep)\b/i, 'Professional Services'],
  [/\b(course|training|udemy|coursera|book|ebook|conference|workshop)\b/i, 'Training & Education'],
  [
    /\b(electric|gas|water|broadband|internet|phone|mobile|ee|bt|vodafone|o2|three)\b/i,
    'Utilities',
  ],
  [
    /\b(lunch|dinner|meal|restaurant|cafe|coffee|starbucks|pret|greggs|client lunch)\b/i,
    'Meals (business)',
  ],
  [
    /\b(laptop|monitor|keyboard|mouse|desk|chair|printer|paper|pen|stationery|office)\b/i,
    'Office & Equipment',
  ],
]

function heuristic(description: string): Category {
  for (const [pattern, cat] of KEYWORDS) {
    if (pattern.test(description)) return cat
  }
  return 'Other'
}

const MODEL = 'gemini-2.5-flash'

let _ai: GoogleGenAI | null = null
function getAI(apiKey: string): GoogleGenAI {
  if (!_ai) _ai = new GoogleGenAI({ apiKey })
  return _ai
}

const SYSTEM = `You are a UK sole-trader expense categoriser. Respond with exactly one category from this list, and nothing else:
${CATEGORIES.join('\n')}

If unsure, answer "Other".`

export async function POST(request: NextRequest) {
  let raw: unknown
  try {
    raw = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = CategoriseRequestSchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid request' },
      { status: 400 },
    )
  }
  const { description, amount } = parsed.data

  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY
  if (!apiKey) {
    return NextResponse.json({ category: heuristic(description), source: 'heuristic' })
  }

  try {
    const prompt = `Categorise this expense: "${description}"${
      amount !== undefined ? ` (£${amount.toFixed(2)})` : ''
    }`
    const result = await getAI(apiKey).models.generateContent({
      model: MODEL,
      contents: prompt,
      config: { systemInstruction: SYSTEM },
    })
    const text = (result.text || '').trim()
    const match =
      CATEGORIES.find((c) => text.toLowerCase().includes(c.toLowerCase())) ?? heuristic(description)
    return NextResponse.json({ category: match, source: 'ai' })
  } catch (err) {
    reportError('api.ai.categorise', err)
    return NextResponse.json({ category: heuristic(description), source: 'heuristic-fallback' })
  }
}
