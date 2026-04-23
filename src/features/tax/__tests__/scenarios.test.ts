// Pinpoint tests for buildTaxInput — the UI-state → calculateTax bridge.
// calculateTax is already diff-tested, so this layer's risk is purely
// projection errors (wrong field copied, wrong zero, etc.).

import { describe, expect, test } from 'vitest'
import { buildTaxInput, isFullEngineScenario, type TaxInputDraft } from '../scenarios'

function draft(over: Partial<TaxInputDraft> = {}): TaxInputDraft {
  return {
    scenario: 'employed',
    grossRevenue: 45_000,
    allowableExpenses: 0,
    pensionContribution: 0,
    dirSalary: 12_570,
    dirDividends: 50_000,
    taxRegion: 'ruk',
    studentLoanPlan: 'none',
    marriageAllowance: false,
    blindPersonsAllowance: false,
    voluntaryClass2NI: false,
    ...over,
  }
}

describe('isFullEngineScenario', () => {
  test('employed / self-employed / director use full engine', () => {
    expect(isFullEngineScenario('employed')).toBe(true)
    expect(isFullEngineScenario('self-employed')).toBe(true)
    expect(isFullEngineScenario('director')).toBe(true)
  })
  test('welfare / jobloss do not', () => {
    expect(isFullEngineScenario('welfare')).toBe(false)
    expect(isFullEngineScenario('jobloss')).toBe(false)
  })
})

describe('buildTaxInput — employed', () => {
  test('copies gross salary; suppresses expenses and dividends', () => {
    const i = buildTaxInput(draft({ scenario: 'employed', grossRevenue: 60_000, allowableExpenses: 9_999 }))!
    expect(i.employmentType).toBe('employed')
    expect(i.grossRevenue).toBe(60_000)
    expect(i.allowableExpenses).toBe(0)      // employees can't deduct expenses here
    expect(i.dividendIncome).toBe(0)
  })

  test('passes voluntaryClass2NI through unchanged', () => {
    const i = buildTaxInput(draft({ scenario: 'employed', voluntaryClass2NI: true }))!
    expect(i.voluntaryClass2NI).toBe(true)
  })
})

describe('buildTaxInput — self-employed', () => {
  test('passes expenses through; no dividends', () => {
    const i = buildTaxInput(draft({ scenario: 'self-employed', grossRevenue: 80_000, allowableExpenses: 12_000 }))!
    expect(i.employmentType).toBe('self-employed')
    expect(i.allowableExpenses).toBe(12_000)
    expect(i.dividendIncome).toBe(0)
  })
})

describe('buildTaxInput — director', () => {
  test('collapses salary + dividends into grossRevenue; sets dividendIncome; forces voluntaryClass2NI=false', () => {
    const i = buildTaxInput(draft({
      scenario: 'director',
      dirSalary: 12_570,
      dirDividends: 50_000,
      voluntaryClass2NI: true,    // should be overridden
    }))!
    expect(i.employmentType).toBe('director')
    expect(i.grossRevenue).toBe(62_570)
    expect(i.dividendIncome).toBe(50_000)
    expect(i.allowableExpenses).toBe(0)
    expect(i.voluntaryClass2NI).toBe(false)
  })
})

describe('buildTaxInput — non-full-engine scenarios', () => {
  test('welfare returns null', () => {
    expect(buildTaxInput(draft({ scenario: 'welfare' }))).toBeNull()
  })
  test('jobloss returns null', () => {
    expect(buildTaxInput(draft({ scenario: 'jobloss' }))).toBeNull()
  })
})

describe('buildTaxInput — allowances pass through', () => {
  test('marriage + blind-persons + pension flow into output', () => {
    const i = buildTaxInput(draft({
      marriageAllowance: true,
      blindPersonsAllowance: true,
      pensionContribution: 8_000,
    }))!
    expect(i.marriageAllowance).toBe(true)
    expect(i.blindPersonsAllowance).toBe(true)
    expect(i.pensionContribution).toBe(8_000)
  })
})
