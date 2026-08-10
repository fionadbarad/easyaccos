/**
 * Pure expense-filter predicates. Extracted from FilterBar.tsx (TST-8) so the
 * matching logic useExpenses runs over a user's records is testable without
 * touching React.
 */

export type DateRange =
  | { kind: 'all' }
  | { kind: 'month'; ym: string } // "2026-04"
  | { kind: 'custom'; from: string; to: string }

export type FilterState = {
  range: DateRange
  categories: string[] // empty = all
  query: string
}

export function emptyFilter(): FilterState {
  return { range: { kind: 'all' }, categories: [], query: '' }
}

/** Inclusive date-range test against an ISO "YYYY-MM-DD" string. */
export function matchesRange(dateStr: string, range: DateRange): boolean {
  if (range.kind === 'all') return true
  if (range.kind === 'month') return dateStr.startsWith(range.ym)
  return dateStr >= range.from && dateStr <= range.to
}

export function matchesCategories(cat: string, selected: string[]): boolean {
  return selected.length === 0 || selected.includes(cat)
}

export function matchesQuery(haystack: string, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return haystack.toLowerCase().includes(q)
}
