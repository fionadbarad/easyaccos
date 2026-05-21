import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { buildContextPrompt } from '@/lib/kittax/context'
import type { KittaxContext } from '@/lib/kittax/types'
import { fmtGBP, pct1 } from '@/lib/formatters'
import {
  NI_CLASS2_SPT, NI_C2_WEEKLY, NI_PT, NI_UEL,
  PA_BASE, PA_TAPER_START, PA_TAPER_END,
  RUK_BASIC_LIMIT, RUK_HIGHER_LIMIT,
  DIV_BASIC, DIV_HIGHER,
} from '@/lib/tax/bands-2026'

const pct = (rate: number) => pct1(rate * 100)

const BASE_SYSTEM = `You are EasyAcco's personal tax advisor — aligned to HMRC rules for the 2026/27 UK fiscal year. You are a conversational advisor, not a text box, with a voice and a memory of the conversation so far. Do not introduce yourself with a name; simply speak as a knowledgeable UK tax advisor.

Your purpose is to help users understand UK income tax, personal allowance, National Insurance, dividends, and basic tax optimisation in plain language based on HMRC rules for 2026/27.

TONE:
- Warm, professional, and direct — like a sharp accountant who respects the user's time
- Converse naturally. Acknowledge what the user just said before pivoting to numbers
- Ask one clarifying question when the user's situation is ambiguous (employment type, pension, dividends, region)
- When the user gives figures, work through them step by step — don't just dump a rule
- Plain English. No jargon dumps. No emoji. No filler like "Great question!"
- Reference the user's earlier messages when relevant — you remember the conversation
- Use markdown: **bold** for key figures, bullet lists for breakdowns, ## headings for sections

CORE TAX RULES — FOLLOW EXACTLY:

Personal Allowance:
- Standard allowance = ${fmtGBP(PA_BASE)}
- Income below ${fmtGBP(PA_TAPER_START)}: full allowance applies
- Income above ${fmtGBP(PA_TAPER_START)}: reduction = (income minus ${PA_TAPER_START}) divided by 2
  adjusted allowance = max(0, ${PA_BASE} minus reduction)
- Income at or above ${fmtGBP(PA_TAPER_END)}: allowance = £0
- Personal Allowance is NEVER negative — minimum is £0

Taxable Income:
- taxable income = max(0, income minus adjusted allowance)

Income Tax Bands (rUK 2026/27):
- 20% basic rate: ${fmtGBP(PA_BASE + 1)} to ${fmtGBP(RUK_BASIC_LIMIT)}
- 40% higher rate: ${fmtGBP(RUK_BASIC_LIMIT + 1)} to ${fmtGBP(RUK_HIGHER_LIMIT)}
- 45% additional rate: above ${fmtGBP(RUK_HIGHER_LIMIT)}

Dividend Tax Rates (2026/27):
- First £500: tax-free allowance
- ${pct(DIV_BASIC)} in basic rate band
- ${pct(DIV_HIGHER)} in higher rate band
- 39.35% in additional rate band

National Insurance (Self-Employed):
- Class 4: 6% on profits ${fmtGBP(NI_PT)} to ${fmtGBP(NI_UEL)}; 2% above
- Class 2: deemed paid (no charge) if profit above ${fmtGBP(NI_CLASS2_SPT)} SPT
- Class 2 voluntary: £${NI_C2_WEEKLY.toFixed(2)}/week if profit below ${fmtGBP(NI_CLASS2_SPT)} SPT

NI (Employed):
- Class 1: 8% on earnings ${fmtGBP(NI_PT)} to ${fmtGBP(NI_UEL)}; 2% above

60% Trap:
- Income between ${fmtGBP(PA_TAPER_START)} and ${fmtGBP(PA_TAPER_END)}
- Personal Allowance tapers away at £1 per £2 above ${fmtGBP(PA_TAPER_START)}
- Creates effective 60% marginal rate on that slice of income
- SIPP pension contribution is the main tool to reduce income below ${fmtGBP(PA_TAPER_START)}

BEHAVIOUR:
When the user provides income figures, explain:
1. Whether they pay tax and what band they are in
2. Whether the PA taper applies
3. Simple, specific guidance (pension, expenses) if relevant

RULES:
- Keep responses short — 2 to 5 sentences where possible; expand only when working through numbers
- Never guess or invent tax rules
- Do not use emoji
- Stay conversational — respond to what the user actually said, not a templated script
- Always prioritise clarity and usefulness
- Recommend a qualified accountant for complex personal circumstances

When the user greets you ("hi", "hey", "hello"), greet them back briefly as their personal tax advisor (do not use a personal name) and ask what they'd like to look at — do not dump a wall of tax rules.`

const OFFLINE: Record<string, string> = {
  allowance:
    `Your standard Personal Allowance is **${fmtGBP(PA_BASE)}** for 2026/27. ` +
    `If your income exceeds ${fmtGBP(PA_TAPER_START)}, it reduces by £1 for every £2 above that threshold. ` +
    `At ${fmtGBP(PA_TAPER_END)} or above, no Personal Allowance applies.`,
  pension:
    `SIPP pension contributions reduce your adjusted net income pound-for-pound. ` +
    `If your income is between **${fmtGBP(PA_TAPER_START)} and ${fmtGBP(PA_TAPER_END)}**, you are in the 60% trap — ` +
    `a contribution back to ${fmtGBP(PA_TAPER_START)} restores your full Personal Allowance and saves significantly.`,
  dividend:
    `Directors: the first **£500** in dividends is tax-free (2026/27). ` +
    `Above that: **${pct(DIV_BASIC)}** in the basic rate band, **${pct(DIV_HIGHER)}** in the higher rate band. ` +
    `Optimal structure is a salary at the NI threshold (${fmtGBP(NI_PT)}) plus dividends.`,
  mileage:
    'You can claim **45p per business mile** for the first 10,000 miles, then **25p/mile**. ' +
    'Keep a log with dates, destinations and business purpose.',
  expense:
    'Common allowable expenses: Use of Home (£6/wk flat rate), mileage (45p/mile), ' +
    'equipment, training, professional subscriptions, pension contributions. ' +
    'Enter your expenses in the Tax Estimator to see the exact reduction.',
  ni:
    `Self-employed Class 4 NI: **6%** on profits ${fmtGBP(NI_PT)} to ${fmtGBP(NI_UEL)}, then **2%** above. ` +
    `Class 2 is deemed paid at no charge once profits exceed ${fmtGBP(NI_CLASS2_SPT)}. ` +
    `Employed Class 1: **8%** on earnings ${fmtGBP(NI_PT)} to ${fmtGBP(NI_UEL)}, then 2% above.`,
  trap:
    `The **60% trap** applies when income is between ${fmtGBP(PA_TAPER_START)} and ${fmtGBP(PA_TAPER_END)}. ` +
    `Your Personal Allowance reduces by £1 for every £2 above ${fmtGBP(PA_TAPER_START)}, ` +
    `creating an effective 60% marginal rate on that slice. ` +
    `A SIPP contribution to bring income below ${fmtGBP(PA_TAPER_START)} is the standard solution.`,
}

function offlineReply(query: string): string {
  const q = query.toLowerCase()
  if (q.includes('allowance') || q.includes('personal') || q.includes('12570'))  return OFFLINE.allowance
  if (q.includes('pension')   || q.includes('sipp'))                             return OFFLINE.pension
  if (q.includes('dividend'))                                                     return OFFLINE.dividend
  if (q.includes('mileage')   || q.includes('miles') || q.includes('car'))       return OFFLINE.mileage
  if (q.includes('expense')   || q.includes('claim') || q.includes('deduct'))    return OFFLINE.expense
  if (q.includes('national insurance') || q.includes(' ni ') || q.includes('class')) return OFFLINE.ni
  if (q.includes('60%')       || q.includes('trap')  || q.includes('100,000'))   return OFFLINE.trap
  return (
    'The Tax Estimator on the Tax page gives you a full HMRC-accurate 2026/27 breakdown. ' +
    'Enter your income and expenses there for exact figures. ' +
    'Ask me anything specific about Personal Allowance, NI, dividends, or expenses.'
  )
}

let _genAI: GoogleGenerativeAI | null = null
function getGenAI(apiKey: string): GoogleGenerativeAI {
  if (!_genAI) _genAI = new GoogleGenerativeAI(apiKey)
  return _genAI
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY

  type HistoryTurn = { role: 'user' | 'model'; parts: Array<{ text: string }> }
  let body: { message?: string; history?: HistoryTurn[]; context?: Partial<KittaxContext> }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const query = (body.message ?? '').trim()
  if (!query) {
    return NextResponse.json({ error: 'message is required' }, { status: 400 })
  }
  if (query.length > 4000) {
    return NextResponse.json({ error: 'message too long (max 4000 chars)' }, { status: 400 })
  }

  // Build context-injected system prompt
  let systemPrompt = BASE_SYSTEM
  if (body.context && typeof body.context === 'object') {
    const ctxText = buildContextPrompt(body.context as KittaxContext)
    systemPrompt = `${BASE_SYSTEM}\n\nUSER CONTEXT (live data — use this for proactive guidance):\n${ctxText}`
  }

  if (!apiKey) {
    return NextResponse.json({ answer: offlineReply(query), offline: true })
  }

  try {
    const model = getGenAI(apiKey).getGenerativeModel({
      model: 'gemini-1.5-flash',
      systemInstruction: systemPrompt,
    })
    const history = Array.isArray(body.history)
      ? body.history
          .filter((t): t is HistoryTurn =>
            !!t &&
            (t.role === 'user' || t.role === 'model') &&
            Array.isArray(t.parts) &&
            t.parts.every((p) => p && typeof p.text === 'string')
          )
          .slice(-20)
      : []

    const chat = model.startChat({ history })

    // Stream the response back to the client
    const result = await chat.sendMessageStream(query)

    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of result.stream) {
            const text = chunk.text()
            if (text) controller.enqueue(new TextEncoder().encode(text))
          }
        } finally {
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'X-Streaming': 'true',
        'Cache-Control': 'no-store',
      },
    })
  } catch (err: unknown) {
    console.error('[ai/chat] Gemini error:', err instanceof Error ? err.message : err)
    return NextResponse.json({ answer: offlineReply(query), offline: true })
  }
}
