// ── Acco Context Builder ────────────────────────────────────────────────────
// Builds the live financial context string that gets injected into the advisory
// system prompt so Acco can give proactive, user-specific guidance.

import type { AccoContext } from './types'
import { fmtDec as fmtGBP } from '@/lib/formatters'
import { PA_BASE, RUK_BASIC_RATE_WIDTH, PA_TAPER_START, PA_TAPER_END } from '@/lib/tax/bands-2026'

/** Returns current tax-year context populated from bands-2026 (single source). */
export function buildBaseContext(): AccoContext {
  const now = new Date()
  const month = now.toLocaleString('en-GB', { month: 'long', year: 'numeric' })
  return {
    currentMonth: month,
    taxYear: '2026/27',
    personalAllowance: PA_BASE,
    basicRateLimit: RUK_BASIC_RATE_WIDTH,
    higherRateTaper: PA_TAPER_START,
    topRateTaper: PA_TAPER_END,
  }
}

/** Serialises the context object into a concise prompt segment. */
export function buildContextPrompt(ctx: AccoContext): string {
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
