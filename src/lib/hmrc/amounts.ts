/**
 * Monetary validation shared by both MTD submission routes.
 *
 * HMRC defines every money field in the VAT and Self Assessment APIs as a
 * decimal with at most two places. Both routes already required a finite number
 * — which stops NaN and ±Infinity reaching HMRC as `null` — but nothing stopped
 * a third decimal place.
 *
 * That gap is reachable from ordinary use rather than only from a hostile
 * caller: a currency conversion, a split of a bill three ways, or a percentage
 * of a total all produce values like 123.456. The submission would be accepted
 * by us and then either rejected by HMRC with an opaque code, or silently
 * rounded by them to a figure that no longer matches the user's own records.
 */

/** Finite, and no more than two decimal places. */
export function isMoneyAmount(value: unknown): value is number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return false
  // Scale through the number's own decimal string rather than multiplying:
  // 1.005 * 100 is 100.49999999999999 in binary floating point, which would
  // fail a valid amount. Same reasoning as round2 in lib/tax-logic.ts.
  const scaled = Number(`${value}e2`)
  return Number.isInteger(scaled)
}

/**
 * Deliberately NOT enforced here: a non-negative rule.
 *
 * It is tempting, and the draft this was ported from had it, but HMRC's VAT
 * boxes accept negative figures in real cases — credit adjustments and
 * corrections among them. Rejecting those would turn a validation improvement
 * into a class of return this software refuses to file. If a specific box is
 * genuinely non-negative per the spec, constrain that box, not every amount.
 */
