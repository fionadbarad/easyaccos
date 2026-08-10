/**
 * calcScenario3 (Welfare & Support) and calcScenario4 (Job Loss & Redundancy)
 * — the two scenarios engine-parity.test.ts cannot diff-test because
 * calculateTax does not model them (TST-7). Expected values derive from the
 * same canonical helpers and bands-2026 constants; the assertions pin the
 * COMPOSITION — which income enters which base.
 */

import { describe, it, expect } from 'vitest'
import { calcScenario3, calcScenario4 } from '@/lib/tax-scenarios'
import { calcPA, calcClass1NI, calcRukTax, round2 } from '@/lib/tax-logic'
import { PA_BASE, REDUNDANCY_EXEMPTION } from '@/lib/tax/bands-2026'

const rukTax = (taxable: number) => calcRukTax(taxable).tax

describe('calcScenario3 — Welfare & Support (TAX-7)', () => {
  it('charges NI on earned income only — JSA and Carer’s Allowance are taxable but not earnings', () => {
    // If this fails, NI is overstated for the lowest-income users in the
    // product — the exact TAX-7 regression.
    const other = PA_BASE + 10_000 // part-time earnings, clearly above the NI PT
    const r = calcScenario3({
      universalCredit: 5_000,
      jsaAmount: 4_000,
      carersAllowance: 4_000,
      otherIncome: other,
    })

    expect(r.nationalInsurance).toBe(calcClass1NI(other))
    expect(r.nationalInsurance).toBeGreaterThan(0)
    // The wrong base (all taxable income) would charge more — prove the
    // distinction actually bites at these inputs.
    expect(calcClass1NI(4_000 + 4_000 + other)).toBeGreaterThan(r.nationalInsurance)
  })

  it('keeps Universal Credit out of tax entirely but inside take-home', () => {
    // If this fails, UC either gets taxed or vanishes from the user's
    // in-hand figure.
    const base = { jsaAmount: 4_000, carersAllowance: 4_000, otherIncome: 10_000 }
    const withUC = calcScenario3({ ...base, universalCredit: 6_000 })
    const withoutUC = calcScenario3({ ...base, universalCredit: 0 })

    expect(withUC.incomeTax).toBe(withoutUC.incomeTax)
    expect(withUC.taxableIncome).toBe(withoutUC.taxableIncome)
    expect(round2(withUC.netTakeHome - withoutUC.netTakeHome)).toBe(6_000)
  })

  it('taxes a benefits-only claimant above the PA while charging zero NI', () => {
    // If this fails, either taxable benefits above the allowance escape tax or
    // a claimant with no earnings is charged NI on benefits.
    const jsa = PA_BASE + 2_000
    const r = calcScenario3({
      universalCredit: 0,
      jsaAmount: jsa,
      carersAllowance: 0,
      otherIncome: 0,
    })

    expect(r.incomeTax).toBe(rukTax(2_000))
    expect(r.incomeTax).toBeGreaterThan(0)
    expect(r.nationalInsurance).toBe(0)
  })
})

describe('calcScenario4 — Job Loss & Redundancy', () => {
  const salary = 30_000
  const months = 6
  const earned = round2((salary / 12) * months)

  it('leaves a package at or below the exemption entirely tax-free', () => {
    // If this fails, the £30k redundancy exemption is being taxed — the user
    // over-provisions by thousands on the worst day to get it wrong.
    const withRedundancy = calcScenario4({
      annualSalary: salary,
      monthsWorked: months,
      redundancyPayment: REDUNDANCY_EXEMPTION,
      payeTaxPaid: 0,
    })
    const withoutRedundancy = calcScenario4({
      annualSalary: salary,
      monthsWorked: months,
      redundancyPayment: 0,
      payeTaxPaid: 0,
    })

    expect(withRedundancy.incomeTax).toBe(withoutRedundancy.incomeTax)
    expect(round2(withRedundancy.netTakeHome - withoutRedundancy.netTakeHome)).toBe(
      REDUNDANCY_EXEMPTION,
    )
  })

  it('taxes only the excess above the exemption, and charges NI on part-year earnings only', () => {
    // If this fails, either the whole package is taxed or the redundancy
    // excess leaks into the NI base.
    const excess = 10_000
    const r = calcScenario4({
      annualSalary: salary,
      monthsWorked: months,
      redundancyPayment: REDUNDANCY_EXEMPTION + excess,
      payeTaxPaid: 0,
    })

    const totalTaxable = earned + excess
    expect(r.incomeTax).toBe(rukTax(Math.max(0, totalTaxable - calcPA(totalTaxable))))
    expect(r.nationalInsurance).toBe(calcClass1NI(earned))
  })

  it('reports a PAYE refund when tax deducted at full-year rates exceeds the part-year liability', () => {
    // If this fails, the person who just lost their job is not told HMRC owes
    // them money.
    const due = rukTax(Math.max(0, earned - calcPA(earned)))
    const overpaid = calcScenario4({
      annualSalary: salary,
      monthsWorked: months,
      redundancyPayment: 0,
      payeTaxPaid: due + 1_000,
    })
    expect(overpaid.catMessage).toContain('refund')
    expect(overpaid.catMessage).toContain('£1,000')

    const exact = calcScenario4({
      annualSalary: salary,
      monthsWorked: months,
      redundancyPayment: 0,
      payeTaxPaid: due,
    })
    expect(exact.catMessage).not.toContain('refund of')
  })
})
