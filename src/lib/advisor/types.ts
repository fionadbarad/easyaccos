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
export interface AdvisorContext {
  currentMonth: string
  taxYear: string
  personalAllowance: number
  basicRateLimit: number
  higherRateTaper: number
  topRateTaper: number
  totalExpensesYTD?: number
  estimatedProfit?: number
  estimatedTaxLiability?: number
  taxBand?: string
}

export interface AdvisorMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  ts: number
}
