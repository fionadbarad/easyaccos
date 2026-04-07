import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

// ─── Resolve Gemini API key from any common env var name ────────────────────
function getApiKey(): string | null {
  return (
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
    process.env.NEXT_PUBLIC_GEMINI_API_KEY ||
    null
  )
}

// ─── 2026/27 UK Tax Engine ───────────────────────────────────────────────────
interface TaxResult {
  income: number
  tax: number
  ni: number
  net: number
  effectiveRate: string
  personalAllowance: number
}

function calculateTax(income: number, region: string = 'rUK'): TaxResult {
  const PA = income > 125140 ? 0 : income > 100000
    ? Math.max(0, 12570 - Math.floor((income - 100000) / 2))
    : 12570

  const taxable = Math.max(0, income - PA)
  let tax = 0

  if (region === 'scotland') {
    // Scotland 6-band
    const bands = [
      { from: 0,      to: 2097,   rate: 0.19 },  // above PA
      { from: 2097,   to: 13086,  rate: 0.20 },
      { from: 13086,  to: 31252,  rate: 0.21 },
      { from: 31252,  to: 62430,  rate: 0.42 },
      { from: 62430,  to: 112570, rate: 0.45 },
      { from: 112570, to: Infinity, rate: 0.48 },
    ]
    let remaining = taxable
    for (const b of bands) {
      const width = b.to - b.from
      const chunk = Math.min(remaining, width)
      if (chunk <= 0) break
      tax += chunk * b.rate
      remaining -= chunk
    }
  } else {
    // rUK 3-band
    if (taxable <= 37700)       tax = taxable * 0.20
    else if (taxable <= 112570) tax = 37700 * 0.20 + (taxable - 37700) * 0.40
    else                        tax = 37700 * 0.20 + 74870 * 0.40 + (taxable - 112570) * 0.45
  }

  // Class 4 NI (self-employed default)
  let ni = 0
  if (income > 12570) {
    const niMain  = Math.min(income, 50270) - 12570
    const niUpper = Math.max(0, income - 50270)
    ni = niMain * 0.06 + niUpper * 0.02
  }

  const net = Math.round(income - tax - ni)
  return {
    income,
    tax:  Math.round(tax),
    ni:   Math.round(ni),
    net,
    effectiveRate: income > 0 ? (((tax + ni) / income) * 100).toFixed(1) + '%' : '0%',
    personalAllowance: PA,
  }
}

// ─── In-memory report store (per-instance, resets on cold start) ─────────────
const reports: Record<string, TaxResult & { id: string; savedAt: string }> = {}

// ─── AI: parse natural language into tax params ──────────────────────────────
async function interpretInput(apiKey: string, message: string) {
  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
  const prompt = `Extract UK tax query details from this message and return ONLY valid JSON.
Message: "${message}"
Return exactly: {"income": <number>, "region": "rUK" or "scotland"}
If income not found, use 0. No markdown, no explanation.`
  const result = await model.generateContent(prompt)
  const text = result.response.text().trim().replace(/```json|```/g, '').trim()
  try {
    return JSON.parse(text) as { income: number; region: string }
  } catch {
    return { income: 0, region: 'rUK' }
  }
}

// ─── AI: explain tax result in plain English ─────────────────────────────────
async function explainResult(apiKey: string, data: TaxResult): Promise<string> {
  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
    systemInstruction:
      'You are a friendly UK tax advisor. Give clear, concise explanations. ' +
      'Always suggest at least one legal way to reduce the tax bill (pension, expenses, etc).',
  })
  const prompt = `Explain this UK 2026/27 tax result in 3 short sections:
- Summary (1 sentence)
- Breakdown (bullet points)
- Top tip to reduce tax

Data: Income £${data.income.toLocaleString('en-GB')}, Tax £${data.tax.toLocaleString('en-GB')}, NI £${data.ni.toLocaleString('en-GB')}, Net £${data.net.toLocaleString('en-GB')}, Effective rate ${data.effectiveRate}`
  const result = await model.generateContent(prompt)
  return result.response.text()
}

// ─── PDF generator (server-side, returns base64 data URI) ────────────────────
async function generatePDF(data: TaxResult & { id?: string; savedAt?: string }): Promise<string> {
  // Dynamic import keeps jsPDF out of the main bundle
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF()
  const gold = [194, 163, 104] as const
  const dark = [11, 14, 26]   as const

  // Background
  doc.setFillColor(...dark)
  doc.rect(0, 0, 210, 297, 'F')

  // Header bar
  doc.setFillColor(...gold)
  doc.rect(0, 0, 210, 28, 'F')
  doc.setTextColor(11, 14, 26)
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text('EasyAcco', 14, 12)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text('UK Tax Report  |  2026/27 Fiscal Year', 14, 21)

  const now = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  doc.text(`Generated: ${now}`, 210 - 14, 21, { align: 'right' })

  // Section: Summary
  doc.setTextColor(194, 163, 104)
  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.text('Tax Summary', 14, 44)

  const rows: [string, string][] = [
    ['Gross Income',       `£${data.income.toLocaleString('en-GB')}`],
    ['Personal Allowance', `£${data.personalAllowance.toLocaleString('en-GB')}`],
    ['Taxable Income',     `£${(data.income - data.personalAllowance).toLocaleString('en-GB')}`],
    ['Income Tax',         `£${data.tax.toLocaleString('en-GB')}`],
    ['National Insurance', `£${data.ni.toLocaleString('en-GB')}`],
    ['Total Deductions',   `£${(data.tax + data.ni).toLocaleString('en-GB')}`],
    ['Effective Rate',     data.effectiveRate],
    ['Net Take-Home',      `£${data.net.toLocaleString('en-GB')}`],
  ]

  let y = 52
  rows.forEach(([label, value], i) => {
    const isLast = i === rows.length - 1
    doc.setFillColor(isLast ? 40 : 22, isLast ? 50 : 30, isLast ? 70 : 45)
    doc.roundedRect(14, y - 5, 182, 9, 1, 1, 'F')
    doc.setTextColor(isLast ? 255 : 180, isLast ? 215 : 170, isLast ? 0 : 130)
    doc.setFontSize(isLast ? 11 : 10)
    doc.setFont('helvetica', isLast ? 'bold' : 'normal')
    doc.text(label, 18, y + 1)
    doc.text(value, 196 - 4, y + 1, { align: 'right' })
    y += 12
  })

  // Footer
  doc.setTextColor(80, 90, 110)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text('Estimates only. Not financial advice. easyacco.vercel.app', 105, 285, { align: 'center' })

  return doc.output('datauristring')
}

// ─── Route handler ────────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  const apiKey = getApiKey()

  let body: { action?: string; message?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 })
  }

  const { action, message } = body

  // ── PDF: does NOT need AI key ──────────────────────────────────────────────
  if (action === 'pdf') {
    try {
      const data = message as TaxResult
      const pdf = await generatePDF(data)
      return NextResponse.json({ success: true, pdf })
    } catch (err) {
      const e = err instanceof Error ? err.message : 'PDF error'
      return NextResponse.json({ success: false, error: e }, { status: 500 })
    }
  }

  // ── SAVE: does NOT need AI key ─────────────────────────────────────────────
  if (action === 'save') {
    const data = message as TaxResult
    const id = `rpt_${Date.now()}`
    reports[id] = { ...data, id, savedAt: new Date().toISOString() }
    return NextResponse.json({ success: true, report: reports[id] })
  }

  // ── ASK: needs AI key ──────────────────────────────────────────────────────
  if (action === 'ask') {
    if (!apiKey) {
      // Degrade gracefully — run tax calc without AI explanation
      const fallback = calculateTax(0, 'rUK')
      return NextResponse.json({
        success: true,
        data: fallback,
        explanation: 'AI advisor is offline. Tax calculation is still accurate — enter your income above to see your breakdown.',
        aiOffline: true,
      })
    }

    try {
      const parsed = await interpretInput(apiKey, message as string)
      const data   = calculateTax(parsed.income || 0, parsed.region || 'rUK')
      const explanation = await explainResult(apiKey, data)
      return NextResponse.json({ success: true, data, explanation })
    } catch (err) {
      const e = err instanceof Error ? err.message : 'AI error'
      console.error('Assistant AI error:', e)
      return NextResponse.json({ success: false, error: e }, { status: 500 })
    }
  }

  // ── Direct tax calc (no AI) ────────────────────────────────────────────────
  if (action === 'calculate') {
    const { income = 0, region = 'rUK' } = message as { income?: number; region?: string }
    return NextResponse.json({ success: true, data: calculateTax(income, region) })
  }

  return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 })
}

// ── Health / key-check endpoint ───────────────────────────────────────────────
export async function GET() {
  const key = getApiKey()
  return NextResponse.json({
    status: 'ok',
    aiConfigured: !!key,
    keyFound: key ? key.substring(0, 8) + '...' : null,
    checkedVars: ['GEMINI_API_KEY', 'GOOGLE_API_KEY', 'GOOGLE_GENERATIVE_AI_API_KEY'],
  })
}
