/**
 * AMAP mileage claims.
 *
 * None of this could be tested before: the rates, the banding and the tax-year
 * arithmetic all lived inside a 970-line page component, so the only way to
 * check a claim figure was to open a browser and read it.
 *
 * The banding is where the money is. A car's first 10,000 business miles in a
 * tax year claim at 55p and every mile after at 25p — a 30p gap, so getting the
 * boundary wrong costs £300 per 1,000 miles in the wrong direction.
 */

import { describe, it, expect } from 'vitest'
import { calcMileageClaim, taxYearOf, taxYearLabel } from '../tax/mileage'
import {
  AMAP_CAR_FIRST,
  AMAP_CAR_EXCESS,
  AMAP_MOTORCYCLE,
  AMAP_BICYCLE,
  AMAP_CAR_THRESHOLD,
} from '../tax/bands-2026'

describe('car mileage banding', () => {
  it('claims the high rate below the threshold', () => {
    expect(calcMileageClaim('car', 0, 100)).toBeCloseTo(100 * AMAP_CAR_FIRST, 6)
  })

  it('claims the low rate once the threshold is already used', () => {
    expect(calcMileageClaim('car', AMAP_CAR_THRESHOLD, 100)).toBeCloseTo(100 * AMAP_CAR_EXCESS, 6)
  })

  it('splits a journey that crosses the threshold', () => {
    // 200 miles starting 100 short of the threshold: 100 at 55p, 100 at 25p.
    const claim = calcMileageClaim('car', AMAP_CAR_THRESHOLD - 100, 200)
    expect(claim).toBeCloseTo(100 * AMAP_CAR_FIRST + 100 * AMAP_CAR_EXCESS, 6)
  })

  it('is continuous across the threshold', () => {
    // No cliff: the same total miles cost the same however they are chopped up.
    const oneGo = calcMileageClaim('car', 0, 12_000)
    const inParts =
      calcMileageClaim('car', 0, 6_000) +
      calcMileageClaim('car', 6_000, 4_000) +
      calcMileageClaim('car', 10_000, 2_000)
    expect(oneGo).toBeCloseTo(inParts, 6)
  })

  it('does not go negative when milesBefore already exceeds the threshold', () => {
    expect(calcMileageClaim('car', AMAP_CAR_THRESHOLD * 3, 50)).toBeCloseTo(50 * AMAP_CAR_EXCESS, 6)
  })

  it('claims nothing for a zero-mile journey', () => {
    expect(calcMileageClaim('car', 0, 0)).toBe(0)
  })
})

describe('flat-rate vehicles', () => {
  it('ignores the threshold for motorcycles', () => {
    expect(calcMileageClaim('motorcycle', 0, 500)).toBeCloseTo(500 * AMAP_MOTORCYCLE, 6)
    expect(calcMileageClaim('motorcycle', 50_000, 500)).toBeCloseTo(500 * AMAP_MOTORCYCLE, 6)
  })

  it('ignores the threshold for bicycles', () => {
    expect(calcMileageClaim('bike', 0, 500)).toBeCloseTo(500 * AMAP_BICYCLE, 6)
    expect(calcMileageClaim('bike', 50_000, 500)).toBeCloseTo(500 * AMAP_BICYCLE, 6)
  })
})

describe('taxYearOf', () => {
  it('puts 5 April in the closing year', () => {
    expect(taxYearOf('2026-04-05')).toBe(2025)
  })

  it('puts 6 April in the opening year', () => {
    expect(taxYearOf('2026-04-06')).toBe(2026)
  })

  it('handles January, which belongs to the previous April', () => {
    expect(taxYearOf('2027-01-15')).toBe(2026)
  })

  it('handles December', () => {
    expect(taxYearOf('2026-12-31')).toBe(2026)
  })

  it('returns NaN for an unparseable date rather than guessing', () => {
    // Guessing would quietly file a broken entry into the current year and let
    // its miles eat someone's 55p allowance.
    expect(taxYearOf('not-a-date')).toBeNaN()
    expect(taxYearOf('')).toBeNaN()
  })

  it('reads dates as UTC, so a late-evening entry does not slip a year', () => {
    expect(taxYearOf('2026-04-06T23:30:00Z')).toBe(2026)
    expect(taxYearOf('2026-04-05T23:30:00Z')).toBe(2025)
  })
})

describe('taxYearLabel', () => {
  it('formats the pair', () => {
    expect(taxYearLabel(2026)).toBe('2026/27')
    expect(taxYearLabel(2025)).toBe('2025/26')
  })

  it('pads across a century boundary', () => {
    expect(taxYearLabel(2099)).toBe('2099/00')
  })
})
