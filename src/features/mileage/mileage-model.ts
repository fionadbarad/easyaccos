/**
 * Everything the mileage page computes, with no React in it.
 *
 * The page was 965 lines of fetching, arithmetic and JSX in one file, and the
 * arithmetic was the part that mattered: which tax year a journey lands in,
 * how much of this year's 10,000-mile car allowance it has already used, and
 * therefore whether it prices at the first-band or the excess rate. None of it
 * was reachable from a test — the same reason the per-tax-year threshold bug
 * documented in lib/tax/mileage.ts survived as long as it did.
 *
 * `calcMileageClaim`, `taxYearOf` and `taxYearLabel` stay in lib/tax/mileage.ts
 * — that is the tax engine. This file is the aggregation over a list of
 * entries, which is what the page was actually doing by hand.
 *
 * NO RATES OR THRESHOLDS ARE WRITTEN HERE. Everything traces back to
 * bands-2026.ts; see hard rule 1 in CLAUDE.md.
 */

import { AMAP_CAR_THRESHOLD } from '@/lib/tax/bands-2026'
import { calcMileageClaim, taxYearOf, type VehicleType } from '@/lib/tax/mileage'

export interface MileageEntry {
  id: string
  date: string
  description: string
  vehicle: VehicleType
  miles: number
  createdAt: string
}

export const VEHICLE_LABELS: Record<VehicleType, string> = {
  car: 'Car / Van',
  motorcycle: 'Motorcycle',
  bike: 'Bicycle',
}

/** A journey with the claim it earns, priced against its own tax year. */
export interface PricedEntry {
  entry: MileageEntry
  claimAmount: number
}

export interface MileageSummary {
  /** Every journey, oldest first, each with its claim. */
  priced: PricedEntry[]
  /** Miles driven in the reported tax year, all vehicles. */
  totalMiles: number
  /** Claim earned in the reported tax year. */
  totalClaim: number
  /** Car miles used against the reported year's threshold. */
  carMiles: number
  /** Journeys shown in the table that fall outside the reported year. */
  priorYearCount: number
  /** Car miles as a percentage of the threshold, capped at 100. */
  thresholdPct: number
  /** Whether the threshold bar has anything to describe. */
  hasCarEntriesThisYear: boolean
  /** Whether the excess (lower) car rate is now in force. */
  atExcessRate: boolean
}

/**
 * Aggregate a list of journeys into everything the dashboard shows.
 *
 * The 10,000-mile car threshold is accumulated WITHIN each entry's own tax
 * year, because the allowance resets every 6 April. Accumulating across every
 * entry ever logged pushed anyone with history into the excess band on their
 * first journey of a new year. Headline figures cover the reported year only —
 * that is what goes on this year's return — while the table still lists every
 * journey, each priced against its own year's threshold.
 *
 * Entries are sorted here rather than by the caller: the running total is
 * order-dependent, so a caller passing them unsorted would silently price the
 * bands wrong.
 */
export function summariseMileage(
  entries: readonly MileageEntry[],
  reportedTaxYear: number,
): MileageSummary {
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date))

  const priced: PricedEntry[] = []
  // Running car miles per tax year, so each year gets its own fresh allowance.
  const carMilesByYear = new Map<number, number>()
  let totalMiles = 0
  let totalClaim = 0
  let priorYearCount = 0
  let hasCarEntriesThisYear = false

  for (const entry of sorted) {
    const year = taxYearOf(entry.date)
    const isCar = entry.vehicle === 'car'
    const milesBefore = isCar ? (carMilesByYear.get(year) ?? 0) : 0
    // push, not [...acc, x] in a reduce — the spread rebuilt the whole array on
    // every entry, making the pass quadratic in the number of journeys.
    priced.push({ entry, claimAmount: calcMileageClaim(entry.vehicle, milesBefore, entry.miles) })

    if (isCar) carMilesByYear.set(year, milesBefore + entry.miles)

    if (year === reportedTaxYear) {
      totalMiles += entry.miles
      totalClaim += priced[priced.length - 1]!.claimAmount
      if (isCar) hasCarEntriesThisYear = true
    } else {
      priorYearCount += 1
    }
  }

  const carMiles = carMilesByYear.get(reportedTaxYear) ?? 0

  return {
    priced,
    totalMiles,
    totalClaim,
    carMiles,
    priorYearCount,
    thresholdPct: Math.min(100, (carMiles / AMAP_CAR_THRESHOLD) * 100),
    hasCarEntriesThisYear,
    atExcessRate: carMiles >= AMAP_CAR_THRESHOLD,
  }
}

/**
 * Car miles already logged in the tax year a *prospective* journey falls in.
 *
 * The add-journey preview must price against the year the user picked in the
 * date field, not against the current year's running total — back-dating a
 * journey into last year would otherwise quote the wrong band. Non-car
 * vehicles have no threshold, so the answer is always 0.
 */
export function carMilesBeforeFor(
  entries: readonly MileageEntry[],
  vehicle: VehicleType,
  date: string,
): number {
  if (vehicle !== 'car') return 0
  const year = taxYearOf(date)
  return entries
    .filter((e) => e.vehicle === 'car' && taxYearOf(e.date) === year)
    .reduce((sum, e) => sum + e.miles, 0)
}

/** Whether the add-journey form holds enough to save. */
export function isJourneyValid(description: string, miles: string): boolean {
  const m = parseFloat(miles)
  return description.trim().length > 0 && !Number.isNaN(m) && m > 0
}

// ── Display helpers ───────────────────────────────────────────────────────

export function formatMiles(m: number): string {
  return m.toLocaleString('en-GB', { maximumFractionDigits: 1 })
}

/**
 * 0.55 → "55p". Every rate shown to the user is rendered through this, so the
 * copy cannot say 55p while the calculation uses something else.
 */
export function pence(rate: number): string {
  return `${Math.round(rate * 100)}p`
}

/** 0.2 → "20%". Same reason. */
export function pct(rate: number): string {
  return `${Math.round(rate * 100)}%`
}
