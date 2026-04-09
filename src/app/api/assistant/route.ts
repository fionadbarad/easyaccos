import { NextRequest, NextResponse } from 'next/server'
import { calculateFullTax, kittaxAnswer } from '@/lib/kittax-brain'

// ─── 2026/27 UK Tax Engine (kept for direct calculate action) ───────────────
interface TaxResult {
  income: number
  tax: number
  ni: number
  net: number
  effectiveRate: string
  personalAllowance: number
}

function toTaxResult(income: number, region = 'rUK'): TaxResult {
  const b = calculateFullTax(income, region)
  return {
    income: b.income,
    tax: b.incomeTax,
    ni: b.ni,
    net: b.net,
    effectiveRate: b.effectiveRate,
    personalAllowance: b.personalAllowance,
  }
}

// ─── In-memory report store (per-instance, resets on cold start) ────────────
const reports: Record<string, TaxResult & { id: string; savedAt: string }> = {}

// ─── PDF generator (server-side, returns base64 data URI) ───────────────────
async function generatePDF(data: TaxResult & { id?: string; savedAt?: string }): Promise<string> {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF()
  const gold = [194, 163, 104] as const
  const dark = [11, 14, 26]   as const

  doc.setFillColor(...dark)
  doc.rect(0, 0, 210, 297, 'F')

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

  doc.setTextColor(194, 163, 104)
  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.text('Tax Summary', 14, 44)

  const rows: [string, string][] = [
    ['Gross Income',       `\u00a3${data.income.toLocaleString('en-GB')}`],
    ['Personal Allowance', `\u00a3${data.personalAllowance.toLocaleString('en-GB')}`],
    ['Taxable Income',     `\u00a3${(data.income - data.personalAllowance).toLocaleString('en-GB')}`],
    ['Income Tax',         `\u00a3${data.tax.toLocaleString('en-GB')}`],
    ['National Insurance', `\u00a3${data.ni.toLocaleString('en-GB')}`],
    ['Total Deductions',   `\u00a3${(data.tax + data.ni).toLocaleString('en-GB')}`],
    ['Effective Rate',     data.effectiveRate],
    ['Net Take-Home',      `\u00a3${data.net.toLocaleString('en-GB')}`],
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

  doc.setTextColor(80, 90, 110)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text('Estimates only. Not financial advice. easyacco.vercel.app', 105, 285, { align: 'center' })

  return doc.output('datauristring')
}

// ─── Parse income from natural language ─────────────────────────────────────
function parseIncome(message: string): { income: number; region: string } {
  const text = String(message || '')
  let income = 0
  let region = 'rUK'

  const kMatch = text.match(/(\d+(?:\.\d+)?)\s*k\b/i)
  if (kMatch) income = parseFloat(kMatch[1]) * 1000

  if (!income) {
    const numMatch = text.match(/£?\s*(\d{1,3}(?:,\d{3})*(?:\.\d+)?)/)
    if (numMatch) income = parseFloat(numMatch[1].replace(/,/g, ''))
  }

  if (/\bscot(?:land|tish)\b/i.test(text)) region = 'scotland'

  return { income, region }
}

// ─── Route handler ──────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  let body: { action?: string; message?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 })
  }

  const { action, message } = body

  // ── PDF ────────────────────────────────────────────────────────────────────
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

  // ── SAVE ───────────────────────────────────────────────────────────────────
  if (action === 'save') {
    const data = message as TaxResult
    const id = `rpt_${Date.now()}`
    reports[id] = { ...data, id, savedAt: new Date().toISOString() }
    return NextResponse.json({ success: true, report: reports[id] })
  }

  // ── ASK (uses Kittax brain — no external API) ─────────────────────────────
  if (action === 'ask') {
    const text = String(message || '')
    const parsed = parseIncome(text)
    const data = toTaxResult(parsed.income || 0, parsed.region)
    const explanation = kittaxAnswer(text)
    return NextResponse.json({ success: true, data, explanation })
  }

  // ── CALCULATE ──────────────────────────────────────────────────────────────
  if (action === 'calculate') {
    const { income = 0, region = 'rUK' } = message as { income?: number; region?: string }
    return NextResponse.json({ success: true, data: toTaxResult(income, region) })
  }

  return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 })
}

// ── Health endpoint ─────────────────────────────────────────────────────────
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    engine: 'Kittax Brain (self-built, free)',
    aiConfigured: true,
  })
}
