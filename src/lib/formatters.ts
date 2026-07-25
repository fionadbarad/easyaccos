/**
 * Currency / number formatters. Single source of truth — do not redefine
 * these inline. Previously lived scattered across tax-logic.ts,
 * useInvoices.ts, tracker/shared.ts, pnl/page.tsx, transactions/page.tsx,
 * and acco/context.ts; all now re-export or import from here.
 *
 * Conventions:
 *   fmtGBP  — whole pounds, rounded, for tip/label strings    ("£1,234")
 *   fmtDec  — 2dp, for invoice totals and audit totals        ("£1,234.50")
 *   fmtAbs  — whole pounds, absolute value                    ("£1,234")
 *   pct1    — single-decimal percent                          ("12.3%")
 */

export function fmtGBP(n: number): string {
  return '\u00a3' + Math.round(n).toLocaleString('en-GB')
}

export function fmtDec(n: number): string {
  return (
    '\u00a3' + n.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  )
}

export function fmtAbs(n: number): string {
  return '\u00a3' + Math.round(Math.abs(n)).toLocaleString('en-GB')
}

export function fmtDecAbs(n: number): string {
  return (
    '\u00a3' +
    Math.abs(n).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  )
}

export function pct1(n: number): string {
  return n.toFixed(1) + '%'
}
