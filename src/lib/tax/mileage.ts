/**
 * Mileage claims under the Approved Mileage Allowance Payments scheme.
 *
 * This is tax logic, and until now it lived inside a 970-line React page
 * component: the rates, the banding, and the tax-year arithmetic that decides
 * which band applies. None of it was reachable from a test, so the only way to
 * check a claim figure was to open the page in a browser and read it — which is
 * how the threshold bug below survived as long as it did.
 *
 * Nothing here touches React, storage or the DOM. It takes numbers and dates
 * and returns numbers.
 */

import {
  AMAP_CAR_FIRST,
  AMAP_CAR_EXCESS,
  AMAP_MOTORCYCLE,
  AMAP_BICYCLE,
  AMAP_CAR_THRESHOLD,
} from './bands-2026'

export type VehicleType = 'car' | 'motorcycle' | 'bike'

/**
 * The claim for one journey, given how many car miles the same tax year has
 * already used.
 *
 * `milesBefore` only matters for cars: motorcycle and bicycle rates are flat,
 * with no threshold. Passing the running total for the wrong period is the
 * whole risk here — see `taxYearOf`.
 */
export function calcMileageClaim(vehicle: VehicleType, milesBefore: number, miles: number): number {
  if (vehicle === 'bike') return miles * AMAP_BICYCLE
  if (vehicle === 'motorcycle') return miles * AMAP_MOTORCYCLE

  const remainingAtHighRate = Math.max(0, AMAP_CAR_THRESHOLD - milesBefore)
  const firstBand = Math.max(0, Math.min(miles, remainingAtHighRate))
  const excessBand = miles - firstBand
  return firstBand * AMAP_CAR_FIRST + excessBand * AMAP_CAR_EXCESS
}

/**
 * The UK tax year a date falls in, identified by its starting calendar year.
 * 2026-04-05 → 2025 (the 2025/26 year); 2026-04-06 → 2026 (2026/27).
 *
 * The 10,000-mile AMAP threshold is a PER TAX YEAR allowance, and it is the
 * only thing standing between the 55p and 25p rates. Accumulating car miles
 * across every entry ever logged — which is what the page did — pushed anyone
 * with history into the 25p band on their first journey of a new year and
 * under-claimed the difference (£300 per 1,000 miles) for the rest of it.
 *
 * Returns NaN for an unparseable date rather than guessing a year, so a bad
 * entry cannot quietly land in the current one.
 */
export function taxYearOf(dateStr: string): number {
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return NaN
  const year = d.getUTCFullYear()
  const month = d.getUTCMonth() // 0-based; April = 3
  const day = d.getUTCDate()
  return month > 3 || (month === 3 && day >= 6) ? year : year - 1
}

/** 2026 → "2026/27". */
export function taxYearLabel(startYear: number): string {
  return `${startYear}/${String((startYear + 1) % 100).padStart(2, '0')}`
}
