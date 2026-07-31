/**
 * Regression cover for the defects found in the deep-analysis pass.
 *
 * Each block names the failure it locks out, not the function it calls — the
 * point is that the bug cannot come back, not that the code was executed.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { calculateTax, validateTaxInput, type TaxInput } from '../tax-logic'
import { calcScenario1, calcScenario2, calcScenario5 } from '../tax-scenarios'
import { NI_PT, NI_C1_MAIN } from '../tax/bands-2026'
import { newId } from '../id'
import { reportError, setMonitorTransport, __resetMonitor, type MonitorEvent } from '../monitor'
import { invalidBrowserFields } from '../hmrc/fraud-headers'

function input(over: Partial<TaxInput> = {}): TaxInput {
  return {
    grossRevenue: 0,
    allowableExpenses: 0,
    dividendIncome: 0,
    employmentType: 'self-employed',
    taxRegion: 'ruk',
    studentLoanPlan: 'none',
    voluntaryClass2NI: false,
    marriageAllowance: false,
    blindPersonsAllowance: false,
    pensionContribution: 0,
    ...over,
  }
}

// ─── A personal SIPP does not reduce ANY NIC base ───────────────────────────
// Relief at source is paid out of income that has already borne NI; only salary
// sacrifice moves an NIC base, and this engine does not model that. Class 4 was
// already correct (TAX-2) while Class 1 was charged on the pension-reduced
// figure — the two contradicted each other inside one function.
describe('Class 1 NI base excludes the pension (TAX-2, parity with Class 4)', () => {
  it('is unchanged by a gross SIPP contribution', () => {
    const without = calculateTax(input({ grossRevenue: 50_000, employmentType: 'employed' }))
    const with10k = calculateTax(
      input({ grossRevenue: 50_000, employmentType: 'employed', pensionContribution: 10_000 }),
    )
    expect(with10k.niClass1).toBe(without.niClass1)
  })

  it('charges Class 1 on full earnings, not earnings less the pension', () => {
    const r = calculateTax(
      input({ grossRevenue: 50_000, employmentType: 'employed', pensionContribution: 10_000 }),
    )
    // The old behaviour charged on £40,000 and under-collected by 8% × £10,000.
    expect(r.niClass1).toBeCloseTo((50_000 - NI_PT) * NI_C1_MAIN, 2)
    expect(r.niClass1 - (40_000 - NI_PT) * NI_C1_MAIN).toBeCloseTo(10_000 * NI_C1_MAIN, 2)
  })

  it('applies to directors too', () => {
    const without = calculateTax(input({ grossRevenue: 60_000, employmentType: 'director' }))
    const withPension = calculateTax(
      input({ grossRevenue: 60_000, employmentType: 'director', pensionContribution: 15_000 }),
    )
    expect(withPension.niClass1).toBe(without.niClass1)
  })

  it('holds across the scenario wrappers as well', () => {
    const s1 = calcScenario1({
      grossIncome: 50_000,
      expenses: 0,
      employmentType: 'employed',
      pension: 10_000,
    })
    const s1NoPension = calcScenario1({
      grossIncome: 50_000,
      expenses: 0,
      employmentType: 'employed',
      pension: 0,
    })
    expect(s1.nationalInsurance).toBe(s1NoPension.nationalInsurance)

    const s2 = calcScenario2({ grossIncome: 120_000, pension: 20_000 })
    expect(s2.nationalInsurance).toBe(
      calcScenario2({ grossIncome: 120_000, pension: 0 }).nationalInsurance,
    )

    const s5 = calcScenario5({ salary: 30_000, dividends: 20_000, pension: 5_000 })
    expect(s5.nationalInsurance).toBe(
      calcScenario5({ salary: 30_000, dividends: 20_000, pension: 0 }).nationalInsurance,
    )
  })
})

// ─── NaN is a number and every comparison against it is false ───────────────
describe('validateTaxInput rejects non-finite figures', () => {
  it('flags NaN rather than letting it through to produce £NaN everywhere', () => {
    const e = validateTaxInput(input({ grossRevenue: NaN }))
    expect(e.grossRevenue).toBeDefined()
  })

  it('flags Infinity on every money field', () => {
    expect(validateTaxInput(input({ grossRevenue: Infinity })).grossRevenue).toBeDefined()
    expect(
      validateTaxInput(input({ allowableExpenses: -Infinity })).allowableExpenses,
    ).toBeDefined()
    expect(validateTaxInput(input({ dividendIncome: NaN })).dividendIncome).toBeDefined()
    expect(validateTaxInput(input({ pensionContribution: NaN })).pensionContribution).toBeDefined()
  })

  it('still accepts an ordinary valid input', () => {
    expect(validateTaxInput(input({ grossRevenue: 45_000, allowableExpenses: 5_000 }))).toEqual({})
  })

  it('a loss year is still not an error', () => {
    expect(validateTaxInput(input({ grossRevenue: 10_000, allowableExpenses: 15_000 }))).toEqual({})
  })
})

// ─── crypto.randomUUID is absent outside a secure context ───────────────────
describe('newId survives a missing crypto.randomUUID', () => {
  const realCrypto = globalThis.crypto

  afterEach(() => {
    Object.defineProperty(globalThis, 'crypto', { value: realCrypto, configurable: true })
  })

  const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

  it('produces a v4-shaped id when randomUUID exists', () => {
    expect(newId()).toMatch(UUID_V4)
  })

  it('produces a v4-shaped id when randomUUID is missing (plain http, old Safari)', () => {
    Object.defineProperty(globalThis, 'crypto', {
      value: { getRandomValues: realCrypto.getRandomValues.bind(realCrypto) },
      configurable: true,
    })
    expect(newId()).toMatch(UUID_V4)
  })

  it('produces a v4-shaped id with no WebCrypto at all', () => {
    Object.defineProperty(globalThis, 'crypto', { value: undefined, configurable: true })
    expect(newId()).toMatch(UUID_V4)
  })

  it('does not collide across a large batch', () => {
    const ids = new Set(Array.from({ length: 5_000 }, newId))
    expect(ids.size).toBe(5_000)
  })
})

// ─── Dedupe has to run before the burst cap ─────────────────────────────────
describe('monitor: a repeating error does not exhaust the burst budget', () => {
  beforeEach(() => {
    __resetMonitor()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-31T00:00:00Z'))
  })
  afterEach(() => {
    vi.useRealTimers()
    __resetMonitor()
  })

  it('still emits a NEW error after 500 duplicates of an old one', () => {
    const seen: MonitorEvent[] = []
    setMonitorTransport((ev) => seen.push(ev))

    // One error firing in a loop. Dedupe collapses these to a single emission —
    // but the burst cap used to be charged for all 500, tripping at 100 and
    // silencing everything for the rest of the window.
    for (let i = 0; i < 500; i++) reportError('loop', new Error('same failure'))
    expect(seen).toHaveLength(1)

    reportError('elsewhere', new Error('a genuinely different failure'))
    expect(seen).toHaveLength(2)
    expect(seen[1]?.scope).toBe('elsewhere')
  })
})

// ─── The fraud payload reaches an unguarded builder ─────────────────────────
describe('invalidBrowserFields', () => {
  const good = {
    userAgent: 'Mozilla/5.0',
    screens: [{ width: 1920, height: 1080, scalingFactor: 2, colourDepth: 24 }],
    windowSize: { width: 1280, height: 720 },
    timezone: 'UTC+01:00',
    deviceId: 'c8f1e2d3-0000-4000-8000-000000000000',
  }

  it('passes a well-formed payload', () => {
    expect(invalidBrowserFields(good)).toEqual([])
  })

  it('names every field an empty object is missing', () => {
    expect(invalidBrowserFields({})).toHaveLength(5)
  })

  it('rejects a non-object browser', () => {
    expect(invalidBrowserFields(null)).toEqual(['browser'])
    expect(invalidBrowserFields('nope')).toEqual(['browser'])
  })

  it('rejects a screen entry with non-numeric dimensions', () => {
    expect(
      invalidBrowserFields({
        ...good,
        screens: [{ width: 'wide', height: 1, scalingFactor: 1, colourDepth: 1 }],
      }),
    ).toContain('browser.screens')
  })

  it('rejects a windowSize missing a dimension', () => {
    expect(invalidBrowserFields({ ...good, windowSize: { width: 100 } })).toContain(
      'browser.windowSize',
    )
  })

  it('rejects header values containing CR/LF', () => {
    expect(invalidBrowserFields({ ...good, timezone: 'UTC+00:00\r\nX: y' })).toContain(
      'browser.timezone',
    )
  })
})
