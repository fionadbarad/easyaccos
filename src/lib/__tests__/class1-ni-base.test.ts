/**
 * The Class 1 NIC base, and the employer's side of it.
 *
 * Income tax and National Insurance have DIFFERENT bases, and the engine kept
 * conflating them. Two separate errors, found by a user reading the output and
 * not believing it:
 *
 *   1. Allowable expenses were subtracted before charging Class 1. Deductible
 *      employment expenses (s336 ITEPA 2003) reduce taxable income; they do not
 *      reduce "earnings" for NIC (s3 SSCBA 1992). A £50,000 salary with £5,000
 *      of expenses was charged on £45,000 — £400 light, exactly 8% of them.
 *
 *   2. The employer's secondary contribution was never calculated at all, while
 *      the app recommended a £12,570 director salary as costing "no NI". It
 *      costs the company £1,135.50.
 *
 * Both are the same underlying mistake as TAX-2 (the pension), which is why the
 * pension case is re-asserted here rather than trusted: fixing one leg of a
 * wrong base is how you end up with the other leg still wrong.
 */

import { describe, it, expect } from 'vitest'
import { calculateTax, calcClass1NI, calcEmployerNI, type TaxInput } from '../tax-logic'
import { calcScenario1 } from '../tax-scenarios'
import { NI_PT, NI_UEL, NI_C1_MAIN, NI_C1_UPPER, EMPLOYER_NI_THRESH } from '../tax/bands-2026'

function employed(over: Partial<TaxInput> = {}): TaxInput {
  return {
    grossRevenue: 0,
    allowableExpenses: 0,
    dividendIncome: 0,
    employmentType: 'employed',
    taxRegion: 'ruk',
    studentLoanPlan: 'none',
    voluntaryClass2NI: false,
    marriageAllowance: false,
    blindPersonsAllowance: false,
    pensionContribution: 0,
    ...over,
  }
}

describe('Class 1 is charged on gross pay, not on profit', () => {
  it('allowable expenses do not reduce it', () => {
    const withExpenses = calculateTax(employed({ grossRevenue: 50_000, allowableExpenses: 5_000 }))
    const without = calculateTax(employed({ grossRevenue: 50_000 }))
    expect(withExpenses.niClass1).toBe(without.niClass1)
  })

  it('charges the HMRC figure, not £400 less', () => {
    const r = calculateTax(employed({ grossRevenue: 50_000, allowableExpenses: 5_000 }))
    expect(r.niClass1).toBeCloseTo((50_000 - NI_PT) * NI_C1_MAIN, 2)
    // The precise size of the old error: 8% of the expenses that were wrongly
    // deducted from the base.
    const oldWrongValue = (45_000 - NI_PT) * NI_C1_MAIN
    expect(r.niClass1 - oldWrongValue).toBeCloseTo(5_000 * NI_C1_MAIN, 2)
  })

  it('the pension does not reduce it either (TAX-2 still holds)', () => {
    const withBoth = calculateTax(
      employed({ grossRevenue: 50_000, allowableExpenses: 5_000, pensionContribution: 10_000 }),
    )
    expect(withBoth.niClass1).toBeCloseTo((50_000 - NI_PT) * NI_C1_MAIN, 2)
  })

  it('still applies the 2% band above the UEL', () => {
    const r = calculateTax(employed({ grossRevenue: 80_000, allowableExpenses: 10_000 }))
    const expected = (NI_UEL - NI_PT) * NI_C1_MAIN + (80_000 - NI_UEL) * NI_C1_UPPER
    expect(r.niClass1).toBeCloseTo(expected, 2)
  })

  it('applies to directors as well as employees', () => {
    const d = calculateTax(
      employed({ grossRevenue: 60_000, allowableExpenses: 8_000, employmentType: 'director' }),
    )
    // £60,000 is above the UEL, so both bands apply — not a flat 8%.
    const expected = (NI_UEL - NI_PT) * NI_C1_MAIN + (60_000 - NI_UEL) * NI_C1_UPPER
    expect(d.niClass1).toBeCloseTo(expected, 2)
  })

  it('leaves Class 4 alone — a sole trader IS taxed on profit after expenses', () => {
    // The two classes genuinely differ. Fixing Class 1 must not "tidy" Class 4
    // into agreeing with it.
    const se = calculateTax(
      employed({ grossRevenue: 50_000, allowableExpenses: 5_000, employmentType: 'self-employed' }),
    )
    expect(se.niClass4).toBeGreaterThan(0)
    expect(se.grossProfit).toBe(45_000)
  })

  it('holds in the scenario wrapper too', () => {
    const s = calcScenario1({
      grossIncome: 50_000,
      expenses: 5_000,
      employmentType: 'employed',
      pension: 0,
    })
    expect(s.nationalInsurance).toBeCloseTo((50_000 - NI_PT) * NI_C1_MAIN, 2)
  })
})

describe('employer (secondary) Class 1', () => {
  it('is nil at or below the secondary threshold', () => {
    expect(calcEmployerNI(EMPLOYER_NI_THRESH)).toBe(0)
    expect(calcEmployerNI(0)).toBe(0)
  })

  it('costs £1,135.50 on the salary the app recommends', () => {
    // The figure that made "optimal £12,570 — no NI" untrue.
    expect(calcEmployerNI(12_570)).toBeCloseTo(1_135.5, 2)
  })

  it('is reported on the result for employees and directors', () => {
    expect(calculateTax(employed({ grossRevenue: 12_570 })).niEmployerClass1).toBeCloseTo(
      1_135.5,
      2,
    )
    expect(
      calculateTax(employed({ grossRevenue: 12_570, employmentType: 'director' })).niEmployerClass1,
    ).toBeCloseTo(1_135.5, 2)
  })

  it('is nil for the self-employed, who have no employer', () => {
    expect(
      calculateTax(employed({ grossRevenue: 60_000, employmentType: 'self-employed' }))
        .niEmployerClass1,
    ).toBe(0)
  })

  it('is NOT added to the individual’s deductions', () => {
    // It is the company's cost, not the person's. Folding it into
    // totalDeductions would overstate what the user personally pays.
    const r = calculateTax(employed({ grossRevenue: 40_000 }))
    expect(r.niEmployerClass1).toBeGreaterThan(0)
    const own = r.incomeTax + r.niClass1 + r.niClass4 + r.niClass2 + r.dividendTax
    expect(r.totalDeductions).toBeCloseTo(own, 2)
  })

  it('uses gross pay, so expenses do not shrink it', () => {
    const a = calculateTax(employed({ grossRevenue: 40_000 }))
    const b = calculateTax(employed({ grossRevenue: 40_000, allowableExpenses: 9_000 }))
    expect(b.niEmployerClass1).toBe(a.niEmployerClass1)
  })
})

describe('calcClass1NI in isolation', () => {
  it('is nil at and below the primary threshold', () => {
    expect(calcClass1NI(NI_PT)).toBe(0)
    expect(calcClass1NI(0)).toBe(0)
  })

  it('is continuous across the upper earnings limit', () => {
    const justUnder = calcClass1NI(NI_UEL - 1)
    const atLimit = calcClass1NI(NI_UEL)
    const justOver = calcClass1NI(NI_UEL + 1)
    expect(atLimit - justUnder).toBeCloseTo(NI_C1_MAIN, 4)
    expect(justOver - atLimit).toBeCloseTo(NI_C1_UPPER, 4)
  })
})
