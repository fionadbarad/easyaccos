/**
 * The bug these lock down is narrow and expensive.
 *
 * `new Date().toISOString().slice(0, 10)` was the default date on new expenses,
 * invoices, journeys and transactions. During BST — most of the year — UTC is
 * an hour behind the UK, so anything entered between 00:00 and 01:00 local was
 * stored as the previous day. On the night of 5/6 April that moves a
 * transaction into the wrong TAX YEAR, which is the one date boundary in this
 * app that changes what a user owes.
 */

import { describe, it, expect } from 'vitest'
import { todayISO, currentMonthKey, monthKeyOf, ymOf, isInCurrentMonth } from '@/lib/dates'
import { taxYearOf } from '@/lib/tax/mileage'

describe('todayISO uses the wall clock, not UTC', () => {
  it('keeps the UK date for 00:30 BST on the first day of the tax year', () => {
    // 6 April 2026, 00:30 in London (BST, UTC+1). In UTC this instant is still
    // 5 April 2026 — the last day of 2025/26.
    const instant = new Date('2026-04-06T00:30:00+01:00')
    expect(instant.toISOString().slice(0, 10)).toBe('2026-04-05') // the old behaviour
    expect(todayISO(instant)).toBe('2026-04-06') // what the user's clock says
  })

  it('files that date in the tax year the user is actually in', () => {
    const instant = new Date('2026-04-06T00:30:00+01:00')
    expect(taxYearOf(instant.toISOString().slice(0, 10))).toBe(2025) // wrong year
    expect(taxYearOf(todayISO(instant))).toBe(2026) // right year
  })

  it('agrees with UTC outside the offset window', () => {
    // Midwinter, GMT: local and UTC are the same date all day.
    const instant = new Date('2026-01-15T00:30:00Z')
    expect(todayISO(instant)).toBe(instant.toISOString().slice(0, 10))
  })

  it('pads single-digit months and days', () => {
    expect(todayISO(new Date(2026, 0, 5, 12))).toBe('2026-01-05')
  })
})

describe('stored dates are read as strings, so no timezone can move them', () => {
  it('buckets by the month written in the string', () => {
    expect(monthKeyOf('2026-04-06')).toBe('2026-04')
    expect(monthKeyOf('2026-01-01')).toBe('2026-01')
    expect(monthKeyOf('2026-12-31')).toBe('2026-12')
  })

  it('returns null for anything that is not a plain date-only string', () => {
    for (const bad of ['', '2026-4-6', '06/04/2026', '2026-04-06T00:00:00Z', 'not a date']) {
      expect(monthKeyOf(bad), bad).toBeNull()
      expect(ymOf(bad), bad).toBeNull()
    }
  })

  it('rejects an impossible month rather than guessing one', () => {
    expect(ymOf('2026-13-01')).toBeNull()
    expect(ymOf('2026-00-01')).toBeNull()
  })

  it('gives a 0-based month index for labels and sorting', () => {
    expect(ymOf('2026-04-06')).toEqual({ year: 2026, monthIdx: 3 })
    expect(ymOf('2026-01-31')).toEqual({ year: 2026, monthIdx: 0 })
  })

  it('is stable where the old Date-based read was not', () => {
    // The first of a month is where a UTC-midnight parse read through local
    // getters slipped into the previous month. String slicing cannot.
    expect(monthKeyOf('2026-04-01')).toBe('2026-04')
    expect(monthKeyOf('2026-01-01')).toBe('2026-01')
  })
})

describe('isInCurrentMonth compares like with like', () => {
  const now = new Date(2026, 3, 15, 9) // 15 April 2026, local

  it('includes the first and last day of the month', () => {
    expect(isInCurrentMonth('2026-04-01', now)).toBe(true)
    expect(isInCurrentMonth('2026-04-30', now)).toBe(true)
  })

  it('excludes the neighbouring months', () => {
    expect(isInCurrentMonth('2026-03-31', now)).toBe(false)
    expect(isInCurrentMonth('2026-05-01', now)).toBe(false)
  })

  it('does not match the same month in another year', () => {
    expect(isInCurrentMonth('2025-04-15', now)).toBe(false)
  })

  it('is false for an unparseable date rather than throwing', () => {
    expect(isInCurrentMonth('rubbish', now)).toBe(false)
  })

  it('currentMonthKey follows the local clock', () => {
    expect(currentMonthKey(new Date('2026-04-01T00:30:00+01:00'))).toBe('2026-04')
  })
})
