// Mileage claim calculation — HMRC approved-rate logic, kept free of React so
// it stays unit-testable and the page component stays presentational.

import {
  CAR_THRESHOLD,
  RATE_BIKE,
  RATE_CAR_EXCESS,
  RATE_CAR_FIRST,
  RATE_MOTORCYCLE,
  type MileageEntry,
  type VehicleType,
} from './types'

export function calcRate(vehicle: VehicleType, milesBefore: number, miles: number): number {
  if (vehicle === 'bike') return miles * RATE_BIKE
  if (vehicle === 'motorcycle') return miles * RATE_MOTORCYCLE
  // Car: split at the 10,000-mile threshold (45p then 25p).
  const firstBand = Math.max(0, Math.min(miles, Math.max(0, CAR_THRESHOLD - milesBefore)))
  const excessBand = miles - firstBand
  return firstBand * RATE_CAR_FIRST + excessBand * RATE_CAR_EXCESS
}

export function today(): string {
  return new Date().toISOString().slice(0, 10)
}

export function formatMiles(m: number): string {
  return m.toLocaleString('en-GB', { maximumFractionDigits: 1 })
}

export interface MileageTotals {
  enriched: Array<{ entry: MileageEntry; claimAmount: number }>
  totalMiles: number
  totalClaim: number
  carMiles: number
}

// Walk entries in chronological order, accumulating car miles so the 10k
// threshold split is applied across journeys, not per-journey.
export function computeTotals(sorted: MileageEntry[]): MileageTotals {
  return sorted.reduce<MileageTotals>(
    (acc, entry) => {
      const milesBefore = entry.vehicle === 'car' ? acc.carMiles : 0
      const claim = calcRate(entry.vehicle, milesBefore, entry.miles)
      return {
        enriched: [...acc.enriched, { entry, claimAmount: claim }],
        totalMiles: acc.totalMiles + entry.miles,
        totalClaim: acc.totalClaim + claim,
        carMiles: entry.vehicle === 'car' ? acc.carMiles + entry.miles : acc.carMiles,
      }
    },
    { enriched: [], totalMiles: 0, totalClaim: 0, carMiles: 0 },
  )
}
