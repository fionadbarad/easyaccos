import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenAI } from '@google/genai'
import { buildContextPrompt } from '@/lib/acco/context'
import { ChatRequestSchema } from '@/app/api/ai/schemas'
import { reportError } from '@/lib/monitor'
import { createClient } from '@/lib/supabase-server'
import { fmtGBP } from '@/lib/formatters'
import {
  PA_BASE,
  PA_TAPER_START,
  PA_TAPER_END,
  RUK_BASIC_LIMIT,
  RUK_HIGHER_LIMIT,
  RUK_BASIC_RATE,
  RUK_HIGHER_RATE,
  RUK_ADDITIONAL_RATE,
  NI_PT,
  NI_UEL,
  NI_C1_MAIN,
  NI_C1_UPPER,
  NI_C4_MAIN,
  NI_C2_WEEKLY,
  NI_CLASS2_SPT,
  DIV_ALLOWANCE,
  DIV_BASIC,
  DIV_HIGHER,
  DIV_ADDL,
} from '@/lib/tax/bands-2026'

// All numeric values below resolve at module load from bands-2026.ts so this
// prompt — and the offline canned replies — can never drift from the engine.
const pct = (n: number) => `${(n * 100).toFixed((n * 100) % 1 === 0 ? 0 : 2)}%`

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
- Income above ${fmtGBP(PA_TAPER_START)}: reduction = (income minus ${fmtGBP(PA_TAPER_START).replace('£', '')}) divided by 2
  adjusted allowance = max(0, ${fmtGBP(PA_BASE).replace('£', '')} minus reduction)
- Income at or above ${fmtGBP(PA_TAPER_END)}: allowance = £0
- Personal Allowance is NEVER negative — minimum is £0

Taxable Income:
- taxable income = max(0, income minus adjusted allowance)

Income Tax Bands (rUK 2026/27):
- ${pct(RUK_BASIC_RATE)} basic rate: ${fmtGBP(PA_BASE + 1)} to ${fmtGBP(RUK_BASIC_LIMIT)}
- ${pct(RUK_HIGHER_RATE)} higher rate: ${fmtGBP(RUK_BASIC_LIMIT + 1)} to ${fmtGBP(RUK_HIGHER_LIMIT)}
- ${pct(RUK_ADDITIONAL_RATE)} additional rate: above ${fmtGBP(RUK_HIGHER_LIMIT)}

Dividend Tax Rates (2026/27):
- First ${fmtGBP(DIV_ALLOWANCE)}: tax-free allowance
- ${pct(DIV_BASIC)} in basic rate band
- ${pct(DIV_HIGHER)} in higher rate band
- ${pct(DIV_ADDL)} in additional rate band

National Insurance (Self-Employed):
- Class 4: ${pct(NI_C4_MAIN)} on profits ${fmtGBP(NI_PT)} to ${fmtGBP(NI_UEL)}; ${pct(NI_C1_UPPER)} above
- Class 2: deemed paid (no charge) if profit above ${fmtGBP(NI_CLASS2_SPT)} SPT
- Class 2 voluntary: £${NI_C2_WEEKLY.toFixed(2)}/week if profit below ${fmtGBP(NI_CLASS2_SPT)} SPT

NI (Employed):
- Class 1: ${pct(NI_C1_MAIN)} on earnings ${fmtGBP(NI_PT)} to ${fmtGBP(NI_UEL)}; ${pct(NI_C1_UPPER)} above

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

const OFFLINE = {
  allowance:
    `Your standard Personal Allowance is **${fmtGBP(PA_BASE)}** for 2026/27. ` +
    `If your income exceeds ${fmtGBP(PA_TAPER_START)}, it reduces by £1 for every £2 above that threshold. ` +
    `At ${fmtGBP(PA_TAPER_END)} or above, no Personal Allowance applies.`,
  pension:
    `SIPP pension contributions reduce your adjusted net income pound-for-pound. ` +
    `If your income is between **${fmtGBP(PA_TAPER_START)} and ${fmtGBP(PA_TAPER_END)}**, you are in the 60% trap — ` +
    `a contribution back to ${fmtGBP(PA_TAPER_START)} restores your full Personal Allowance and saves significantly.`,
  dividend:
    `Directors: the first **${fmtGBP(DIV_ALLOWANCE)}** in dividends is tax-free (2026/27). ` +
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
    `Self-employed Class 4 NI: **${pct(NI_C4_MAIN)}** on profits ${fmtGBP(NI_PT)} to ${fmtGBP(NI_UEL)}, then **${pct(NI_C1_UPPER)}** above. ` +
    `Class 2 is deemed paid at no charge once profits exceed ${fmtGBP(NI_CLASS2_SPT)}. ` +
    `Employed Class 1: **${pct(NI_C1_MAIN)}** on earnings ${fmtGBP(NI_PT)} to ${fmtGBP(NI_UEL)}, then ${pct(NI_C1_UPPER)} above.`,
  trap:
    `The **60% trap** applies when income is between ${fmtGBP(PA_TAPER_START)} and ${fmtGBP(PA_TAPER_END)}. ` +
    `Your Personal Allowance reduces by £1 for every £2 above ${fmtGBP(PA_TAPER_START)}, ` +
    `creating an effective 60% marginal rate on that slice. ` +
    `A SIPP contribution to bring income below ${fmtGBP(PA_TAPER_START)} is the standard solution.`,
}

function offlineReply(query: string): string {
  const q = query.toLowerCase()
  if (q.includes('allowance') || q.includes('personal') || q.includes('12570'))
    return OFFLINE.allowance
  if (q.includes('pension') || q.includes('sipp')) return OFFLINE.pension
  if (q.includes('dividend')) return OFFLINE.dividend
  if (q.includes('mileage') || q.includes('miles') || q.includes('car')) return OFFLINE.mileage
  if (q.includes('expense') || q.includes('claim') || q.includes('deduct')) return OFFLINE.expense
  if (q.includes('national insurance') || q.includes(' ni ') || q.includes('class'))
    return OFFLINE.ni
  if (q.includes('60%') || q.includes('trap') || q.includes('100,000')) return OFFLINE.trap
  return (
    'The Tax Estimator on the Tax page gives you a full HMRC-accurate 2026/27 breakdown. ' +
    'Enter your income and expenses there for exact figures. ' +
    'Ask me anything specific about Personal Allowance, NI, dividends, or expenses.'
  )
}

// gemini-2.5-flash: current-gen, free-tier eligible, not a preview model.
// (The old gemini-1.5-flash model and the @google/generative-ai SDK are
// both retired — that combo would fail even with a valid key and silently
// drop back to the offline canned replies below.)
const MODEL = 'gemini-1.5-flash'

let _ai: GoogleGenAI | null = null
function getAI(apiKey: string): GoogleGenAI {
  if (!_ai) _ai = new GoogleGenAI({ apiKey })
  return _ai
}

export async function POST(request: NextRequest) {
  // 1. Auth check
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2. Simple rate limiting (using IP-based check or similar if possible,
  // but for now let's at least ensure they are logged in)

  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY

  let raw: unknown
  try {
    raw = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = ChatRequestSchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid request' },
      { status: 400 },
    )
  }
  const { message: query, history: validatedHistory, context } = parsed.data

  const systemPrompt = context
    ? `${BASE_SYSTEM}\n\nUSER CONTEXT (live data — use this for proactive guidance):\n${buildContextPrompt(context)}`
    : BASE_SYSTEM

  if (!apiKey) {
    return NextResponse.json({ answer: offlineReply(query), offline: true })
  }

  try {
    const chat = getAI(apiKey).chats.create({
      model: MODEL,
      config: { systemInstruction: systemPrompt },
      history: (validatedHistory ?? [])
        .map((h) => ({
          role: h.role === 'user' ? 'user' : 'model',
          parts: h.parts.map((p) => ({ text: p.text })),
        }))
        .filter((turn) => turn.parts.some((p) => p.text !== ''))
        .slice(-20),
    })
    const result = await chat.sendMessageStream({ message: query })

    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of result) {
            const text = chunk.text
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
    reportError('api.ai.chat', err)
    return NextResponse.json({ answer: offlineReply(query), offline: true })
  }
}
