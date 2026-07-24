import { describe, it, expect } from 'vitest'
import { calcRate, computeTotals, formatMiles } from '../calc'
import { CAR_THRESHOLD, type MileageEntry } from '../types'

function entry(over: Partial<MileageEntry> = {}): MileageEntry {
  return {
    id: over.id ?? crypto.randomUUID(),
    date: over.date ?? '2026-04-06',
    description: over.description ?? 'Trip',
    vehicle: over.vehicle ?? 'car',
    miles: over.miles ?? 0,
    createdAt: over.createdAt ?? '2026-04-06T00:00:00.000Z',
  }
}

describe('calcRate', () => {
  it('bike is a flat 20p/mile', () => {
    expect(calcRate('bike', 0, 100)).toBeCloseTo(20)
  })

  it('motorcycle is a flat 24p/mile regardless of prior miles', () => {
    expect(calcRate('motorcycle', 9_999, 100)).toBeCloseTo(24)
  })

  it('car under the threshold is 45p/mile', () => {
    expect(calcRate('car', 0, 1_000)).toBeCloseTo(450)
  })

  it('car above the threshold is 25p/mile', () => {
    expect(calcRate('car', CAR_THRESHOLD, 1_000)).toBeCloseTo(250)
  })

  it('car straddling the threshold splits 45p / 25p', () => {
    // 500 miles before → 9,500 at 45p (= 4,275) + 500 at 25p (= 125)
    expect(calcRate('car', 9_500, 1_000)).toBeCloseTo(9_500 * 0 + 500 * 0.45 + 500 * 0.25)
  })
})

describe('computeTotals', () => {
  it('accumulates car miles across journeys for the threshold split', () => {
    const totals = computeTotals([entry({ id: 'a', miles: 9_800 }), entry({ id: 'b', miles: 400 })])
    expect(totals.carMiles).toBe(10_200)
    expect(totals.totalMiles).toBe(10_200)
    // First journey all at 45p; second: 200 @ 45p + 200 @ 25p.
    const expected = 9_800 * 0.45 + (200 * 0.45 + 200 * 0.25)
    expect(totals.totalClaim).toBeCloseTo(expected)
  })

  it('non-car miles do not consume the car threshold', () => {
    const totals = computeTotals([
      entry({ id: 'a', vehicle: 'bike', miles: 10_000 }),
      entry({ id: 'b', vehicle: 'car', miles: 100 }),
    ])
    expect(totals.carMiles).toBe(100)
    expect(totals.totalClaim).toBeCloseTo(10_000 * 0.2 + 100 * 0.45)
  })

  it('empty input yields zeroed totals', () => {
    expect(computeTotals([])).toEqual({
      enriched: [],
      totalMiles: 0,
      totalClaim: 0,
      carMiles: 0,
    })
  })
})

describe('formatMiles', () => {
  it('formats with thousands separators and up to 1dp', () => {
    expect(formatMiles(12_345.6)).toBe('12,345.6')
    expect(formatMiles(1_000)).toBe('1,000')
  })
})
