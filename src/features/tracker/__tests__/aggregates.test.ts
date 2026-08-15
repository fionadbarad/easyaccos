// Unit tests for tracker aggregation math. Date-dependent functions are pinned
// to a fixed `now` so results are deterministic regardless of when CI runs.

import { describe, expect, test } from 'vitest'
import {
  daysElapsedAt,
  yearProgressAt,
  monthsElapsedAt,
  daysToDeadlineAt,
  yearlyIncome,
  yearlyExpenses,
  projectAnnual,
  potShortfall,
  monthlyNeededToClose,
  visibleTransactions,
  txTotals,
} from '../aggregates'
import { SA_DEADLINE, TAX_YEAR_DAYS } from '../shared'

// 2026/27 tax year: 6 Apr 2026 → 5 Apr 2027

describe('daysElapsedAt / yearProgressAt / monthsElapsedAt', () => {
  test('before tax year start clamps to 0', () => {
    const before = new Date('2026-01-01')
    expect(daysElapsedAt(before)).toBe(0)
    expect(yearProgressAt(before)).toBe(0)
    expect(monthsElapsedAt(before)).toBe(0)
  })

  test('after tax year end clamps to full year', () => {
    const after = new Date('2028-01-01')
    expect(daysElapsedAt(after)).toBe(TAX_YEAR_DAYS)
    expect(yearProgressAt(after)).toBe(1)
    expect(monthsElapsedAt(after)).toBeCloseTo(12, 0)
  })

  test('halfway-ish point returns non-degenerate values', () => {
    const mid = new Date('2026-10-06') // ~6 months in
    expect(daysElapsedAt(mid)).toBeGreaterThan(170)
    expect(daysElapsedAt(mid)).toBeLessThan(200)
    expect(yearProgressAt(mid)).toBeGreaterThan(0.45)
    expect(yearProgressAt(mid)).toBeLessThan(0.55)
    expect(monthsElapsedAt(mid)).toBeGreaterThan(5.5)
    expect(monthsElapsedAt(mid)).toBeLessThan(6.5)
  })
})

describe('daysToDeadlineAt', () => {
  test('counts down to SA deadline', () => {
    const now = new Date('2028-01-01')
    expect(daysToDeadlineAt(SA_DEADLINE, now)).toBe(30)
  })

  test('past deadline clamps to 0', () => {
    expect(daysToDeadlineAt(SA_DEADLINE, new Date('2028-03-01'))).toBe(0)
  })
})

describe('yearlyIncome', () => {
  test('sums only in-year income-type transactions', () => {
    const txs = [
      { date: '2026-05-01', type: 'income', amount: 1000 },
      { date: '2026-05-02', type: 'expense', amount: 500 }, // wrong type
      { date: '2025-12-01', type: 'income', amount: 9999 }, // out of year
      { date: '2026-11-30', type: 'income', amount: 2000 },
    ]
    expect(yearlyIncome(txs)).toBe(3000)
  })

  test('empty input returns 0', () => {
    expect(yearlyIncome([])).toBe(0)
  })
})

describe('yearlyExpenses', () => {
  test('sums only in-year expenses', () => {
    const exp = [
      { date: '2026-04-10', amount: 200 },
      { date: '2025-01-01', amount: 5000 }, // out of year
      { date: '2027-03-01', amount: 300 },
    ]
    expect(yearlyExpenses(exp)).toBe(500)
  })
})

describe('projectAnnual', () => {
  test('linear projection scales partial year to 12 months', () => {
    expect(projectAnnual(6_000, 6)).toBe(12_000)
    expect(projectAnnual(1_000, 3)).toBe(4_000)
  })

  test('zero months returns 0 (avoid div-by-zero)', () => {
    expect(projectAnnual(5_000, 0)).toBe(0)
  })
})

describe('potShortfall + monthlyNeededToClose', () => {
  test('positive gap = need more', () => {
    expect(potShortfall(10_000, 3_000)).toBe(7_000)
  })

  test('negative gap = surplus', () => {
    expect(potShortfall(5_000, 6_000)).toBe(-1_000)
  })

  test('monthly split rounds to nearest pound', () => {
    expect(monthlyNeededToClose(7_000, 7)).toBe(1_000)
    expect(monthlyNeededToClose(1_000, 3)).toBe(333)
  })

  test("zero months remaining returns 0 (don't divide by zero)", () => {
    expect(monthlyNeededToClose(500, 0)).toBe(0)
  })
})

// ── Transaction list filtering and totals ──────────────────────────────────
// Lifted out of the transactions page, where the filter and the totals it
// feeds were only reachable by rendering the page.

const TODAY = '2026-08-14'

const t = (date: string, type: string, amount: number) => ({ date, type, amount })

const LEDGER = [
  t('2026-08-14', 'income', 1_000), // today
  t('2026-08-02', 'expense', 250), // this month
  t('2026-07-30', 'income', 500), // last month
  t('2026-06-15', 'expense', 125),
]

describe('visibleTransactions', () => {
  test('returns everything, newest first, with no filters', () => {
    const rows = visibleTransactions(LEDGER, { type: 'all', date: 'all' }, TODAY)
    expect(rows.map((r) => r.date)).toEqual([
      '2026-08-14',
      '2026-08-02',
      '2026-07-30',
      '2026-06-15',
    ])
  })

  test('filters by type', () => {
    const rows = visibleTransactions(LEDGER, { type: 'income', date: 'all' }, TODAY)
    expect(rows).toHaveLength(2)
    expect(rows.every((r) => r.type === 'income')).toBe(true)
  })

  test('filters to today', () => {
    const rows = visibleTransactions(LEDGER, { type: 'all', date: 'today' }, TODAY)
    expect(rows.map((r) => r.date)).toEqual(['2026-08-14'])
  })

  test('filters to the current month, not the last 30 days', () => {
    // 30 July is within 30 days of 14 August but is not this month. Treating
    // "this month" as a rolling window would put it in the total.
    const rows = visibleTransactions(LEDGER, { type: 'all', date: 'month' }, TODAY)
    expect(rows.map((r) => r.date)).toEqual(['2026-08-14', '2026-08-02'])
  })

  test('filters to an inclusive custom range', () => {
    const rows = visibleTransactions(
      LEDGER,
      { type: 'all', date: 'custom', from: '2026-07-30', to: '2026-08-02' },
      TODAY,
    )
    // Both endpoints are in — a range that excluded them would silently drop
    // the day a user picked.
    expect(rows.map((r) => r.date)).toEqual(['2026-08-02', '2026-07-30'])
  })

  test('an incomplete custom range filters nothing rather than everything', () => {
    // Mid-way through picking two dates. Blanking the list reads as "no
    // results" when the real state is "keep going".
    const rows = visibleTransactions(
      LEDGER,
      { type: 'all', date: 'custom', from: '2026-07-30' },
      TODAY,
    )
    expect(rows).toHaveLength(LEDGER.length)
  })

  test('combines a type and a date filter', () => {
    const rows = visibleTransactions(LEDGER, { type: 'expense', date: 'month' }, TODAY)
    expect(rows.map((r) => r.date)).toEqual(['2026-08-02'])
  })

  test('does not mutate the input order', () => {
    const input = [...LEDGER]
    visibleTransactions(input, { type: 'all', date: 'all' }, TODAY)
    expect(input).toEqual(LEDGER)
  })

  test('handles an empty ledger', () => {
    expect(visibleTransactions([], { type: 'all', date: 'all' }, TODAY)).toEqual([])
  })
})

describe('txTotals', () => {
  test('sums money in and out and nets them', () => {
    expect(txTotals(LEDGER)).toEqual({ totalIn: 1_500, totalOut: 375, net: 1_125 })
  })

  test('ignores rows that are neither income nor expense', () => {
    // A future type must not silently land in one of the two buckets.
    expect(txTotals([...LEDGER, t('2026-08-10', 'transfer', 9_999)])).toEqual({
      totalIn: 1_500,
      totalOut: 375,
      net: 1_125,
    })
  })

  test('goes negative when spending exceeds income', () => {
    expect(txTotals([t('2026-08-01', 'expense', 100)]).net).toBe(-100)
  })

  test('is zero for an empty list', () => {
    expect(txTotals([])).toEqual({ totalIn: 0, totalOut: 0, net: 0 })
  })

  test('totals the filtered list, which is what the page shows', () => {
    // The figures on screen describe what is visible, not the whole ledger.
    const visible = visibleTransactions(LEDGER, { type: 'all', date: 'month' }, TODAY)
    expect(txTotals(visible)).toEqual({ totalIn: 1_000, totalOut: 250, net: 750 })
  })
})
