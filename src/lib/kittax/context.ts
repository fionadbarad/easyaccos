// ── Kittax Context Builder ────────────────────────────────────────────────────
// Builds the live financial context string that gets injected into the advisory
// system prompt so Kittax can give proactive, user-specific guidance.

import type { KittaxContext } from './types'

function fmtGBP(n: number) {
  return '£' + n.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/** Returns current tax-year context populated with static 2026/27 thresholds. */
export function buildBaseContext(): KittaxContext {
  const now = new Date()
  const month = now.toLocaleString('en-GB', { month: 'long', year: 'numeric' })
  return {
    currentMonth:     month,
    taxYear:          '2026/27',
    personalAllowance: 12_570,
    basicRateLimit:    37_700,
    higherRateTaper:  100_000,
    topRateTaper:     125_140,
  }
}

/** Serialises the context object into a concise prompt segment. */
export function buildContextPrompt(ctx: KittaxContext): string {
  const lines: string[] = [
    `Current period: ${ctx.currentMonth} (Tax year ${ctx.taxYear})`,
    `Key thresholds: Personal Allowance ${fmtGBP(ctx.personalAllowance)} · Basic rate limit ${fmtGBP(ctx.basicRateLimit)} · Higher rate taper ${fmtGBP(ctx.higherRateTaper)} · Top rate ${fmtGBP(ctx.topRateTaper)}`,
  ]

  if (ctx.totalExpensesYTD != null) {
    lines.push(`User's logged expenses (YTD): ${fmtGBP(ctx.totalExpensesYTD)}`)
  }
  if (ctx.estimatedProfit != null) {
    lines.push(`Estimated taxable profit: ${fmtGBP(ctx.estimatedProfit)}`)
  }
  if (ctx.estimatedTaxLiability != null) {
    lines.push(`Estimated tax & NI liability: ${fmtGBP(ctx.estimatedTaxLiability)}`)
  }
  if (ctx.taxBand) {
    lines.push(`User's current tax band: ${ctx.taxBand}`)
  }

  return lines.join('\n')
}
