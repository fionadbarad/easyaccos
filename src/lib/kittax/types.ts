// ── Kittax AI — shared types ─────────────────────────────────────────────────

export interface TaxBreakdown {
  income: number
  personalAllowance: number
  taxableIncome: number
  incomeTax: number
  ni: number
  totalDeductions: number
  net: number
  effectiveRate: string
  band: string
}

/** Live user financial state injected into the advisory system prompt. */
export interface KittaxContext {
  currentMonth: string        // e.g. "April 2026"
  taxYear: string             // "2026/27"
  personalAllowance: number   // £12,570
  basicRateLimit: number      // £37,700 (width)
  higherRateTaper: number     // £100,000
  topRateTaper: number        // £125,140
  totalExpensesYTD?: number   // sum of logged expenses this tax year
  estimatedProfit?: number    // user-supplied or derived
  estimatedTaxLiability?: number
  taxBand?: string
}

export interface KittaxMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  ts: number
}
