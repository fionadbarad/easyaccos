// Pure aggregation helpers for the year tracker. Everything here is a total
// function over dated records — no React, no state — so it's trivially unit-
// testable. The heavier tax arithmetic is delegated to calculateTax.

import { TAX_YEAR_DAYS, TAX_YEAR_START, clamp, inTaxYear } from './shared'

export interface DatedAmount {
  date: string
  amount: number
}
export interface TypedTx extends DatedAmount {
  type: string
}

export function daysElapsedAt(now: Date = new Date()): number {
  const raw = Math.ceil((now.getTime() - TAX_YEAR_START.getTime()) / 86400000)
  return clamp(raw, 0, TAX_YEAR_DAYS)
}

export function yearProgressAt(now: Date = new Date()): number {
  return clamp(daysElapsedAt(now) / TAX_YEAR_DAYS, 0, 1)
}

export function monthsElapsedAt(now: Date = new Date()): number {
  return clamp(daysElapsedAt(now) / 30.44, 0, 12)
}

export function daysToDeadlineAt(deadline: Date, now: Date = new Date()): number {
  return Math.max(0, Math.ceil((deadline.getTime() - now.getTime()) / 86400000))
}

export function yearlyIncome(transactions: TypedTx[]): number {
  return transactions
    .filter((t) => t.type === 'income' && inTaxYear(t.date))
    .reduce((s, t) => s + Number(t.amount), 0)
}

export function yearlyExpenses(expenses: DatedAmount[]): number {
  return expenses.filter((e) => inTaxYear(e.date)).reduce((s, e) => s + Number(e.amount), 0)
}

/**
 * Projects a partial-year total to a full year. Returns 0 if no months elapsed.
 *
 * The elapsed figure is floored at one month. `monthsElapsed` is days/30.44, so
 * on 8 April it is about 0.07 — dividing by that multiplies the year's first
 * few transactions by roughly 150, and the tracker would tell someone who had
 * logged one £3,000 invoice that they were on course for £450,000 and owed tax
 * to match. Annualising at 12× is the most aggressive honest reading of a
 * fortnight's data.
 */
export function projectAnnual(partialTotal: number, monthsElapsed: number): number {
  if (monthsElapsed <= 0) return 0
  return (partialTotal / Math.max(1, monthsElapsed)) * 12
}

export function potShortfall(projectedBill: number, savedSoFar: number): number {
  return projectedBill - savedSoFar
}

export function monthlyNeededToClose(gap: number, monthsRemaining: number): number {
  return monthsRemaining > 0 ? Math.round(gap / monthsRemaining) : 0
}

// ── Transaction list: filtering and totals ──────────────────────────────────
// Lifted out of the transactions page. The totals are what the user reads off
// the screen as money in and money out, and they are computed from the FILTERED
// list, not the whole ledger — so the filter and the totals are one behaviour
// and belong in one testable place.

export type TxDateFilter = 'all' | 'today' | 'month' | 'custom'

export interface TxFilter {
  type: string
  date: TxDateFilter
  from?: string
  to?: string
}

/**
 * Filter and sort the ledger for display, newest first.
 *
 * `today` is injected so the relative filters can be tested without stubbing
 * the clock. Dates are ISO strings throughout, which is what makes the custom
 * range a plain string comparison — lexicographic order on YYYY-MM-DD is
 * chronological order, with no Date parsing or timezone to get wrong.
 */
export function visibleTransactions<T extends TypedTx>(
  transactions: readonly T[],
  filter: TxFilter,
  today: string,
): T[] {
  return transactions
    .filter((t) => filter.type === 'all' || t.type === filter.type)
    .filter((t) => {
      if (filter.date === 'today') return t.date === today
      if (filter.date === 'month') return t.date.slice(0, 7) === today.slice(0, 7)
      // An incomplete custom range filters nothing rather than everything: the
      // user is mid-way through picking two dates, and blanking the list under
      // them reads as "no results" rather than "keep going".
      if (filter.date === 'custom' && filter.from && filter.to) {
        return t.date >= filter.from && t.date <= filter.to
      }
      return true
    })
    .sort((a, b) => b.date.localeCompare(a.date))
}

export interface TxTotals {
  totalIn: number
  totalOut: number
  net: number
}

/** Money in, money out, and the difference, over whatever list is passed. */
export function txTotals(transactions: readonly TypedTx[]): TxTotals {
  let totalIn = 0
  let totalOut = 0
  for (const t of transactions) {
    if (t.type === 'income') totalIn += Number(t.amount)
    else if (t.type === 'expense') totalOut += Number(t.amount)
  }
  return { totalIn, totalOut, net: totalIn - totalOut }
}
