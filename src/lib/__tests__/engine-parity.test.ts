// Diff-test: the two live tax engines must agree on the numbers they share.
//
//   tax-logic.ts         → calculateTax(TaxInput)         — general engine
//   tax-scenarios.ts     → calcScenario1/2/5(ScenarioX)   — UX-shaped wrappers
//
// Both consume the same HMRC 2026/27 bands (since Phase 2 bands extraction).
// Their shared outputs — personalAllowance, taxableIncome, incomeTax, NI, net
// — must match exactly across a wide input matrix. If they ever drift, this
// test fails and we know which engine is wrong.
//
// Scenarios 3 (welfare) and 4 (redundancy) cover concerns calculateTax does
// not model, so they are not diff-tested here.

import { describe, expect, test } from 'vitest'
import { calculateTax, round2, type TaxInput } from '../tax-logic'
import {
  calcScenario1,
  calcScenario2,
  calcScenario5,
  type S1Input,
  type S2Input,
} from '../tax-scenarios'

function baseInput(over: Partial<TaxInput> = {}): TaxInput {
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

// ─── Scenario 1 parity: employed / self-employed, expenses, pension ─────────
describe('calcScenario1 vs calculateTax parity', () => {
  const incomes = [
    0, 5_000, 12_570, 20_000, 35_000, 50_270, 75_000, 99_999, 100_000, 120_000, 125_140, 150_000,
    250_000,
  ]
  const expenseRatios = [0, 0.1, 0.25]
  const pensions = [0, 2_400, 10_000]
  const empTypes: Array<'employed' | 'self-employed'> = ['employed', 'self-employed']

  const cases: Array<{ name: string; s1: S1Input; t: TaxInput }> = []
  for (const income of incomes) {
    for (const ratio of expenseRatios) {
      const expenses = Math.round(income * ratio)
      for (const pension of pensions) {
        for (const empType of empTypes) {
          cases.push({
            name: `£${income} ${empType} expenses=${expenses} pension=${pension}`,
            s1: { grossIncome: income, expenses, employmentType: empType, pension },
            t: baseInput({
              grossRevenue: income,
              allowableExpenses: expenses,
              pensionContribution: pension,
              employmentType: empType,
            }),
          })
        }
      }
    }
  }

  test.each(cases)('$name', ({ s1, t }) => {
    const a = calcScenario1(s1)
    const b = calculateTax(t)
    expect(a.personalAllowance).toBe(b.personalAllowance)
    expect(a.taxableIncome).toBe(b.taxableIncome)
    expect(a.incomeTax).toBe(b.incomeTax)
    // TaxBible's nationalInsurance field = Class 1 (employed) or Class 4 (SE)
    const expectedNi = s1.employmentType === 'employed' ? b.niClass1 : b.niClass4
    expect(a.nationalInsurance).toBe(expectedNi)
  })
})

// ─── Scenario 2 parity: high-earner 60%-trap (employed Class 1 + pension) ───
describe('calcScenario2 vs calculateTax parity', () => {
  const incomes = [80_000, 100_000, 110_000, 115_000, 120_000, 125_140, 130_000, 200_000]
  const pensions = [0, 5_000, 15_000, 25_000]

  const cases: Array<{ name: string; s2: S2Input; t: TaxInput }> = []
  for (const income of incomes) {
    for (const pension of pensions) {
      cases.push({
        name: `£${income} pension=${pension}`,
        s2: { grossIncome: income, pension },
        t: baseInput({
          grossRevenue: income,
          pensionContribution: pension,
          employmentType: 'employed',
        }),
      })
    }
  }

  test.each(cases)('$name', ({ s2, t }) => {
    const a = calcScenario2(s2)
    const b = calculateTax(t)
    expect(a.personalAllowance).toBe(b.personalAllowance)
    expect(a.taxableIncome).toBe(b.taxableIncome)
    expect(a.incomeTax).toBe(b.incomeTax)
    expect(a.nationalInsurance).toBe(b.niClass1)
  })
})

// ─── Scenario 5 parity: canonical director (salary = £12,570 PT) + dividends ─
// calcScenario5 applies PA to salary only and stacks dividends on top — correct
// when salary >= PA (the optimal director pattern). Below-PA salary is outside
// the scenario's intended use (HMRC lets unused PA cover dividends) and is not
// diff-tested here.
//
// calcScenario5 also reports `incomeTax` as the combined salary+dividend tax,
// so we compare against the SUM of calculateTax.incomeTax + .dividendTax.
describe('calcScenario5 vs calculateTax — canonical director parity', () => {
  const salary = 12_570
  const dividends = [0, 500, 5_000, 10_000, 30_000, 50_000, 100_000]

  test.each(dividends.map((d) => ({ name: `salary=£${salary} divs=£${d}`, divs: d })))(
    '$name',
    ({ divs }) => {
      const a = calcScenario5({ salary, dividends: divs, pension: 0 })
      const b = calculateTax(
        baseInput({
          grossRevenue: salary,
          dividendIncome: divs,
          employmentType: 'director',
        }),
      )
      expect(a.personalAllowance).toBe(b.personalAllowance)
      expect(a.dividendTax).toBe(b.dividendTax)
      expect(a.incomeTax).toBe(round2(b.incomeTax + b.dividendTax))
    },
  )
})
