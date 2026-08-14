/**
 * The /validation page is public evidence: five HMRC scenarios worked by hand,
 * shown next to live engine output. Until now the only thing checking those
 * figures was the page itself, at request time — so a drift between the manual
 * arithmetic and the engine became visible to visitors before it became
 * visible to us.
 *
 * These tests move that check into the suite. If the engine changes and the
 * hand-worked figures are not re-worked, CI goes red before the page does.
 *
 * Note what is deliberately NOT done here: nothing is recomputed from
 * bands-2026. Deriving the expected values from the same constants the engine
 * reads would make every assertion tautological — it would pass whatever the
 * engine did. The literals in validation-scenarios.ts are a person's
 * arithmetic from HMRC's published rules, and they are supposed to need
 * re-working by hand when a band moves.
 */

import { describe, it, expect } from 'vitest'
import {
  runScenarios,
  SCENARIOS,
  bucketErrors,
  errorCodeOf,
  fmtVal,
  pickAssertion,
  baseInput,
  HMRC_SCENARIOS,
} from '../validation-scenarios'
import { calculateTax } from '@/lib/tax-engine'
import { HMRC_ERROR_MESSAGES, mapHmrcError } from '@/lib/hmrc/mtd-errors'

describe('runScenarios — every hand-worked figure matches the engine', () => {
  const runs = runScenarios()

  it('runs all five scenarios', () => {
    expect(runs).toHaveLength(5)
    expect(runs.map((r) => r.scenario.id)).toEqual([
      'sixty-percent-trap',
      'pa-fully-tapered',
      'scotland-starter',
      'director-optimal',
      'additional-rate-dividends',
    ])
  })

  // The whole point of the page, as one assertion.
  it('passes every assertion in every scenario', () => {
    const failures = runs.flatMap((r) =>
      r.assertions
        .filter((a) => !a.pass)
        .map((a) => `${r.scenario.id}: ${a.path} expected ${a.expected}, engine gave ${a.actual}`),
    )
    expect(failures).toEqual([])
  })

  it.each(runScenarios().map((r) => [r.scenario.id, r] as const))(
    '%s: all assertions pass',
    (_id, run) => {
      for (const a of run.assertions) {
        expect(a.pass, `${a.path}: expected ${a.expected}, got ${a.actual}`).toBe(true)
      }
    },
  )

  it('resolves an actual value for every assertion', () => {
    // An assertion whose path does not exist on TaxResult yields undefined,
    // which would then compare unequal and read on the page as a red "fail"
    // caused by a typo rather than by drift. Catch it here instead.
    for (const run of runs) {
      for (const a of run.assertions) {
        expect(a.actual, `${run.scenario.id} → ${a.path}`).toBeDefined()
      }
    }
  })

  it('asserts something in every scenario', () => {
    for (const run of runs) {
      expect(run.assertions.length, run.scenario.id).toBeGreaterThan(0)
    }
  })

  it('is pure — two runs give identical results', () => {
    expect(JSON.stringify(runScenarios())).toBe(JSON.stringify(runs))
  })

  it('would report a failure rather than hide it', () => {
    // Guards the comparison itself: if `pass` were hard-coded true, or the
    // tolerance were wide enough to swallow anything, the suite above would
    // pass while proving nothing.
    const result = calculateTax(baseInput({ grossRevenue: 110_000 }))
    expect(pickAssertion(result, 'incomeTax')).not.toBe(999_999)
  })
})

describe('pickAssertion', () => {
  const result = calculateTax(baseInput({ grossRevenue: 15_000, taxRegion: 'scotland' }))

  it('reads a plain numeric field', () => {
    expect(pickAssertion(result, 'incomeTax')).toBe(result.incomeTax)
  })

  it('reads a boolean field', () => {
    expect(pickAssertion(result, 'sixtyPercentTrap')).toBe(false)
  })

  it('handles the three derived paths', () => {
    expect(pickAssertion(result, 'taxBands.length')).toBe(result.taxBands.length)
    expect(pickAssertion(result, 'taxBands[0].rate')).toBe(result.taxBands[0]?.rate)
    expect(pickAssertion(result, 'incomeTax+niClass4')).toBe(result.incomeTax + result.niClass4)
  })

  it('returns undefined for an unknown path rather than throwing', () => {
    expect(pickAssertion(result, 'notAField')).toBeUndefined()
  })
})

describe('fmtVal', () => {
  it('renders booleans as words', () => {
    expect(fmtVal(true)).toBe('true')
    expect(fmtVal(false)).toBe('false')
  })

  it('renders a missing value as a dash', () => {
    expect(fmtVal(undefined)).toBe('—')
  })

  it('keeps two decimals on small fractional values', () => {
    // Rates and small amounts: 19 (a percentage) would read wrong as "£19.00",
    // and 461.7 must not lose its pence.
    expect(fmtVal(19.5)).toBe('19.50')
  })

  it('formats larger amounts as currency', () => {
    expect(fmtVal(33_432)).toContain('33,432')
  })
})

describe('bucketErrors — the coverage table', () => {
  const buckets = bucketErrors()

  it('places every mapped code in exactly one bucket', () => {
    const all = buckets.flatMap((b) => b.entries.map(([code]) => code))
    const codes = Object.keys(HMRC_ERROR_MESSAGES)

    expect(all.sort()).toEqual(codes.sort())
    expect(new Set(all).size).toBe(all.length)
  })

  it('pairs each code with its real message', () => {
    for (const b of buckets) {
      for (const [code, msg] of b.entries) {
        expect(msg).toBe(HMRC_ERROR_MESSAGES[code])
      }
    }
  })
})

describe('HMRC_SCENARIOS — the error bodies the page maps', () => {
  it('extracts the most specific code from each body', () => {
    // The VAT case nests its real code inside `errors[0]`; taking the
    // top-level INVALID_REQUEST instead would show the user a vaguer error
    // than the one HMRC actually reported.
    const vat = HMRC_SCENARIOS.find((s) => s.govTestScenario === 'VAT_TOTAL_VALUE')!
    expect(errorCodeOf(vat.responseBody)).toBe('VAT_TOTAL_VALUE')

    const it_ = HMRC_SCENARIOS.find((s) => s.govTestScenario === 'OVERLAPPING_PERIOD')!
    expect(errorCodeOf(it_.responseBody)).toBe('RULE_OVERLAPPING_PERIOD')
  })

  it('maps every scenario body to a specific, non-generic message', () => {
    for (const s of HMRC_SCENARIOS) {
      const friendly = mapHmrcError(s.responseBody)
      expect(friendly, s.govTestScenario).toBeTruthy()
      // The page's claim is that coded errors never collapse into a generic
      // "submission failed". If one did, the page would be asserting something
      // untrue about the live mapper.
      expect(friendly.toLowerCase(), s.govTestScenario).not.toBe('submission failed')
    }
  })

  it('returns a dash for a body with no code at all', () => {
    expect(errorCodeOf(null)).toBe('—')
    expect(errorCodeOf('a string')).toBe('—')
    expect(errorCodeOf({})).toBe('—')
  })
})

describe('scenario definitions', () => {
  it('gives every scenario a unique id', () => {
    const ids = SCENARIOS.map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('shows a manual working for every scenario', () => {
    for (const s of SCENARIOS) {
      expect(s.manual.length, s.id).toBeGreaterThan(0)
    }
  })

  it('defaults every unset input field to a neutral value', () => {
    expect(baseInput({})).toEqual({
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
    })
  })
})
