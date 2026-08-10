/**
 * Expense-filter predicates (TST-8). These decide which of a user's expenses
 * are visible — and therefore which rows feed the totals on the tracker. They
 * lived un-testable inside FilterBar.tsx at 0 % until the extraction.
 */

import { describe, it, expect } from 'vitest'
import { matchesRange, matchesCategories, matchesQuery, emptyFilter } from '../filter'

describe('matchesRange', () => {
  it('matches everything for the all range and exactly the month for a month range', () => {
    // If this fails, the month picker shows expenses from the wrong month and
    // the monthly totals are wrong.
    expect(matchesRange('2026-04-06', { kind: 'all' })).toBe(true)
    expect(matchesRange('2026-04-30', { kind: 'month', ym: '2026-04' })).toBe(true)
    expect(matchesRange('2026-05-01', { kind: 'month', ym: '2026-04' })).toBe(false)
  })

  it('treats a custom range as inclusive at both ends', () => {
    // If this fails, expenses dated exactly on a tax-year boundary (06 Apr /
    // 05 Apr) drop out of the filtered view.
    const range = { kind: 'custom' as const, from: '2026-04-06', to: '2027-04-05' }
    expect(matchesRange('2026-04-06', range)).toBe(true)
    expect(matchesRange('2027-04-05', range)).toBe(true)
    expect(matchesRange('2026-04-05', range)).toBe(false)
    expect(matchesRange('2027-04-06', range)).toBe(false)
  })
})

describe('matchesCategories', () => {
  it('matches all categories when none are selected, otherwise only the selected ones', () => {
    // If this fails, category filtering silently hides (or leaks) expenses.
    expect(matchesCategories('Travel & Transport', [])).toBe(true)
    expect(matchesCategories('Travel & Transport', ['Travel & Transport'])).toBe(true)
    expect(matchesCategories('Meals', ['Travel & Transport'])).toBe(false)
  })
})

describe('matchesQuery', () => {
  it('is case-insensitive, trims the query, and treats empty as match-all', () => {
    // If this fails, searching for an expense the user knows exists returns
    // nothing.
    expect(matchesQuery('Train to Leeds Travel', '  LEEDS ')).toBe(true)
    expect(matchesQuery('Train to Leeds Travel', '')).toBe(true)
    expect(matchesQuery('Train to Leeds Travel', 'coffee')).toBe(false)
  })
})

describe('emptyFilter', () => {
  it('starts fully open: all dates, all categories, no query', () => {
    // If this fails, the tracker mounts with some expenses already hidden.
    const f = emptyFilter()
    expect(matchesRange('1999-01-01', f.range)).toBe(true)
    expect(matchesCategories('anything', f.categories)).toBe(true)
    expect(matchesQuery('anything', f.query)).toBe(true)
  })
})
