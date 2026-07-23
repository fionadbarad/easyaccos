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

/** Projects a partial-year total to a full year. Returns 0 if no months elapsed. */
export function projectAnnual(partialTotal: number, monthsElapsed: number): number {
  return monthsElapsed > 0 ? (partialTotal / monthsElapsed) * 12 : 0
}

export function potShortfall(projectedBill: number, savedSoFar: number): number {
  return projectedBill - savedSoFar
}

export function monthlyNeededToClose(gap: number, monthsRemaining: number): number {
  return monthsRemaining > 0 ? Math.round(gap / monthsRemaining) : 0
}
