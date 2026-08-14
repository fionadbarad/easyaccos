/**
 * MTD-VAT derived boxes.
 *
 * Two of the nine boxes are not user input. HMRC defines them as functions of
 * the boxes around them:
 *
 *   box 3 (totalVatDue) = box 1 (vatDueSales) + box 2 (vatDueAcquisitions)
 *   box 5 (netVatDue)   = | box 3 − box 4 (vatReclaimedCurrPeriod) |
 *
 * Box 5 is an ABSOLUTE value. A repayment return — one where reclaimed input
 * VAT exceeds the VAT due — is filed with a POSITIVE figure in box 5, not a
 * negative one. The direction of the payment is implied by boxes 3 and 4, not
 * by the sign of box 5, and filing it negative earns an opaque VAT_NET_VALUE
 * rejection from HMRC.
 *
 * The server re-derives both identities in `arithmeticErrors`
 * (src/lib/hmrc/vat-return.ts) with a 0.005 tolerance and refuses the
 * submission if they disagree. This module exists so the UI computes exactly
 * what the server will check, instead of asking the user to do the arithmetic
 * by hand and then failing them for a penny.
 */

import { round2 } from '@/lib/tax-logic'

export type VatBoxInput = {
  /** Box 1 — VAT due on sales and other outputs. */
  vatDueSales: number
  /** Box 2 — VAT due on acquisitions from EU member states. */
  vatDueAcquisitions: number
  /** Box 4 — VAT reclaimed on purchases and other inputs. */
  vatReclaimedCurrPeriod: number
}

export type DerivedVatBoxes = {
  /** Box 3 — total VAT due. */
  totalVatDue: number
  /** Box 5 — net VAT to pay or reclaim, always non-negative. */
  netVatDue: number
}

/**
 * Derive boxes 3 and 5 from the boxes the user actually fills in.
 *
 * Pure, and rounded to the two decimal places HMRC's money fields allow, so
 * the result can be sent as-is.
 */
export function deriveVatBoxes(input: VatBoxInput): DerivedVatBoxes {
  const totalVatDue = round2(input.vatDueSales + input.vatDueAcquisitions)

  // Derived from the ROUNDED box 3 rather than the raw sum. Box 3 is the figure
  // that gets filed, and the server checks box 5 against the filed box 3 — so
  // deriving box 5 from an unrounded intermediate can leave the two a penny
  // apart and fail a return that is otherwise correct.
  const netVatDue = round2(Math.abs(totalVatDue - input.vatReclaimedCurrPeriod))

  return { totalVatDue, netVatDue }
}
