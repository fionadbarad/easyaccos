/**
 * Self Assessment period-summary validation.
 *
 * The VAT route's checks were extracted and tested; this one's were not, and it
 * was the thinner of the two. `nino` — the taxpayer's identity, interpolated
 * straight into the request path — was checked for truthiness alone, so the
 * string "hello" was accepted and sent to HMRC. The period dates were checked
 * the same way. Nothing compared the two dates to each other.
 *
 * Each case below is a submission that used to be accepted and forwarded.
 */

import { describe, it, expect } from 'vitest'
import {
  missingItFields,
  itPeriodErrors,
  isCalendarDate,
  NINO_PATTERN,
  type ItReturnBody,
} from '@/lib/hmrc/it-return'

const browser = {
  userAgent: 'Mozilla/5.0 (test)',
  screens: [{ width: 1920, height: 1080, scalingFactor: 1, colourDepth: 24 }],
  windowSize: { width: 1280, height: 800 },
  timezone: 'UTC+00:00',
  deviceId: '11111111-2222-4333-8444-555555555555',
}

function body(over: Partial<ItReturnBody> = {}): ItReturnBody {
  return {
    nino: 'AA123456A',
    businessId: 'XBIS00000000001',
    periodStartDate: '2026-04-06',
    periodEndDate: '2027-04-05',
    income: { turnover: 42000 },
    browser,
    ...over,
  } as ItReturnBody
}

describe('a valid return passes', () => {
  it('reports nothing missing for a well-formed body', () => {
    expect(missingItFields(body())).toEqual([])
    expect(itPeriodErrors(body())).toEqual([])
  })
})

describe('the NINO is a real National Insurance number', () => {
  it('accepts correctly formed numbers', () => {
    for (const nino of ['AA123456A', 'JG121212C', 'ZR501234D', 'aa123456a']) {
      expect(missingItFields(body({ nino })), nino).toEqual([])
    }
  })

  it('rejects what used to be accepted and sent to HMRC', () => {
    for (const nino of ['hello', '123456789', 'AA12345A', 'AA1234567A', 'A1123456A', 'AA123456E']) {
      expect(missingItFields(body({ nino })), nino).toContain(
        'nino (not a valid National Insurance number)',
      )
    }
  })

  it('rejects prefix letters HMRC does not issue', () => {
    // D, F, I, Q, U and V never appear in either prefix position, and O never
    // in the second. A NINO containing them cannot belong to anyone.
    for (const nino of ['DA123456A', 'FA123456A', 'QQ123456A', 'AO123456A', 'AV123456A']) {
      expect(NINO_PATTERN.test(nino), nino).toBe(false)
    }
  })

  it('still reports a missing NINO as missing, not as malformed', () => {
    expect(missingItFields(body({ nino: '' }))).toContain('nino')
  })
})

describe('the period dates are real calendar dates', () => {
  it('rejects a date that is merely date-shaped', () => {
    expect(isCalendarDate('2026-02-31')).toBe(false)
    expect(isCalendarDate('2026-13-01')).toBe(false)
    expect(isCalendarDate('2026-00-10')).toBe(false)
  })

  it('accepts a real leap day and rejects a fake one', () => {
    expect(isCalendarDate('2028-02-29')).toBe(true) // 2028 is a leap year
    expect(isCalendarDate('2026-02-29')).toBe(false)
  })

  it('rejects free text where a date belongs', () => {
    for (const bad of ['5th April', '06/04/2026', '2026-4-6', '2026-04-06T00:00:00Z']) {
      expect(missingItFields(body({ periodStartDate: bad })), bad).toContain(
        'periodStartDate (must be a real date, YYYY-MM-DD)',
      )
    }
  })

  it('rejects a period that ends before it starts', () => {
    const errors = itPeriodErrors(
      body({ periodStartDate: '2026-07-05', periodEndDate: '2026-04-06' }),
    )
    expect(errors.join(' ')).toMatch(/must not be before/)
  })

  it('allows a single-day period', () => {
    expect(
      itPeriodErrors(body({ periodStartDate: '2026-04-06', periodEndDate: '2026-04-06' })),
    ).toEqual([])
  })
})

describe('money fields carry at most two decimal places', () => {
  it('rejects a third decimal place on turnover', () => {
    expect(missingItFields(body({ income: { turnover: 123.456 } }))).toContain(
      'income.turnover (at most 2 decimal places)',
    )
  })

  it('accepts whole pounds, one place and two places', () => {
    for (const turnover of [42000, 42000.5, 42000.55, 0]) {
      expect(missingItFields(body({ income: { turnover } })), String(turnover)).toEqual([])
    }
  })

  it('accepts two-place amounts whose float representation is awkward', () => {
    // 8.16 * 100 is 815.9999999999999 and 0.29 * 100 is 28.999999999999996 in
    // binary floating point, so a naive `Number.isInteger(v * 100)` would
    // reject perfectly ordinary prices. Scaling through the decimal string
    // avoids the multiplication entirely.
    for (const turnover of [8.16, 0.29, 1.13, 1234.56, 0.07]) {
      expect(missingItFields(body({ income: { turnover } })), String(turnover)).toEqual([])
    }
  })

  it('rejects three-place amounts even when they look like rounding cases', () => {
    // 1.005 and 2.675 are the classic float-rounding examples, but they are
    // genuinely three-decimal values and HMRC will not take them.
    for (const turnover of [1.005, 2.675, 8.165]) {
      expect(missingItFields(body({ income: { turnover } })), String(turnover)).toContain(
        'income.turnover (at most 2 decimal places)',
      )
    }
  })

  it('still rejects NaN and Infinity as missing turnover', () => {
    for (const turnover of [NaN, Infinity, -Infinity]) {
      expect(missingItFields(body({ income: { turnover } })), String(turnover)).toContain(
        'income.turnover',
      )
    }
  })

  it('checks detailed expense lines too', () => {
    expect(missingItFields(body({ expenses: { adminCosts: 10.999 } }))).toContain(
      'expenses.adminCosts (at most 2 decimal places)',
    )
    expect(missingItFields(body({ expenses: { adminCosts: 10.99 } }))).toEqual([])
  })

  it('checks consolidated expenses', () => {
    expect(missingItFields(body({ consolidatedExpenses: 1.234 }))).toContain(
      'consolidatedExpenses (at most 2 decimal places)',
    )
  })
})

describe("HMRC's either/or rule on expenses", () => {
  it('rejects a return carrying both kinds', () => {
    const errors = itPeriodErrors(
      body({ expenses: { adminCosts: 100 }, consolidatedExpenses: 500 }),
    )
    expect(errors.join(' ')).toMatch(/not both/)
    expect(errors.join(' ')).toMatch(/adminCosts/)
  })

  it('allows either one alone', () => {
    expect(itPeriodErrors(body({ expenses: { adminCosts: 100 } }))).toEqual([])
    expect(itPeriodErrors(body({ consolidatedExpenses: 500 }))).toEqual([])
  })

  it('treats an expenses object with only undefined values as absent', () => {
    // `Object.keys({adminCosts: undefined}).length` is 1, so the previous
    // in-route check called this a clash. It is not one.
    expect(
      itPeriodErrors(body({ expenses: { adminCosts: undefined }, consolidatedExpenses: 500 })),
    ).toEqual([])
  })
})
