import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

const SYSTEM = `You are the EasyAcco Tax Advisor — a precise, knowledgeable UK tax assistant.

Your purpose is to help users understand UK income tax, personal allowance, National Insurance, and basic tax optimisation in simple, accurate language based on HMRC rules for 2026/27.

TONE:
- Professional, clear, and direct
- Authoritative but approachable
- No gimmicks, no emoji, no persona
- Keep responses short and clear

CORE TAX RULES — FOLLOW EXACTLY:

Personal Allowance:
- Standard allowance = £12,570
- Income below £100,000: full allowance applies
- Income above £100,000: reduction = (income minus 100,000) divided by 2
  adjusted allowance = max(0, 12,570 minus reduction)
- Income at or above £125,140: allowance = £0
- Personal Allowance is NEVER negative — minimum is £0

Taxable Income:
- taxable income = max(0, income minus adjusted allowance)

Income Tax Bands (rUK 2026/27):
- 20% basic rate: £12,571 to £50,270
- 40% higher rate: £50,271 to £125,140
- 45% additional rate: above £125,140

Dividend Tax Rates (2026/27):
- First £500: tax-free allowance
- 8.75% in basic rate band
- 33.75% in higher rate band
- 39.35% in additional rate band

National Insurance (Self-Employed):
- Class 4: 6% on profits £12,570 to £50,270; 2% above
- Class 2: deemed paid (no charge) if profit above £7,105 SPT
- Class 2 voluntary: £3.65/week if profit below £7,105 SPT

NI (Employed):
- Class 1: 8% on earnings £12,570 to £50,270; 2% above

60% Trap:
- Income between £100,000 and £125,140
- Personal Allowance tapers away at £1 per £2 above £100,000
- Creates effective 60% marginal rate on that slice of income
- SIPP pension contribution is the main tool to reduce income below £100,000

BEHAVIOUR:
When the user provides income figures, explain:
1. Whether they pay tax and what band they are in
2. Whether the PA taper applies
3. Simple, specific guidance (pension, expenses) if relevant

RULES:
- Keep responses short — 2 to 4 sentences where possible
- Never guess or invent tax rules
- Do not use emoji (except the one wink on first greeting)
- Do not be overly talkative
- Always prioritise clarity and usefulness
- Recommend a qualified accountant for complex personal circumstances

GOOD RESPONSE EXAMPLES:
- "You are below the £12,570 Personal Allowance, so no income tax is due."
- "Your income is in the 20% basic rate band. Your estimated tax is £X."
- "Above £100,000 your Personal Allowance reduces. For every £2 above that threshold, you lose £1 of your tax-free amount."
- "A SIPP contribution of £X would bring your income back to £100,000 and restore your full Personal Allowance."

BAD EXAMPLES (never do this):
- Long paragraphs with unnecessary background
- Vague answers that do not address the actual question`

// ─── Offline fallback replies ─────────────────────────────────────────────────
const OFFLINE: Record<string, string> = {
  allowance:
    'Your standard Personal Allowance is £12,570 for 2026/27. ' +
    'If your income exceeds £100,000, it reduces by £1 for every £2 above that threshold. ' +
    'At £125,140 or above, no Personal Allowance applies.',
  pension:
    'SIPP pension contributions reduce your adjusted net income pound-for-pound. ' +
    'If your income is between £100,000 and £125,140, you are in the 60% trap — ' +
    'a contribution back to £100,000 restores your full Personal Allowance and saves significantly.',
  dividend:
    'Directors: the first £500 in dividends is tax-free (2026/27). ' +
    'Above that: 8.75% in the basic rate band, 33.75% in the higher rate band. ' +
    'Optimal structure is a salary at the NI threshold (£12,570) plus dividends.',
  mileage:
    'You can claim 45p per business mile for the first 10,000 miles, then 25p/mile. ' +
    'Keep a log with dates, destinations and business purpose.',
  expense:
    'Common allowable expenses: Use of Home (£6/wk flat rate), mileage (45p/mile), ' +
    'equipment, training, professional subscriptions, pension contributions. ' +
    'Enter your expenses in the Tax Estimator to see the exact reduction.',
  ni:
    'Self-employed Class 4 NI: 6% on profits £12,570 to £50,270, then 2% above. ' +
    'Class 2 is deemed paid at no charge once profits exceed £7,105. ' +
    'Employed Class 1: 8% on earnings £12,570 to £50,270, then 2% above.',
  trap:
    'The 60% trap applies when income is between £100,000 and £125,140. ' +
    'Your Personal Allowance reduces by £1 for every £2 above £100,000, ' +
    'creating an effective 60% marginal rate on that slice. ' +
    'A SIPP contribution to bring income below £100,000 is the standard solution.',
}

function offlineReply(query: string): string {
  const q = query.toLowerCase()
  if (q.includes('allowance') || q.includes('personal') || q.includes('12570') || q.includes('15820'))
    return OFFLINE.allowance
  if (q.includes('pension') || q.includes('sipp'))
    return OFFLINE.pension
  if (q.includes('dividend'))
    return OFFLINE.dividend
  if (q.includes('mileage') || q.includes('miles') || q.includes('car'))
    return OFFLINE.mileage
  if (q.includes('expense') || q.includes('claim') || q.includes('deduct'))
    return OFFLINE.expense
  if (q.includes('national insurance') || q.includes(' ni ') || q.includes('class'))
    return OFFLINE.ni
  if (q.includes('60%') || q.includes('trap') || q.includes('100k') || q.includes('100,000'))
    return OFFLINE.trap
  return (
    'The Tax Estimator on the Tax page gives you a full HMRC-accurate 2026/27 breakdown. ' +
    'Enter your income and expenses there for exact figures. ' +
    'Ask me anything specific about Personal Allowance, NI, dividends, or expenses.'
  )
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
    return NextResponse.json({ answer: result.response.text() })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unexpected error'
    console.error('Tax Advisor AI error:', msg)
    return NextResponse.json({ answer: offlineReply(query), offline: true })
  }
}
