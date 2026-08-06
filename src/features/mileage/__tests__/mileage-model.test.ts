/**
 * The mileage aggregation, tested without a browser.
 *
 * This is the arithmetic that used to live inside a 965-line page component,
 * where the only way to check a claim figure was to open the page and read it.
 * The cases that matter are the tax-year boundaries: the 10,000-mile car
 * allowance resets on 6 April, and accumulating across years silently
 * under-claims by the gap between the two car rates for the rest of the year.
 *
 * Rates are imported, never written as literals, so this file does not become
 * one more place a band has to be updated.
 */

import { describe, it, expect } from 'vitest'
import {
  AMAP_CAR_FIRST,
  AMAP_CAR_EXCESS,
  AMAP_MOTORCYCLE,
  AMAP_BICYCLE,
  AMAP_CAR_THRESHOLD,
} from '@/lib/tax/bands-2026'
import {
  summariseMileage,
  carMilesBeforeFor,
  isJourneyValid,
  formatMiles,
  pence,
  pct,
  type MileageEntry,
} from '../mileage-model'

let seq = 0
function entry(over: Partial<MileageEntry> = {}): MileageEntry {
  seq += 1
  return {
    id: `e${seq}`,
    date: '2026-06-01',
    description: 'Client visit',
    vehicle: 'car',
    miles: 100,
    createdAt: '2026-06-01T09:00:00.000Z',
    ...over,
  }
}

/** 2026/27 — the year that starts 6 April 2026. */
const YEAR = 2026

describe('summariseMileage', () => {
  it('reports nothing for no journeys', () => {
    const s = summariseMileage([], YEAR)
    expect(s.priced).toEqual([])
    expect(s.totalMiles).toBe(0)
    expect(s.totalClaim).toBe(0)
    expect(s.carMiles).toBe(0)
    expect(s.hasCarEntriesThisYear).toBe(false)
    expect(s.atExcessRate).toBe(false)
  })

  it('prices a single car journey at the first-band rate', () => {
    const s = summariseMileage([entry({ miles: 100 })], YEAR)
    expect(s.totalClaim).toBeCloseTo(100 * AMAP_CAR_FIRST, 10)
    expect(s.carMiles).toBe(100)
    expect(s.hasCarEntriesThisYear).toBe(true)
  })

  it('splits the journey that crosses the threshold across both rates', () => {
    const s = summariseMileage(
      [
        entry({ date: '2026-05-01', miles: AMAP_CAR_THRESHOLD - 100 }),
        entry({ date: '2026-06-01', miles: 300 }),
      ],
      YEAR,
    )
    // 100 miles remain at the first rate; the other 200 drop to the excess.
    const expected =
      (AMAP_CAR_THRESHOLD - 100) * AMAP_CAR_FIRST + 100 * AMAP_CAR_FIRST + 200 * AMAP_CAR_EXCESS
    expect(s.totalClaim).toBeCloseTo(expected, 8)
    expect(s.atExcessRate).toBe(true)
    expect(s.thresholdPct).toBe(100)
  })

  it('accumulates in date order regardless of the order supplied', () => {
    const chronological = [
      entry({ id: 'a', date: '2026-05-01', miles: AMAP_CAR_THRESHOLD }),
      entry({ id: 'b', date: '2026-06-01', miles: 100 }),
    ]
    const shuffled = [chronological[1]!, chronological[0]!]
    // The running total is order-dependent, so a caller handing them over
    // unsorted must not get a different answer.
    expect(summariseMileage(shuffled, YEAR).totalClaim).toBeCloseTo(
      summariseMileage(chronological, YEAR).totalClaim,
      10,
    )
    expect(summariseMileage(shuffled, YEAR).priced.map((p) => p.entry.id)).toEqual(['a', 'b'])
  })

  it('gives each tax year its own fresh allowance', () => {
    // The bug this whole extraction exists for: 10,000 miles driven in 2025/26
    // must not push the first journey of 2026/27 into the excess band.
    const s = summariseMileage(
      [
        entry({ date: '2026-04-05', miles: AMAP_CAR_THRESHOLD }), // last day of 2025/26
        entry({ date: '2026-04-06', miles: 100 }), // first day of 2026/27
      ],
      YEAR,
    )
    expect(s.priced[1]!.claimAmount).toBeCloseTo(100 * AMAP_CAR_FIRST, 10)
    expect(s.carMiles).toBe(100)
    expect(s.atExcessRate).toBe(false)
  })

  it('counts earlier years in the table but not in the totals', () => {
    const s = summariseMileage(
      [entry({ date: '2026-04-05', miles: 500 }), entry({ date: '2026-04-06', miles: 100 })],
      YEAR,
    )
    expect(s.priced).toHaveLength(2)
    expect(s.priorYearCount).toBe(1)
    expect(s.totalMiles).toBe(100)
  })

  it('applies flat rates to motorcycles and bicycles with no threshold', () => {
    const s = summariseMileage(
      [
        entry({ vehicle: 'motorcycle', miles: AMAP_CAR_THRESHOLD + 500 }),
        entry({ vehicle: 'bike', miles: 200 }),
      ],
      YEAR,
    )
    expect(s.totalClaim).toBeCloseTo(
      (AMAP_CAR_THRESHOLD + 500) * AMAP_MOTORCYCLE + 200 * AMAP_BICYCLE,
      8,
    )
    // Non-car miles never consume the car allowance.
    expect(s.carMiles).toBe(0)
    expect(s.hasCarEntriesThisYear).toBe(false)
  })

  it('caps the progress bar at 100 percent', () => {
    const s = summariseMileage([entry({ miles: AMAP_CAR_THRESHOLD * 3 })], YEAR)
    expect(s.thresholdPct).toBe(100)
  })
})

describe('carMilesBeforeFor', () => {
  const entries = [
    entry({ date: '2026-04-05', miles: 400 }), // 2025/26
    entry({ date: '2026-06-01', miles: 250 }), // 2026/27
    entry({ date: '2026-07-01', vehicle: 'bike', miles: 900 }),
  ]

  it('counts only car miles in the same tax year as the proposed date', () => {
    expect(carMilesBeforeFor(entries, 'car', '2026-08-01')).toBe(250)
  })

  it('prices a back-dated journey against that earlier year', () => {
    // Quoting this year's running total for a journey the user dated into last
    // year would show the wrong band before they save it.
    expect(carMilesBeforeFor(entries, 'car', '2026-04-01')).toBe(400)
  })

  it('is always zero for vehicles with no threshold', () => {
    expect(carMilesBeforeFor(entries, 'motorcycle', '2026-08-01')).toBe(0)
    expect(carMilesBeforeFor(entries, 'bike', '2026-08-01')).toBe(0)
  })
})

describe('isJourneyValid', () => {
  it.each([
    ['Client visit', '10', true],
    ['Client visit', '0.5', true],
    ['', '10', false],
    ['   ', '10', false],
    ['Client visit', '', false],
    ['Client visit', '0', false],
    ['Client visit', '-5', false],
    ['Client visit', 'abc', false],
  ])('description %j with miles %j → %s', (description, miles, expected) => {
    expect(isJourneyValid(description, miles)).toBe(expected)
  })
})

describe('display helpers', () => {
  it('formats miles to at most one decimal, with thousands separators', () => {
    expect(formatMiles(12345.678)).toBe('12,345.7')
    expect(formatMiles(100)).toBe('100')
  })

  it('renders rates from the bands file rather than prose', () => {
    expect(pence(AMAP_CAR_FIRST)).toBe(`${Math.round(AMAP_CAR_FIRST * 100)}p`)
    expect(pct(0.2)).toBe('20%')
  })
})
