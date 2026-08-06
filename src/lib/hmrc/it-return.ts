/**
 * MTD Self Assessment period summary: shape and period validation.
 *
 * The VAT route had its validation extracted to `vat-return.ts` so it could be
 * unit-tested — a Next.js `route.ts` may only export HTTP methods and segment
 * config, so anything a test needs to reach has to live in a module. The Self
 * Assessment route never got the same treatment, and it shows: its checks were
 * the thinner of the two, and no test could reach them.
 *
 * What was missing, and why each one matters:
 *
 *   - `nino` was checked for truthiness only. A NINO is the taxpayer's identity
 *     and goes straight into the request path. "hello" was accepted and sent.
 *   - the two period dates were checked for truthiness only, so '5th April' or
 *     '2026-13-45' passed and HMRC returned an opaque FORMAT_ error.
 *   - nothing checked that the period end came after its start.
 *   - nothing enforced HMRC's rule that consolidated expenses and detailed
 *     expenses are alternatives, never both. Sending both is a rejection.
 *   - money fields allowed any finite number, including three decimal places.
 */

import { isMoneyAmount } from './amounts'
import { invalidBrowserFields, type BrowserFraudData } from './fraud-headers'

export type ItExpenses = {
  costOfGoods?: number
  paymentsToSubcontractors?: number
  wagesAndStaffCosts?: number
  carVanTravelExpenses?: number
  premisesRunningCosts?: number
  maintenanceCosts?: number
  adminCosts?: number
  businessEntertainmentCosts?: number
  advertisingCosts?: number
  interestOnBankOtherLoans?: number
  financeCharges?: number
  irrecoverableDebts?: number
  professionalFees?: number
  depreciation?: number
  otherExpenses?: number
}

export type ItReturnBody = {
  nino: string
  businessId: string
  periodStartDate: string // YYYY-MM-DD
  periodEndDate: string // YYYY-MM-DD
  income: {
    turnover: number
    other?: number
  }
  expenses?: ItExpenses
  consolidatedExpenses?: number // alternative to detailed expenses
  browser: BrowserFraudData
  govTestScenario?: string
}

/**
 * HMRC's National Insurance number format.
 *
 * Two prefix letters, six digits, one suffix letter A–D. The prefix excludes
 * D, F, I, Q, U and V in either position and O in the second — those are not
 * issued, so accepting them means accepting a NINO that cannot exist.
 */
export const NINO_PATTERN = /^[A-CEGHJ-PR-TW-Z][A-CEGHJ-NPR-TW-Z]\d{6}[A-D]$/

/** A plain calendar date, which is what HMRC's period fields are. */
export const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/

/** True for a real calendar date in 'YYYY-MM-DD' form. */
export function isCalendarDate(value: unknown): value is string {
  if (typeof value !== 'string' || !DATE_ONLY_PATTERN.test(value)) return false
  // Regex alone accepts 2026-02-31. Round-trip through Date to reject the days
  // that do not exist, using UTC so no timezone can shift the answer.
  const [y, m, d] = value.split('-').map(Number) as [number, number, number]
  const parsed = new Date(Date.UTC(y, m - 1, d))
  return (
    parsed.getUTCFullYear() === y && parsed.getUTCMonth() === m - 1 && parsed.getUTCDate() === d
  )
}

export const IT_EXPENSE_KEYS = [
  'costOfGoods',
  'paymentsToSubcontractors',
  'wagesAndStaffCosts',
  'carVanTravelExpenses',
  'premisesRunningCosts',
  'maintenanceCosts',
  'adminCosts',
  'businessEntertainmentCosts',
  'advertisingCosts',
  'interestOnBankOtherLoans',
  'financeCharges',
  'irrecoverableDebts',
  'professionalFees',
  'depreciation',
  'otherExpenses',
] as const

/** Field-level checks. Returns the names of everything missing or unusable. */
export function missingItFields(body: Partial<ItReturnBody>): string[] {
  const missing: string[] = []

  if (!body.nino) missing.push('nino')
  else if (!NINO_PATTERN.test(body.nino.toUpperCase())) {
    missing.push('nino (not a valid National Insurance number)')
  }

  if (!body.businessId) missing.push('businessId')

  for (const key of ['periodStartDate', 'periodEndDate'] as const) {
    if (!body[key]) missing.push(key)
    else if (!isCalendarDate(body[key])) missing.push(`${key} (must be a real date, YYYY-MM-DD)`)
  }

  // Number.isFinite, not typeof: NaN and ±Infinity are both `'number'` and both
  // serialise to `null`, which would reach HMRC as a period summary with no
  // turnover after we had called the body valid. isMoneyAmount also rejects a
  // third decimal place, which HMRC's schema does not accept.
  if (!body.income || !Number.isFinite(body.income.turnover)) missing.push('income.turnover')
  else if (!isMoneyAmount(body.income.turnover)) {
    missing.push('income.turnover (at most 2 decimal places)')
  }
  if (body.income?.other !== undefined && !isMoneyAmount(body.income.other)) {
    missing.push('income.other (at most 2 decimal places)')
  }

  for (const key of IT_EXPENSE_KEYS) {
    const value = body.expenses?.[key]
    if (value !== undefined && !isMoneyAmount(value)) {
      missing.push(`expenses.${key} (at most 2 decimal places)`)
    }
  }
  if (body.consolidatedExpenses !== undefined && !isMoneyAmount(body.consolidatedExpenses)) {
    missing.push('consolidatedExpenses (at most 2 decimal places)')
  }

  // Not just `!body.browser`: buildFraudHeaders indexes into browser.screens and
  // browser.windowSize outside any try/catch, so `{}` passed this check and then
  // crashed the route with an untyped 500.
  missing.push(...invalidBrowserFields(body.browser))
  return missing
}

/**
 * Cross-field rules that only make sense once the individual fields are valid.
 * Kept separate from `missingItFields` for the same reason `arithmeticErrors`
 * is separate on the VAT side: these are statements about the return as a
 * whole, and reporting them alongside "this field is missing" reads as noise.
 */
export function itPeriodErrors(body: ItReturnBody): string[] {
  const errors: string[] = []

  // String comparison is safe and exact for zero-padded ISO dates, and avoids
  // constructing a Date only to compare it.
  if (body.periodEndDate < body.periodStartDate) {
    errors.push(
      `periodEndDate (${body.periodEndDate}) must not be before periodStartDate (${body.periodStartDate})`,
    )
  }

  const detailed = body.expenses
    ? IT_EXPENSE_KEYS.filter((k) => body.expenses?.[k] !== undefined)
    : []
  if (detailed.length > 0 && body.consolidatedExpenses !== undefined) {
    errors.push(
      'Provide either consolidatedExpenses or detailed expenses, not both ' +
        `(detailed: ${detailed.join(', ')})`,
    )
  }

  return errors
}
