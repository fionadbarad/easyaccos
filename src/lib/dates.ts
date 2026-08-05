/**
 * Calendar-date helpers.
 *
 * Every date this app stores is a DATE, not an instant: the day an expense was
 * incurred, an invoice was raised, a journey was driven. They are held as
 * 'YYYY-MM-DD' strings. Two habits were quietly corrupting them.
 *
 * 1. `new Date().toISOString().slice(0, 10)` as "today". That is the date in
 *    UTC. The UK is on BST — UTC+1 — from late March to late October, so
 *    between 00:00 and 01:00 local, UTC is still on the previous day. An
 *    expense logged at 00:30 on 6 April 2026 was stored as 2026-04-05: the last
 *    day of the OLD tax year. The user picked nothing; the default was wrong.
 *
 * 2. `new Date('2026-04-06').getMonth()` to read a stored string back. The
 *    string parses as UTC midnight, and local getters then shift it in any
 *    timezone behind UTC. Harmless for a UK-resident user on UK time, but it
 *    put the same date in two different months depending on which module asked.
 *
 * The rules here:
 *
 *   - "today" comes from the LOCAL clock, because the user's wall clock is the
 *     UK date they mean. Never from toISOString().
 *   - a stored 'YYYY-MM-DD' is read by SLICING THE STRING. No Date object is
 *     constructed, so no timezone can be applied to it. This is the same idiom
 *     `isToday` already used — string equality — generalised.
 *
 * `taxYearOf` stays in lib/tax/mileage.ts. It reads UTC parts of a parsed date,
 * which is correct for a UTC-midnight string, and it is well covered.
 */

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

/**
 * Today as 'YYYY-MM-DD' on the local (UK) calendar.
 *
 * This is the default date offered when a user creates an expense, invoice,
 * journey or transaction, so it has to be the date they would write on paper.
 */
export function todayISO(now: Date = new Date()): string {
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`
}

/** The current month as 'YYYY-MM' on the local (UK) calendar. */
export function currentMonthKey(now: Date = new Date()): string {
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}`
}

/**
 * The 'YYYY-MM' bucket a stored date belongs to, by string, or null if the
 * value is not a plain date-only string.
 *
 * Null rather than a guess: a malformed date must be skipped by the caller, not
 * silently filed under whatever month a partial parse produced.
 */
export function monthKeyOf(dateStr: string): string | null {
  return DATE_ONLY.test(dateStr) ? dateStr.slice(0, 7) : null
}

/**
 * Year and 0-based month index of a stored date, for sorting and month labels.
 * Null on anything that is not a date-only string.
 */
export function ymOf(dateStr: string): { year: number; monthIdx: number } | null {
  const m = DATE_ONLY.exec(dateStr)
  if (!m) return null
  const year = Number(m[1])
  const month = Number(m[2])
  if (month < 1 || month > 12) return null
  return { year, monthIdx: month - 1 }
}

/** True when a stored date falls in the same local-calendar month as `now`. */
export function isInCurrentMonth(dateStr: string, now: Date = new Date()): boolean {
  return monthKeyOf(dateStr) === currentMonthKey(now)
}
