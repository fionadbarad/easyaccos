// ─── TaxBible2026.ts — EasyAcco Hard-coded HMRC 2026/27 Scenario Engine ────────
// All figures are hard-coded. No API calls. Zero runtime cost.
// Five distinct user journeys with accurate HMRC 2026/27 logic.
import {
  round2,
  fmtGBP,
  calcPA as calcPACore,
  calcRukTax as calcRukTaxCore,
  calcScotlandTax as calcScotlandTaxCore,
  calcClass1NI as calcClass1NICore,
  calcClass4NI as calcClass4NICore,
  calcDividendTax as calcDividendTaxCore,
  calcStudentLoan as calcStudentLoanCore,
  type StudentLoanPlan as CoreStudentLoanPlan,
} from './tax-logic'
import * as B from './tax/bands-2026'
export { round2, fmtGBP }

// ─── Shared Constants ────────────────────────────────────────────────────────
// All numbers sourced from lib/tax/bands-2026 — edit that file to update rates.
export const TB = {
  // Personal Allowance
  PA_BASE:             B.PA_BASE,
  PA_TAPER_START:      B.PA_TAPER_START,
  PA_TAPER_END:        B.PA_TAPER_END,
  MARRIAGE_ALLOWANCE:  B.MARRIAGE_ALLOWANCE_XFER,
  BLIND_ALLOWANCE:     B.BLIND_PERSONS_ALLOWANCE,

  // Income Tax — rUK
  BASIC_RATE:          B.RUK_BASIC_RATE,
  HIGHER_RATE:         B.RUK_HIGHER_RATE,
  ADDITIONAL_RATE:     B.RUK_ADDITIONAL_RATE,
  BASIC_BAND_WIDTH:    B.RUK_BASIC_RATE_WIDTH,
  BASIC_LIMIT:         B.RUK_BASIC_LIMIT,
  HIGHER_LIMIT:        B.RUK_HIGHER_LIMIT,

  // NI
  NI_PT:               B.NI_PT,
  NI_UEL:              B.NI_UEL,
  NI_CLASS1_MAIN:      B.NI_C1_MAIN,
  NI_CLASS1_UPPER:     B.NI_C1_UPPER,
  NI_CLASS4_MAIN:      B.NI_C4_MAIN,
  NI_CLASS4_UPPER:     B.NI_C4_UPPER,
  NI_CLASS2_WEEKLY:    B.NI_C2_WEEKLY,
  NI_CLASS2_SPT:       B.NI_CLASS2_SPT,

  // Dividends
  DIV_ALLOWANCE:       B.DIV_ALLOWANCE,
  DIV_BASIC_RATE:      B.DIV_BASIC,
  DIV_HIGHER_RATE:     B.DIV_HIGHER,
  DIV_ADDL_RATE:       B.DIV_ADDL,

  // Director optimal salary
  DIRECTOR_OPTIMAL_SALARY: B.DIRECTOR_OPTIMAL_SALARY,

  // Employer NI — 2026 Spike
  EMPLOYER_NI_RATE:    B.EMPLOYER_NI_RATE,
  EMPLOYER_NI_THRESH:  B.EMPLOYER_NI_THRESH,

  // Student Loans 2026/27
  SL_PLAN1_THRESH:     B.SL_PLAN1_THRESH,
  SL_PLAN1_RATE:       B.SL_PLAN_RATE,
  SL_PLAN2_THRESH:     B.SL_PLAN2_THRESH,
  SL_PLAN2_RATE:       B.SL_PLAN_RATE,
  SL_PLAN5_THRESH:     B.SL_PLAN5_THRESH,
  SL_PLAN5_RATE:       B.SL_PLAN_RATE,
  SL_POSTGRAD_THRESH:  B.SL_POSTGRAD_THRESH,
  SL_POSTGRAD_RATE:    B.SL_POSTGRAD_RATE,

  // National Living Wage
  NLW_RATE:            B.NLW_RATE,

  // Scotland Income Tax
  SCO_STARTER_END:      B.SCO_STARTER_END,
  SCO_BASIC_END:        B.SCO_BASIC_END,
  SCO_INTERMEDIATE_END: B.SCO_INTERMEDIATE_END,
  SCO_HIGHER_END:       B.SCO_HIGHER_END,
  SCO_ADVANCED_END:     B.SCO_ADVANCED_END,

  // Job Loss — Scenario 4
  REDUNDANCY_EXEMPTION: B.REDUNDANCY_EXEMPTION,

  // Welfare — Scenario 3
  UC_TAXABLE:          false,     // Universal Credit is NOT taxable
  JSA_TAXABLE:         true,
  CARERS_TAXABLE:      true,
} as const

// ─── Utility ─────────────────────────────────────────────────────────────────
// round2 and fmtGBP re-exported from tax-logic (single source of truth)

// Personal Allowance taper — thin wrapper preserving TB constant references
export function calcPA(adjustedIncome: number): number {
  return calcPACore(adjustedIncome)
}

// rUK Income Tax on taxable income — thin number-returning wrapper around tax-logic
export function calcIncomeTax(taxableIncome: number): number {
  return calcRukTaxCore(taxableIncome).tax
}

// Scotland Income Tax on gross income with PA — number-returning wrapper
export function calcScotlandTax(grossIncome: number, pa: number): number {
  return calcScotlandTaxCore(grossIncome, pa).tax
}

// NI Class 1 (Employed / Director on salary) — re-export from canonical engine
export const calcClass1NI = calcClass1NICore

// NI Class 4 (Self-Employed on profit) — re-export from canonical engine
export const calcClass4NI = calcClass4NICore

// Dividend tax (stacked on top of non-dividend income) — defaults to rUK band widths
export function calcDividendTax(dividends: number, taxableNonDivIncome: number): number {
  return calcDividendTaxCore(dividends, taxableNonDivIncome, 'ruk')
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
// Scenario UX uses a shorter plan-key set; map to the canonical engine's keys.
export type StudentLoanPlan = 'plan1' | 'plan2' | 'plan5' | 'postgrad'
const SL_PLAN_MAP: Record<StudentLoanPlan, CoreStudentLoanPlan> = {
  plan1:    'plan1',
  plan2:    'plan2',
  plan5:    'plan5',
  postgrad: 'postgraduate',
}
export function calcStudentLoan(grossIncome: number, plan: StudentLoanPlan): number {
  return calcStudentLoanCore(grossIncome, SL_PLAN_MAP[plan])
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
