// ─── TaxBible2026.ts — EasyAcco Hard-coded HMRC 2026/27 Scenario Engine ────────
// All figures are hard-coded. No API calls. Zero runtime cost.
// Five distinct user journeys with accurate HMRC 2026/27 logic.

// ─── Shared Constants ────────────────────────────────────────────────────────
export const TB = {
  // Personal Allowance
  PA_BASE:             12_570,
  PA_TAPER_START:      100_000,
  PA_TAPER_END:        125_140,
  MARRIAGE_ALLOWANCE:  1_260,
  BLIND_ALLOWANCE:     3_250,

  // Income Tax — rUK
  BASIC_RATE:          0.20,
  HIGHER_RATE:         0.40,
  ADDITIONAL_RATE:     0.45,
  BASIC_BAND_WIDTH:    37_700,    // £12,571–£50,270
  BASIC_LIMIT:         50_270,
  HIGHER_LIMIT:        125_140,

  // NI
  NI_PT:               12_570,    // Primary Threshold
  NI_UEL:              50_270,    // Upper Earnings Limit
  NI_CLASS1_MAIN:      0.08,      // Employee — Scenario 1
  NI_CLASS1_UPPER:     0.02,
  NI_CLASS4_MAIN:      0.06,      // Self-Employed — Scenario 1
  NI_CLASS4_UPPER:     0.02,
  NI_CLASS2_WEEKLY:    3.65,
  NI_CLASS2_SPT:       7_105,

  // Dividends — Scenario 5 (2026/27 Dividend Hike — effective 6 April 2026)
  DIV_ALLOWANCE:       500,
  DIV_BASIC_RATE:      0.1075,    // 10.75% (was 8.75%)
  DIV_HIGHER_RATE:     0.3575,    // 35.75% (was 33.75%)
  DIV_ADDL_RATE:       0.3935,    // 39.35%

  // Director optimal salary
  DIRECTOR_OPTIMAL_SALARY: 12_570,

  // Employer NI — 2026 Spike (effective 6 April 2026)
  EMPLOYER_NI_RATE:    0.15,      // 15% (was 13.8%)
  EMPLOYER_NI_THRESH:  5_000,     // Secondary Threshold dropped to £5,000

  // Student Loans 2026/27
  SL_PLAN1_THRESH:     26_900,
  SL_PLAN1_RATE:       0.09,
  SL_PLAN2_THRESH:     29_385,    // Updated 2026/27
  SL_PLAN2_RATE:       0.09,
  SL_PLAN5_THRESH:     25_000,    // New for 2026/27
  SL_PLAN5_RATE:       0.09,
  SL_POSTGRAD_THRESH:  21_000,
  SL_POSTGRAD_RATE:    0.06,

  // National Living Wage (effective 1 April 2026)
  NLW_RATE:            12.71,

  // Scotland Income Tax — band ceilings (absolute gross income)
  SCO_STARTER_END:      16_537,   // 19%
  SCO_BASIC_END:        29_526,   // 20%
  SCO_INTERMEDIATE_END: 43_662,   // 21%
  SCO_HIGHER_END:       75_000,   // 42%
  SCO_ADVANCED_END:     125_140,  // 45%
                                  // above: 48%

  // Job Loss — Scenario 4
  REDUNDANCY_EXEMPTION: 30_000,

  // Welfare — Scenario 3
  UC_TAXABLE:          false,     // Universal Credit is NOT taxable
  JSA_TAXABLE:         true,
  CARERS_TAXABLE:      true,
} as const

// ─── Utility ─────────────────────────────────────────────────────────────────
export function round2(n: number): number {
  return Math.round(n * 100) / 100
}
export function fmtGBP(n: number): string {
  return '£' + Math.round(Math.abs(n)).toLocaleString('en-GB')
}

// Personal Allowance taper
export function calcPA(adjustedIncome: number): number {
  if (adjustedIncome <= TB.PA_TAPER_START) return TB.PA_BASE
  const reduction = Math.floor((adjustedIncome - TB.PA_TAPER_START) / 2)
  return Math.max(0, TB.PA_BASE - reduction)
}

// rUK Income Tax on taxable income
export function calcIncomeTax(taxableIncome: number): number {
  if (taxableIncome <= 0) return 0
  let tax = 0
  let rem = taxableIncome
  const basic = Math.min(rem, TB.BASIC_BAND_WIDTH)
  tax += basic * TB.BASIC_RATE; rem -= basic
  if (rem > 0) {
    const higher = Math.min(rem, TB.HIGHER_LIMIT - TB.BASIC_LIMIT)
    tax += higher * TB.HIGHER_RATE; rem -= higher
  }
  if (rem > 0) tax += rem * TB.ADDITIONAL_RATE
  return round2(tax)
}

// Scotland Income Tax on gross income with PA
export function calcScotlandTax(grossIncome: number, pa: number): number {
  const taxable = Math.max(0, grossIncome - pa)
  if (taxable <= 0) return 0

  const LIMITS = [
    { rate: 0.19, ceiling: TB.SCO_STARTER_END },
    { rate: 0.20, ceiling: TB.SCO_BASIC_END },
    { rate: 0.21, ceiling: TB.SCO_INTERMEDIATE_END },
    { rate: 0.42, ceiling: TB.SCO_HIGHER_END },
    { rate: 0.45, ceiling: TB.SCO_ADVANCED_END },
    { rate: 0.48, ceiling: Infinity },
  ]

  let totalTax = 0
  let prev: number = TB.PA_BASE

  for (const { rate, ceiling } of LIMITS) {
    const lower  = Math.max(0, taxable - Math.max(0, prev    - pa))
    const upper  = Math.max(0, taxable - Math.max(0, ceiling - pa))
    const amount = lower - upper
    if (amount > 0) totalTax += amount * rate
    prev = ceiling
    if (prev >= grossIncome) break
  }

  return round2(totalTax)
}

// NI Class 1 (Employed / Director on salary)
export function calcClass1NI(earnings: number): number {
  if (earnings <= TB.NI_PT) return 0
  if (earnings <= TB.NI_UEL)
    return round2((earnings - TB.NI_PT) * TB.NI_CLASS1_MAIN)
  return round2(
    (TB.NI_UEL - TB.NI_PT) * TB.NI_CLASS1_MAIN +
    (earnings - TB.NI_UEL) * TB.NI_CLASS1_UPPER
  )
}

// NI Class 4 (Self-Employed on profit)
export function calcClass4NI(profit: number): number {
  if (profit <= TB.NI_PT) return 0
  if (profit <= TB.NI_UEL)
    return round2((profit - TB.NI_PT) * TB.NI_CLASS4_MAIN)
  return round2(
    (TB.NI_UEL - TB.NI_PT) * TB.NI_CLASS4_MAIN +
    (profit - TB.NI_UEL) * TB.NI_CLASS4_UPPER
  )
}

// Dividend tax (stacked on top of non-dividend income)
export function calcDividendTax(dividends: number, taxableNonDivIncome: number): number {
  if (dividends <= TB.DIV_ALLOWANCE) return 0
  const taxable = dividends - TB.DIV_ALLOWANCE
  let rem = taxable; let tax = 0
  const basicRemaining = Math.max(0, TB.BASIC_BAND_WIDTH - taxableNonDivIncome)
  const inBasic = Math.min(rem, basicRemaining)
  tax += inBasic * TB.DIV_BASIC_RATE; rem -= inBasic
  if (rem > 0) {
    const higherWidth = TB.HIGHER_LIMIT - TB.BASIC_LIMIT
    const nonDivAboveBasic = Math.max(0, taxableNonDivIncome - TB.BASIC_BAND_WIDTH)
    const higherRemaining = Math.max(0, higherWidth - nonDivAboveBasic)
    const inHigher = Math.min(rem, higherRemaining)
    tax += inHigher * TB.DIV_HIGHER_RATE; rem -= inHigher
  }
  if (rem > 0) tax += rem * TB.DIV_ADDL_RATE
  return round2(tax)
}

// ─── SCENARIO RESULT TYPE ────────────────────────────────────────────────────
export interface ScenarioResult {
  scenario:           string
  grossIncome:        number
  personalAllowance:  number
  taxableIncome:      number
  incomeTax:          number
  nationalInsurance:  number
  dividendTax:        number
  totalDeductions:    number
  netTakeHome:        number
  effectiveRate:      number
  taxProvision:       number   // for P&L: incomeTax + NI
  sixtyTrap:          boolean
  catMessage:         string
  lines:              { label: string; value: number; indent?: boolean; bold?: boolean; negative?: boolean }[]
}

// ─── SCENARIO 1: Standard Employed / Self-Employed ──────────────────────────
export interface S1Input {
  grossIncome:     number
  expenses:        number
  employmentType:  'employed' | 'self-employed'
  pension:         number
}
export function calcScenario1(inp: S1Input): ScenarioResult {
  const profit      = Math.max(0, inp.grossIncome - inp.expenses)
  const pensionCap  = Math.min(inp.pension, profit, 60_000)
  const adjusted    = Math.max(0, profit - pensionCap)
  const pa          = calcPA(adjusted)
  const taxable     = Math.max(0, adjusted - pa)
  const itax        = calcIncomeTax(taxable)
  const ni          = inp.employmentType === 'employed'
    ? calcClass1NI(adjusted)
    : calcClass4NI(adjusted)
  const total       = round2(itax + ni)
  const takeHome    = round2(Math.max(0, adjusted - total))
  const effRate     = adjusted > 0 ? round2((total / adjusted) * 100) : 0
  const niLabel     = inp.employmentType === 'employed' ? 'NI Class 1 (8%)' : 'NI Class 4 (6%)'
  return {
    scenario: inp.employmentType === 'employed' ? 'Employed' : 'Self-Employed',
    grossIncome: inp.grossIncome, personalAllowance: pa,
    taxableIncome: taxable, incomeTax: itax, nationalInsurance: ni,
    dividendTax: 0, totalDeductions: total, netTakeHome: takeHome,
    effectiveRate: effRate, taxProvision: total, sixtyTrap: false,
    catMessage: `Your effective rate is ${effRate}%. ${ni > 0 ? `You're paying ${fmtGBP(ni)} in ${niLabel}.` : ''}`,
    lines: [
      { label: 'Gross Income',        value: inp.grossIncome },
      { label: 'Allowable Expenses',  value: inp.expenses,   negative: true, indent: true },
      { label: 'Gross Profit',        value: profit,         bold: true },
      { label: 'Pension (SIPP)',       value: pensionCap,     negative: true, indent: true },
      { label: 'Adjusted Net Income', value: adjusted },
      { label: 'Personal Allowance',  value: pa,             negative: true, indent: true },
      { label: 'Taxable Income',      value: taxable,        bold: true },
      { label: 'Income Tax',          value: itax,           negative: true, indent: true },
      { label: niLabel,               value: ni,             negative: true, indent: true },
      { label: 'Net Take-Home',       value: takeHome,       bold: true },
    ],
  }
}

// ─── SCENARIO 2: High Earner £100k+ (60% Trap) ───────────────────────────────
export interface S2Input {
  grossIncome: number
  pension:     number
}
export function calcScenario2(inp: S2Input): ScenarioResult {
  const pensionCap  = Math.min(inp.pension, inp.grossIncome, 60_000)
  const adjusted    = Math.max(0, inp.grossIncome - pensionCap)
  const pa          = calcPA(adjusted)
  const taperLoss   = Math.max(0, TB.PA_BASE - pa)
  const taxable     = Math.max(0, adjusted - pa)
  const itax        = calcIncomeTax(taxable)
  const ni          = calcClass1NI(adjusted)
  const total       = round2(itax + ni)
  const takeHome    = round2(Math.max(0, adjusted - total))
  const effRate     = adjusted > 0 ? round2((total / adjusted) * 100) : 0
  const inTrap      = adjusted > TB.PA_TAPER_START && adjusted < TB.PA_TAPER_END
  const toEscape    = inTrap ? adjusted - TB.PA_TAPER_START : 0
  return {
    scenario: 'High Earner',
    grossIncome: inp.grossIncome, personalAllowance: pa,
    taxableIncome: taxable, incomeTax: itax, nationalInsurance: ni,
    dividendTax: 0, totalDeductions: total, netTakeHome: takeHome,
    effectiveRate: effRate, taxProvision: total, sixtyTrap: inTrap,
    catMessage: inTrap
      ? `⚠️ You're in the 60% Trap! Personal Allowance reduced by ${fmtGBP(taperLoss)}. Contribute ${fmtGBP(toEscape)} to a pension to escape and save ~${fmtGBP(Math.round(toEscape * 0.6))}!`
      : `You earn over £100k. PA tapered to ${fmtGBP(pa)}. Consider SIPP contributions for relief.`,
    lines: [
      { label: 'Gross Income',             value: inp.grossIncome },
      { label: 'Pension Contribution',     value: pensionCap,  negative: true, indent: true },
      { label: 'Adjusted Net Income',      value: adjusted },
      { label: `Personal Allowance (tapered from £12,570)`, value: pa, negative: true, indent: true },
      { label: 'PA Lost to Taper',         value: taperLoss,   negative: true, indent: true },
      { label: 'Taxable Income',           value: taxable,     bold: true },
      { label: 'Income Tax (incl. 60% zone)', value: itax,     negative: true, indent: true },
      { label: 'NI Class 1 (8%)',          value: ni,          negative: true, indent: true },
      { label: 'Net Take-Home',            value: takeHome,    bold: true },
    ],
  }
}

// ─── SCENARIO 3: Welfare & Support ────────────────────────────────────────────
export interface S3Input {
  universalCredit:  number   // tax-free
  jsaAmount:        number   // taxable
  carersAllowance:  number   // taxable
  otherIncome:      number   // taxable (e.g. part-time earnings)
}
export function calcScenario3(inp: S3Input): ScenarioResult {
  // UC is completely non-taxable — does NOT affect PA or tax bands
  const taxableIncome  = inp.jsaAmount + inp.carersAllowance + inp.otherIncome
  const pa             = calcPA(taxableIncome)
  const taxable        = Math.max(0, taxableIncome - pa)
  const itax           = calcIncomeTax(taxable)
  const ni             = calcClass1NI(taxableIncome)
  const total          = round2(itax + ni)
  const totalIncoming  = taxableIncome + inp.universalCredit
  const takeHome       = round2(Math.max(0, totalIncoming - total))
  const effRate        = taxableIncome > 0 ? round2((total / taxableIncome) * 100) : 0
  return {
    scenario: 'Welfare & Support',
    grossIncome: totalIncoming, personalAllowance: pa,
    taxableIncome: taxable, incomeTax: itax, nationalInsurance: ni,
    dividendTax: 0, totalDeductions: total, netTakeHome: takeHome,
    effectiveRate: effRate, taxProvision: total, sixtyTrap: false,
    catMessage: `Universal Credit is 100% tax-free! It won't touch your £12,570 allowance. ${
      inp.jsaAmount > 0 ? `JSA of ${fmtGBP(inp.jsaAmount)} is taxable income though.` : ''
    }`,
    lines: [
      { label: 'Universal Credit (Tax-Free)',  value: inp.universalCredit },
      { label: 'JSA (Taxable)',                value: inp.jsaAmount,       indent: true },
      { label: "Carer's Allowance (Taxable)",  value: inp.carersAllowance, indent: true },
      { label: 'Other Income (Taxable)',       value: inp.otherIncome,     indent: true },
      { label: 'Total Taxable Income',         value: taxableIncome,       bold: true },
      { label: 'Personal Allowance',           value: pa,                  negative: true, indent: true },
      { label: 'Taxable After PA',             value: taxable },
      { label: 'Income Tax',                   value: itax,                negative: true, indent: true },
      { label: 'National Insurance',           value: ni,                  negative: true, indent: true },
      { label: 'Total In-Hand (incl. UC)',     value: takeHome,            bold: true },
    ],
  }
}

// ─── SCENARIO 4: Job Loss & Redundancy ────────────────────────────────────────
// The £30,000 Rule + PAYE Refund Logic
export interface S4Input {
  annualSalary:       number   // full-year salary
  monthsWorked:       number   // 1–12 (stopped work mid-year)
  redundancyPayment:  number   // total package received
  paydeTaxPaid:       number   // PAYE tax actually deducted so far
}
export function calcScenario4(inp: S4Input): ScenarioResult {
  const monthsWorked    = Math.max(1, Math.min(12, inp.monthsWorked))
  const earnedIncome    = round2((inp.annualSalary / 12) * monthsWorked)
  const taxFreeRedund   = Math.min(inp.redundancyPayment, TB.REDUNDANCY_EXEMPTION)
  const taxableRedund   = Math.max(0, inp.redundancyPayment - TB.REDUNDANCY_EXEMPTION)
  const totalTaxable    = earnedIncome + taxableRedund
  const pa              = calcPA(totalTaxable)
  const taxable         = Math.max(0, totalTaxable - pa)
  const itaxDue         = calcIncomeTax(taxable)
  const ni              = calcClass1NI(earnedIncome)
  const total           = round2(itaxDue + ni)
  // PAYE Refund: tax already collected vs actual liability
  const refund          = round2(Math.max(0, inp.paydeTaxPaid - itaxDue))
  const takeHome        = round2(earnedIncome + taxFreeRedund + taxableRedund - itaxDue - ni)
  const effRate         = totalTaxable > 0 ? round2((total / totalTaxable) * 100) : 0
  return {
    scenario: 'Job Loss & Redundancy',
    grossIncome: earnedIncome + inp.redundancyPayment,
    personalAllowance: pa, taxableIncome: taxable,
    incomeTax: itaxDue, nationalInsurance: ni,
    dividendTax: 0, totalDeductions: total,
    netTakeHome: takeHome, effectiveRate: effRate,
    taxProvision: total, sixtyTrap: false,
    catMessage: refund > 0
      ? `I've applied your £30k redundancy exemption. You're keeping every penny you're entitled to. Plus you may be owed a PAYE refund of ${fmtGBP(refund)} — contact HMRC!`
      : `I've applied your ${fmtGBP(taxFreeRedund)} tax-free redundancy exemption. The first £30k is always yours free!`,
    lines: [
      { label: `Salary Earned (${monthsWorked} months)`, value: earnedIncome },
      { label: 'Redundancy Payment',          value: inp.redundancyPayment },
      { label: `Tax-Free Redundancy (£30k rule)`, value: taxFreeRedund,   negative: true, indent: true },
      { label: 'Taxable Redundancy',          value: taxableRedund,        indent: true },
      { label: 'Total Taxable Income',        value: totalTaxable,         bold: true },
      { label: 'Personal Allowance',          value: pa,                   negative: true, indent: true },
      { label: 'Taxable After PA',            value: taxable },
      { label: 'Income Tax Due',              value: itaxDue,              negative: true, indent: true },
      { label: 'PAYE Tax Already Paid',       value: inp.paydeTaxPaid,     negative: true, indent: true },
      { label: 'PAYE Refund Owed',            value: refund,               bold: true },
      { label: 'NI Class 1 (8%)',             value: ni,                   negative: true, indent: true },
      { label: 'Estimated Net Position',      value: takeHome,             bold: true },
    ],
  }
}

// ─── SCENARIO 5: The Director (Salary + Dividends) ───────────────────────────
export interface S5Input {
  salary:    number   // recommended: £12,570 to minimise NI
  dividends: number   // company profit paid as dividends
  pension:   number   // director pension contribution
}
export function calcScenario5(inp: S5Input): ScenarioResult {
  const salary      = inp.salary
  const divs        = inp.dividends
  const pensionCap  = Math.min(inp.pension, salary, 60_000)
  const adjustedSal = Math.max(0, salary - pensionCap)

  // NI only on salary (NOT dividends) — after pension (salary sacrifice reduces NI-able pay)
  const ni          = calcClass1NI(adjustedSal)

  // PA taper uses salary + dividends
  const pa          = calcPA(adjustedSal + divs)

  // Income tax: salary uses PA first, then dividends stack on top
  const salTaxable  = Math.max(0, adjustedSal - pa)
  const itaxSal     = calcIncomeTax(salTaxable)
  const divTax      = calcDividendTax(divs, salTaxable)
  const itaxTotal   = round2(itaxSal + divTax)

  const total       = round2(itaxTotal + ni)
  const takeHome    = round2(Math.max(0, adjustedSal + divs - total))
  const totalIncome = adjustedSal + divs
  const effRate     = totalIncome > 0 ? round2((total / totalIncome) * 100) : 0

  const niSaving    = round2(calcClass4NI(totalIncome) - ni)   // NI saved vs self-employed

  return {
    scenario: 'Director (Salary + Dividends)',
    grossIncome: salary + divs, personalAllowance: pa,
    taxableIncome: salTaxable, incomeTax: itaxTotal, nationalInsurance: ni,
    dividendTax: divTax, totalDeductions: total, netTakeHome: takeHome,
    effectiveRate: effRate, taxProvision: total, sixtyTrap: false,
    catMessage: `Brilliant move! By taking ${fmtGBP(divs)} in dividends, you're avoiding 8% NI on your top earnings. ${
      niSaving > 0 ? `Estimated NI saving vs self-employed: ${fmtGBP(niSaving)}.` : ''
    } ${
      salary === TB.DIRECTOR_OPTIMAL_SALARY ? '✓ Optimal £12,570 salary — no NI, full State Pension credit.' : ''
    }`,
    lines: [
      { label: 'Director Salary',            value: salary },
      { label: 'Pension Contribution',       value: pensionCap,  negative: true, indent: true },
      { label: 'Adjusted Salary',            value: adjustedSal },
      { label: 'Dividends',                  value: divs },
      { label: `Dividend Allowance (${fmtGBP(TB.DIV_ALLOWANCE)} tax-free)`, value: Math.min(divs, TB.DIV_ALLOWANCE), negative: true, indent: true },
      { label: 'Personal Allowance',         value: pa,          negative: true, indent: true },
      { label: 'Income Tax (salary)',        value: itaxSal,     negative: true, indent: true },
      { label: 'Dividend Tax',               value: divTax,      negative: true, indent: true },
      { label: 'NI Class 1 on Salary',       value: ni,          negative: true, indent: true },
      { label: 'Net Take-Home',              value: takeHome,    bold: true },
    ],
  }
}

// ─── Student Loan Repayment ──────────────────────────────────────────────────
export type StudentLoanPlan = 'plan1' | 'plan2' | 'plan5' | 'postgrad'
export function calcStudentLoan(grossIncome: number, plan: StudentLoanPlan): number {
  const cfg = {
    plan1:    { threshold: TB.SL_PLAN1_THRESH,    rate: TB.SL_PLAN1_RATE },
    plan2:    { threshold: TB.SL_PLAN2_THRESH,    rate: TB.SL_PLAN2_RATE },
    plan5:    { threshold: TB.SL_PLAN5_THRESH,    rate: TB.SL_PLAN5_RATE },
    postgrad: { threshold: TB.SL_POSTGRAD_THRESH, rate: TB.SL_POSTGRAD_RATE },
  }[plan]
  if (grossIncome <= cfg.threshold) return 0
  return round2((grossIncome - cfg.threshold) * cfg.rate)
}

// ─── Employer NI ─────────────────────────────────────────────────────────────
export function calcEmployerNI(salary: number): number {
  if (salary <= TB.EMPLOYER_NI_THRESH) return 0
  return round2((salary - TB.EMPLOYER_NI_THRESH) * TB.EMPLOYER_NI_RATE)
}

// ─── Cat Messages by scenario type ────────────────────────────────────────────
export const CAT_GREETINGS: Record<string, string> = {
  employed:     'Ready to audit your 2026/27 finances?',
  'self-employed': 'Let\'s make sure HMRC doesn\'t take a penny more than they should!',
  welfare:      'Universal Credit is tax-free! It won\'t touch your £12,570 allowance.',
  redundancy:   'I\'ve applied your £30k redundancy exemption. You\'re keeping every penny you\'re entitled to.',
  director:     'Brilliant move! By taking dividends, you\'re avoiding the 8% NI on your top earnings.',
  high_earner:  'You\'re in the 60% trap zone. A SIPP contribution could save you thousands!',
}
