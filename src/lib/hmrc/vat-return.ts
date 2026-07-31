/**
 * MTD-VAT nine-box return: shape and arithmetic validation.
 *
 * Lives outside the route handler so it can be unit-tested — a Next.js
 * `route.ts` may only export HTTP methods and segment config, so anything the
 * tests need to reach has to sit in a module like this one.
 */

import { invalidBrowserFields, type BrowserFraudData } from './fraud-headers'

export type VatReturnBody = {
  vrn: string
  periodKey: string // 4 alphanumeric chars, may include '#'
  vatDueSales: number
  vatDueAcquisitions: number
  totalVatDue: number
  vatReclaimedCurrPeriod: number
  netVatDue: number
  totalValueSalesExVAT: number
  totalValuePurchasesExVAT: number
  totalValueGoodsSuppliedExVAT: number
  totalAcquisitionsExVAT: number
  finalised: boolean
  browser: BrowserFraudData
  govTestScenario?: string
}

export const REQUIRED_NUMERIC_KEYS = [
  'vatDueSales',
  'vatDueAcquisitions',
  'totalVatDue',
  'vatReclaimedCurrPeriod',
  'netVatDue',
  'totalValueSalesExVAT',
  'totalValuePurchasesExVAT',
  'totalValueGoodsSuppliedExVAT',
  'totalAcquisitionsExVAT',
] as const

/** Field-level checks. Returns the names of everything missing or unusable. */
export function missingVatFields(body: Partial<VatReturnBody>): string[] {
  const missing: string[] = []
  if (!body.vrn) missing.push('vrn')
  if (!body.periodKey) missing.push('periodKey')
  for (const k of REQUIRED_NUMERIC_KEYS) {
    // `typeof NaN === 'number'`, so a type check alone lets NaN and ±Infinity
    // through. That matters here because every comparison against NaN is false,
    // so the arithmetic invariants below pass it too, and JSON.stringify turns
    // both into `null` — HMRC would receive a nine-box return with null money
    // fields that we had declared valid. Require a real finite number.
    if (!Number.isFinite(body[k])) missing.push(k)
  }
  if (typeof body.finalised !== 'boolean') missing.push('finalised')
  // Not just `!body.browser`: buildFraudHeaders indexes into browser.screens and
  // browser.windowSize outside any try/catch, so `{}` passed this check and then
  // crashed the route with an untyped 500.
  missing.push(...invalidBrowserFields(body.browser))
  return missing
}

// HMRC's spec requires:
//   totalVatDue       = vatDueSales + vatDueAcquisitions
//   netVatDue         = | totalVatDue - vatReclaimedCurrPeriod |
// We fail fast with a clear message rather than letting HMRC return
// VAT_TOTAL_VALUE / VAT_NET_VALUE, which is the same outcome but slower.
export function arithmeticErrors(body: VatReturnBody): string[] {
  const errors: string[] = []
  const tolerance = 0.005 // monetary fields have 2 dp precision; tolerate sub-penny rounding
  const expectedTotal = body.vatDueSales + body.vatDueAcquisitions
  if (Math.abs(body.totalVatDue - expectedTotal) > tolerance) {
    errors.push(
      `totalVatDue (${body.totalVatDue}) must equal vatDueSales + vatDueAcquisitions (${expectedTotal})`,
    )
  }
  const expectedNet = Math.abs(body.totalVatDue - body.vatReclaimedCurrPeriod)
  if (Math.abs(body.netVatDue - expectedNet) > tolerance) {
    errors.push(
      `netVatDue (${body.netVatDue}) must equal |totalVatDue - vatReclaimedCurrPeriod| (${expectedNet})`,
    )
  }
  return errors
}
