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
