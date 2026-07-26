// ── Acco Context Builder ────────────────────────────────────────────────────
// Builds the live financial context string that gets injected into the advisory
// system prompt so Acco can give proactive, user-specific guidance.

import type { AccoContext } from './types'
import { fmtDec as fmtGBP, fmtAbs } from '@/lib/formatters'
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

/**
 * Generalises a money figure into a range before it leaves our servers (SEC-4).
 *
 * The advisory prompt is sent to Google Gemini, a third-party processor. An
 * exact figure like £47,312.68 is a financial fingerprint; the band
 * "£45,000–£50,000" carries the same advisory signal — it is what tells Acco
 * the user is near the higher-rate threshold — while transmitting materially
 * less about them. That is GDPR data minimisation (Art. 5(1)(c)) applied at the
 * point of disclosure.
 *
 * Bands widen with magnitude so the relative precision stays roughly constant.
 */
export function bandMoney(n: number): string {
  if (!Number.isFinite(n)) return 'unknown'
  if (n < 0) return 'a loss (negative)'
  if (n < 1_000) return 'under £1,000'

  const width = n < 100_000 ? 5_000 : n < 250_000 ? 25_000 : 0
  if (width === 0) return 'over £250,000'

  const lo = Math.floor(n / width) * width
  return `${fmtAbs(lo)}–${fmtAbs(lo + width)}`
}

/**
 * Serialises the context object into a concise prompt segment.
 *
 * Threshold constants are public HMRC figures and stay exact. Anything derived
 * from the user's own ledger is banded — see bandMoney. This is the single
 * choke point where user context becomes prompt text, so the minimisation
 * applies no matter what a caller puts in the context object.
 */
export function buildContextPrompt(ctx: AccoContext): string {
  const lines: string[] = [
    `Current period: ${ctx.currentMonth} (Tax year ${ctx.taxYear})`,
    `Key thresholds: Personal Allowance ${fmtGBP(ctx.personalAllowance)} · Basic rate limit ${fmtGBP(ctx.basicRateLimit)} · Higher rate taper ${fmtGBP(ctx.higherRateTaper)} · Top rate ${fmtGBP(ctx.topRateTaper)}`,
    'The user figures below are deliberately given as ranges, not exact amounts.',
  ]

  if (ctx.totalExpensesYTD != null) {
    lines.push(`User's logged expenses (YTD): ${bandMoney(ctx.totalExpensesYTD)}`)
  }
  if (ctx.estimatedProfit != null) {
    lines.push(`Estimated taxable profit: ${bandMoney(ctx.estimatedProfit)}`)
  }
  if (ctx.estimatedTaxLiability != null) {
    lines.push(`Estimated tax & NI liability: ${bandMoney(ctx.estimatedTaxLiability)}`)
  }
  if (ctx.taxBand) {
    lines.push(`User's current tax band: ${ctx.taxBand}`)
  }

  return lines.join('\n')
}
