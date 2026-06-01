import { describe, it, expect } from 'vitest'
import {
  calculateTax,
  validateTaxInput,
  round2,
  calcPA,
  PA_BASE,
  PA_TAPER_START,
  PA_TAPER_END,
  RUK_HIGHER_LIMIT,
} from '../tax-logic'
import type { TaxInput } from '../tax-logic'

// ── Helpers ───────────────────────────────────────────────────────────────────
function seInput(grossRevenue: number, allowableExpenses = 0): TaxInput {
  return {
    grossRevenue,
    allowableExpenses,
    dividendIncome: 0,
    employmentType: 'self-employed',
    taxRegion: 'ruk',
    studentLoanPlan: 'none',
    voluntaryClass2NI: false,
    marriageAllowance: false,
    blindPersonsAllowance: false,
    pensionContribution: 0,
  }
}

// ── Additional-rate threshold: exact HMRC figures ─────────────────────────────
// The 45% rate starts at £125,140 of TAXABLE income (the higher-rate limit is a
// taxable-income figure). Regression guard for the bug where the band started at
// £112,570 (= £125,140 − PA) and over-taxed every additional-rate payer by £628.50.
describe('rUK additional-rate threshold (exact figures)', () => {
  it('higher-rate limit is £125,140 of taxable income', () => {
    expect(RUK_HIGHER_LIMIT).toBe(125_140)
  })

  it('£125,140 income (PA fully tapered) → £42,516 income tax', () => {
    // PA = 0, taxable = 125,140. Basic 37,700@20 + higher 87,440@40, no 45%.
    const r = calculateTax(seInput(125_140))
    expect(r.personalAllowance).toBe(0)
    expect(r.incomeTax).toBe(42_516)
    expect(r.taxBands.map(b => b.rate)).not.toContain(45)
  })

  it('£150,000 income → £53,703 income tax (HMRC published figure)', () => {
    // 37,700@20 = 7,540; 87,440@40 = 34,976; 24,860@45 = 11,187.
    const r = calculateTax(seInput(150_000))
    expect(r.incomeTax).toBe(53_703)
  })

  it('£160,000 income → £58,203 income tax', () => {
    // 37,700@20 = 7,540; 87,440@40 = 34,976; 34,860@45 = 15,687.
    const r = calculateTax(seInput(160_000))
    expect(r.incomeTax).toBe(58_203)
  })
})

// ── round2 utility ────────────────────────────────────────────────────────────
describe('round2', () => {
  it('rounds to 2dp', () => expect(round2(1.256)).toBe(1.26))
  it('zero stays zero', () => expect(round2(0)).toBe(0))
  it('truncates correctly', () => expect(round2(1.234)).toBe(1.23))
  it('eliminates float drift', () => expect(round2(0.1 + 0.2)).toBe(0.3))
})

// ── Personal Allowance taper ──────────────────────────────────────────────────
describe('calcPA', () => {
  it('full PA below taper start', () => expect(calcPA(99_999)).toBe(12_570))
  it('full PA at zero income',    () => expect(calcPA(0)).toBe(12_570))
  it('partial taper at £110,000', () => expect(calcPA(110_000)).toBe(7_570))
  it('zero PA at £125,140',       () => expect(calcPA(125_140)).toBe(0))
  it('zero PA above £125,140',    () => expect(calcPA(200_000)).toBe(0))
  it('taper: £1 above threshold reduces by £0', () => {
    // £100,001 → reduction = floor(1/2) = 0 → PA = 12,570
    expect(calcPA(100_001)).toBe(12_570)
  })
  it('taper: £2 above threshold reduces by £1', () => {
    expect(calcPA(100_002)).toBe(12_569)
  })
})

// ── Income tax — rUK ──────────────────────────────────────────────────────────
describe('rUK income tax', () => {
  it('no tax at personal allowance', () => {
    const r = calculateTax(seInput(12_570))
    expect(r.incomeTax).toBe(0)
    expect(r.taxableIncome).toBe(0)
  })

  it('basic rate only at £30,000', () => {
    const r = calculateTax(seInput(30_000))
    // taxable = 30,000 − 12,570 = 17,430 — all basic rate
    expect(r.incomeTax).toBe(round2(17_430 * 0.20))
    expect(r.taxBands).toHaveLength(1)
    expect(r.taxBands[0]!.rate).toBe(20)
  })

  it('basic rate band exhausted at £50,270', () => {
    const r = calculateTax(seInput(50_270))
    // taxable = 37,700 — exactly fills basic band
    expect(r.taxBands).toHaveLength(1)
    expect(r.taxBands[0]!.rate).toBe(20)
    expect(r.taxBands[0]!.amount).toBe(37_700)
  })

  it('higher rate kicks in above £50,270', () => {
    const r = calculateTax(seInput(60_000))
    const bands = r.taxBands.map(b => b.rate)
    expect(bands).toContain(20)
    expect(bands).toContain(40)
  })

  it('additional rate above £125,140', () => {
    const r = calculateTax(seInput(150_000))
    const bands = r.taxBands.map(b => b.rate)
    expect(bands).toContain(45)
  })

  it('60% trap flag at £110,000', () => {
    const r = calculateTax(seInput(110_000))
    expect(r.sixtyPercentTrap).toBe(true)
  })

  it('no 60% trap below £100,000', () => {
    const r = calculateTax(seInput(99_999))
    expect(r.sixtyPercentTrap).toBe(false)
  })

  it('no 60% trap at or above £125,140', () => {
    const r = calculateTax(seInput(125_140))
    expect(r.sixtyPercentTrap).toBe(false)
  })
})

// ── Scotland income tax ───────────────────────────────────────────────────────
describe('Scotland income tax', () => {
  it('starter rate at £15,000', () => {
    const r = calculateTax({ ...seInput(15_000), taxRegion: 'scotland' })
    expect(r.taxBands[0]!.rate).toBe(19)
  })

  it('no tax below PA in Scotland', () => {
    const r = calculateTax({ ...seInput(12_570), taxRegion: 'scotland' })
    expect(r.incomeTax).toBe(0)
  })
})

// ── NI Class 4 ────────────────────────────────────────────────────────────────
describe('NI Class 4 (self-employed)', () => {
  it('no NI below PT', () => {
    const r = calculateTax(seInput(12_570))
    expect(r.niClass4).toBe(0)
  })

  it('6% on income between PT and UEL', () => {
    const r = calculateTax(seInput(30_000))
    // niClass4 = (30,000 − 12,570) × 0.06
    expect(r.niClass4).toBe(round2((30_000 - 12_570) * 0.06))
  })

  it('2% rate above UEL (£50,270)', () => {
    const r = calculateTax(seInput(60_000))
    const main  = (50_270 - 12_570) * 0.06
    const upper = (60_000 - 50_270) * 0.02
    expect(r.niClass4).toBe(round2(main + upper))
  })
})

// ── NI Class 1 (employed) ─────────────────────────────────────────────────────
describe('NI Class 1 (employed)', () => {
  it('8% on income between PT and UEL', () => {
    const r = calculateTax({ ...seInput(30_000), employmentType: 'employed' })
    expect(r.niClass1).toBe(round2((30_000 - 12_570) * 0.08))
  })

  it('no Class 4 for employed', () => {
    const r = calculateTax({ ...seInput(30_000), employmentType: 'employed' })
    expect(r.niClass4).toBe(0)
  })
})

// ── NI Class 2 (self-employed) ────────────────────────────────────────────────
describe('NI Class 2', () => {
  it('deemed at or above SPT (£7,105)', () => {
    const r = calculateTax(seInput(7_105))
    expect(r.niClass2Deemed).toBe(true)
    expect(r.niClass2).toBe(0)
  })

  it('not deemed below SPT', () => {
    const r = calculateTax(seInput(7_104))
    expect(r.niClass2Deemed).toBe(false)
  })

  it('voluntary Class 2 when opted in below SPT', () => {
    const r = calculateTax({ ...seInput(5_000), voluntaryClass2NI: true })
    expect(r.niClass2).toBe(round2(3.65 * 52))
  })
})

// ── Student loan plans ────────────────────────────────────────────────────────
describe('Student loan repayment', () => {
  it('Plan 1: 9% on income above £26,900', () => {
    const r = calculateTax({ ...seInput(40_000), studentLoanPlan: 'plan1' })
    expect(r.studentLoanRepayment).toBe(round2((40_000 - 26_900) * 0.09))
  })

  it('Plan 2: 9% on income above £29,385', () => {
    const r = calculateTax({ ...seInput(40_000), studentLoanPlan: 'plan2' })
    expect(r.studentLoanRepayment).toBe(round2((40_000 - 29_385) * 0.09))
  })

  it('Plan 4: 9% on income above £33,795', () => {
    const r = calculateTax({ ...seInput(50_000), studentLoanPlan: 'plan4' })
    expect(r.studentLoanRepayment).toBe(round2((50_000 - 33_795) * 0.09))
  })

  it('Plan 5: 9% on income above £25,000', () => {
    const r = calculateTax({ ...seInput(40_000), studentLoanPlan: 'plan5' })
    expect(r.studentLoanRepayment).toBe(round2((40_000 - 25_000) * 0.09))
  })

  it('Postgraduate: 6% on income above £21,000', () => {
    const r = calculateTax({ ...seInput(35_000), studentLoanPlan: 'postgraduate' })
    expect(r.studentLoanRepayment).toBe(round2((35_000 - 21_000) * 0.06))
  })

  it('no repayment below threshold', () => {
    const r = calculateTax({ ...seInput(20_000), studentLoanPlan: 'plan2' })
    expect(r.studentLoanRepayment).toBe(0)
  })

  it('repayment base is grossProfit (before pension)', () => {
    // pension reduces taxable income but NOT student loan base
    const r = calculateTax({
      ...seInput(50_000),
      studentLoanPlan: 'plan2',
      pensionContribution: 10_000,
    })
    expect(r.studentLoanBase).toBe(50_000)
    expect(r.studentLoanRepayment).toBe(round2((50_000 - 29_385) * 0.09))
  })
})

// ── Pension contribution ──────────────────────────────────────────────────────
describe('Pension contribution', () => {
  it('reduces adjustedProfit and taxable income', () => {
    const base = calculateTax(seInput(60_000))
    const withPension = calculateTax({ ...seInput(60_000), pensionContribution: 10_000 })
    expect(withPension.adjustedProfit).toBe(base.adjustedProfit - 10_000)
    expect(withPension.incomeTax).toBeLessThan(base.incomeTax)
  })

  it('capped at £60,000 annual allowance', () => {
    const r = calculateTax({ ...seInput(200_000), pensionContribution: 80_000 })
    expect(r.pensionContribution).toBe(60_000)
  })

  it('capped at grossProfit if profit < pension input', () => {
    const r = calculateTax({ ...seInput(5_000), pensionContribution: 10_000 })
    expect(r.pensionContribution).toBe(5_000)
  })
})

// ── Dividend tax ──────────────────────────────────────────────────────────────
describe('Dividend tax', () => {
  it('first £500 is tax-free', () => {
    const r = calculateTax({ ...seInput(12_570), dividendIncome: 500 })
    expect(r.dividendTax).toBe(0)
  })

  it('10.75% on dividend income in basic band', () => {
    const r = calculateTax({ ...seInput(20_000), dividendIncome: 5_000 })
    expect(r.dividendTax).toBe(round2((5_000 - 500) * 0.1075))
  })
})

// ── Marriage & Blind persons allowance ───────────────────────────────────────
describe('Special allowances', () => {
  it('marriage allowance reduces PA by £1,260', () => {
    const base = calculateTax(seInput(30_000))
    const married = calculateTax({ ...seInput(30_000), marriageAllowance: true })
    expect(married.personalAllowance).toBe(base.personalAllowance - 1_260)
  })

  it('blind persons allowance increases PA by £3,250', () => {
    const base = calculateTax(seInput(30_000))
    const blind = calculateTax({ ...seInput(30_000), blindPersonsAllowance: true })
    expect(blind.personalAllowance).toBe(base.personalAllowance + 3_250)
  })
})

// ── Allowable expenses ────────────────────────────────────────────────────────
describe('Allowable expenses', () => {
  it('reduces gross profit', () => {
    const r = calculateTax(seInput(50_000, 10_000))
    expect(r.grossProfit).toBe(40_000)
  })

  it('negative profit is clamped to zero', () => {
    const r = calculateTax(seInput(10_000, 15_000))
    expect(r.grossProfit).toBe(0)
    expect(r.netTakeHome).toBe(0)
  })
})

// ── Validation ────────────────────────────────────────────────────────────────
describe('validateTaxInput', () => {
  it('rejects zero gross revenue', () => {
    const e = validateTaxInput(seInput(0))
    expect(e.grossRevenue).toBeDefined()
  })

  it('rejects expenses ≥ revenue', () => {
    const e = validateTaxInput(seInput(50_000, 50_000))
    expect(e.allowableExpenses).toBeDefined()
  })

  it('rejects negative dividend income', () => {
    const e = validateTaxInput({ ...seInput(40_000), dividendIncome: -1 })
    expect(e.dividendIncome).toBeDefined()
  })

  it('rejects pension > £60,000', () => {
    const e = validateTaxInput({ ...seInput(200_000), pensionContribution: 60_001 })
    expect(e.pensionContribution).toBeDefined()
  })

  it('passes valid input', () => {
    const e = validateTaxInput(seInput(40_000, 5_000))
    expect(Object.keys(e)).toHaveLength(0)
  })
})

// ── MTD warning ───────────────────────────────────────────────────────────────
describe('MTD warning', () => {
  it('fires when SE gross revenue > £50,000', () => {
    const r = calculateTax(seInput(50_001))
    expect(r.mtdWarning).toBe(true)
  })

  it('does not fire when gross revenue ≤ £50,000', () => {
    const r = calculateTax(seInput(50_000))
    expect(r.mtdWarning).toBe(false)
  })
})

// ── Monthly breakdown sanity ──────────────────────────────────────────────────
describe('Monthly breakdown', () => {
  it('monthly * 12 ≈ annual (within rounding tolerance)', () => {
    const r = calculateTax(seInput(60_000))
    expect(Math.abs(r.monthly.incomeTax * 12 - r.incomeTax)).toBeLessThan(1)
    expect(Math.abs(r.monthly.niClass4 * 12 - r.niClass4)).toBeLessThan(1)
  })
})

// ── Effective tax rate cap ────────────────────────────────────────────────────
describe('Effective tax rate', () => {
  it('never exceeds 100%', () => {
    const r = calculateTax(seInput(500_000))
    expect(r.effectiveTaxRate).toBeLessThanOrEqual(100)
  })
})
