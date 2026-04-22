// Shared constants, formatters, and the input style token used across the
// Tracker feature. Kept framework-agnostic so aggregates.ts can import freely.

export const TAX_YEAR_START = new Date('2026-04-06')
export const TAX_YEAR_END   = new Date('2027-04-05')
export const SA_DEADLINE    = new Date('2028-01-31')
export const TAX_YEAR_DAYS  = Math.ceil((TAX_YEAR_END.getTime() - TAX_YEAR_START.getTime()) / 86400000)

export function fmt(n: number): string {
  return '£' + Math.round(Math.abs(n)).toLocaleString('en-GB')
}

export function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n))
}

export function inTaxYear(dateStr: string): boolean {
  const d = new Date(dateStr)
  return d >= TAX_YEAR_START && d <= TAX_YEAR_END
}
