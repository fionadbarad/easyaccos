// ─── tax-scenarios.ts — EasyAcco HMRC 2026/27 Scenario Engine ────────────────
// Five UX-shaped wrappers that compose canonical tax math.
//   numbers  → bands-2026.ts        (single source of truth)
//   formulas → tax-logic.ts         (single source of truth)
// This file owns ONLY the scenario shape: input/output types and per-journey
// narration. Add a constant here and you have already lost.

import {
  round2,
  fmtGBP,
  calcPA,
  calcRukTax,
  calcClass1NI,
  calcClass4NI,
  calcDividendTax,
} from './tax-logic'
import {
  PA_BASE,
  PA_TAPER_START,
  PA_TAPER_END,
  DIV_ALLOWANCE,
  DIRECTOR_OPTIMAL_SALARY,
  REDUNDANCY_EXEMPTION,
} from './tax/bands-2026'

export { round2, fmtGBP }

// ─── Scenario result shape ───────────────────────────────────────────────────
export interface ScenarioLine {
  label:    string
  value:    number
  indent?:  boolean
  bold?:    boolean
  negative?: boolean
}

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
  taxProvision:       number   // P&L convention: incomeTax + NI
  sixtyTrap:          boolean
  catMessage:         string
  lines:              ScenarioLine[]
}

const PENSION_ANNUAL_CAP = 60_000
const rukIncomeTax = (taxable: number) => calcRukTax(taxable).tax
const effective    = (deductions: number, base: number) =>
  base > 0 ? round2((deductions / base) * 100) : 0

// ─── SCENARIO 1: Standard Employed / Self-Employed ───────────────────────────
export interface S1Input {
  grossIncome:    number
  expenses:       number
  employmentType: 'employed' | 'self-employed'
  pension:        number
}
export function calcScenario1(inp: S1Input): ScenarioResult {
  const profit     = Math.max(0, inp.grossIncome - inp.expenses)
  const pensionCap = Math.min(inp.pension, profit, PENSION_ANNUAL_CAP)
  const adjusted   = Math.max(0, profit - pensionCap)
  const pa         = calcPA(adjusted)
  const taxable    = Math.max(0, adjusted - pa)
  const itax       = rukIncomeTax(taxable)
  const ni         = inp.employmentType === 'employed'
    ? calcClass1NI(adjusted)
    : calcClass4NI(adjusted)
  const total      = round2(itax + ni)
  const takeHome   = round2(Math.max(0, adjusted - total))
  const effRate    = effective(total, adjusted)
  const niLabel    = inp.employmentType === 'employed' ? 'NI Class 1 (8%)' : 'NI Class 4 (6%)'

  return {
    scenario:          inp.employmentType === 'employed' ? 'Employed' : 'Self-Employed',
    grossIncome:       inp.grossIncome,
    personalAllowance: pa,
    taxableIncome:     taxable,
    incomeTax:         itax,
    nationalInsurance: ni,
    dividendTax:       0,
    totalDeductions:   total,
    netTakeHome:       takeHome,
    effectiveRate:     effRate,
    taxProvision:      total,
    sixtyTrap:         false,
    catMessage:        `Your effective rate is ${effRate}%.${ni > 0 ? ` You're paying ${fmtGBP(ni)} in ${niLabel}.` : ''}`,
    lines: [
      { label: 'Gross Income',        value: inp.grossIncome },
      { label: 'Allowable Expenses',  value: inp.expenses,   negative: true, indent: true },
      { label: 'Gross Profit',        value: profit,         bold: true },
      { label: 'Pension (SIPP)',      value: pensionCap,     negative: true, indent: true },
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
  const pensionCap = Math.min(inp.pension, inp.grossIncome, PENSION_ANNUAL_CAP)
  const adjusted   = Math.max(0, inp.grossIncome - pensionCap)
  const pa         = calcPA(adjusted)
  const paLost     = Math.max(0, PA_BASE - pa)
  const taxable    = Math.max(0, adjusted - pa)
  const itax       = rukIncomeTax(taxable)
  const ni         = calcClass1NI(adjusted)
  const total      = round2(itax + ni)
  const takeHome   = round2(Math.max(0, adjusted - total))
  const effRate    = effective(total, adjusted)
  const inTrap     = adjusted > PA_TAPER_START && adjusted < PA_TAPER_END
  const toEscape   = inTrap ? adjusted - PA_TAPER_START : 0

  return {
    scenario:          'High Earner',
    grossIncome:       inp.grossIncome,
    personalAllowance: pa,
    taxableIncome:     taxable,
    incomeTax:         itax,
    nationalInsurance: ni,
    dividendTax:       0,
    totalDeductions:   total,
    netTakeHome:       takeHome,
    effectiveRate:     effRate,
    taxProvision:      total,
    sixtyTrap:         inTrap,
    catMessage:        inTrap
      ? `⚠️ You're in the 60% Trap! Personal Allowance reduced by ${fmtGBP(paLost)}. Contribute ${fmtGBP(toEscape)} to a pension to escape and save ~${fmtGBP(Math.round(toEscape * 0.6))}.`
      : `You earn over ${fmtGBP(PA_TAPER_START)}. PA tapered to ${fmtGBP(pa)}. Consider SIPP contributions for relief.`,
    lines: [
      { label: 'Gross Income',                                       value: inp.grossIncome },
      { label: 'Pension Contribution',                               value: pensionCap, negative: true, indent: true },
      { label: 'Adjusted Net Income',                                value: adjusted },
      { label: `Personal Allowance (tapered from ${fmtGBP(PA_BASE)})`, value: pa,         negative: true, indent: true },
      { label: 'PA Lost to Taper',                                   value: paLost,     negative: true, indent: true },
      { label: 'Taxable Income',                                     value: taxable,    bold: true },
      { label: 'Income Tax (incl. 60% zone)',                        value: itax,       negative: true, indent: true },
      { label: 'NI Class 1 (8%)',                                    value: ni,         negative: true, indent: true },
      { label: 'Net Take-Home',                                      value: takeHome,   bold: true },
    ],
  }
}

// ─── SCENARIO 3: Welfare & Support ───────────────────────────────────────────
// Universal Credit is non-taxable and does NOT consume PA.
export interface S3Input {
  universalCredit: number   // tax-free
  jsaAmount:       number   // taxable
  carersAllowance: number   // taxable
  otherIncome:     number   // taxable (e.g. part-time earnings)
}
export function calcScenario3(inp: S3Input): ScenarioResult {
  const taxableIncome = inp.jsaAmount + inp.carersAllowance + inp.otherIncome
  const pa            = calcPA(taxableIncome)
  const taxable       = Math.max(0, taxableIncome - pa)
  const itax          = rukIncomeTax(taxable)
  const ni            = calcClass1NI(taxableIncome)
  const total         = round2(itax + ni)
  const totalIncoming = taxableIncome + inp.universalCredit
  const takeHome      = round2(Math.max(0, totalIncoming - total))
  const effRate       = effective(total, taxableIncome)

  return {
    scenario:          'Welfare & Support',
    grossIncome:       totalIncoming,
    personalAllowance: pa,
    taxableIncome:     taxable,
    incomeTax:         itax,
    nationalInsurance: ni,
    dividendTax:       0,
    totalDeductions:   total,
    netTakeHome:       takeHome,
    effectiveRate:     effRate,
    taxProvision:      total,
    sixtyTrap:         false,
    catMessage:        `Universal Credit is 100% tax-free — it won't touch your ${fmtGBP(PA_BASE)} allowance.${
      inp.jsaAmount > 0 ? ` JSA of ${fmtGBP(inp.jsaAmount)} is taxable income though.` : ''
    }`,
    lines: [
      { label: 'Universal Credit (Tax-Free)', value: inp.universalCredit },
      { label: 'JSA (Taxable)',               value: inp.jsaAmount,       indent: true },
      { label: "Carer's Allowance (Taxable)", value: inp.carersAllowance, indent: true },
      { label: 'Other Income (Taxable)',      value: inp.otherIncome,     indent: true },
      { label: 'Total Taxable Income',        value: taxableIncome,       bold: true },
      { label: 'Personal Allowance',          value: pa,                  negative: true, indent: true },
      { label: 'Taxable After PA',            value: taxable },
      { label: 'Income Tax',                  value: itax,                negative: true, indent: true },
      { label: 'National Insurance',          value: ni,                  negative: true, indent: true },
      { label: 'Total In-Hand (incl. UC)',    value: takeHome,            bold: true },
    ],
  }
}

// ─── SCENARIO 4: Job Loss & Redundancy ───────────────────────────────────────
// £30,000 redundancy exemption + PAYE refund logic.
export interface S4Input {
  annualSalary:      number   // full-year salary
  monthsWorked:      number   // 1–12 (stopped work mid-year)
  redundancyPayment: number   // total package received
  payeTaxPaid:       number   // PAYE actually deducted so far
}
export function calcScenario4(inp: S4Input): ScenarioResult {
  const months         = Math.max(1, Math.min(12, inp.monthsWorked))
  const earned         = round2((inp.annualSalary / 12) * months)
  const taxFreeRedund  = Math.min(inp.redundancyPayment, REDUNDANCY_EXEMPTION)
  const taxableRedund  = Math.max(0, inp.redundancyPayment - REDUNDANCY_EXEMPTION)
  const totalTaxable   = earned + taxableRedund
  const pa             = calcPA(totalTaxable)
  const taxable        = Math.max(0, totalTaxable - pa)
  const itaxDue        = rukIncomeTax(taxable)
  const ni             = calcClass1NI(earned)
  const total          = round2(itaxDue + ni)
  const refund         = round2(Math.max(0, inp.payeTaxPaid - itaxDue))
  const takeHome       = round2(earned + taxFreeRedund + taxableRedund - itaxDue - ni)
  const effRate        = effective(total, totalTaxable)

  return {
    scenario:          'Job Loss & Redundancy',
    grossIncome:       earned + inp.redundancyPayment,
    personalAllowance: pa,
    taxableIncome:     taxable,
    incomeTax:         itaxDue,
    nationalInsurance: ni,
    dividendTax:       0,
    totalDeductions:   total,
    netTakeHome:       takeHome,
    effectiveRate:     effRate,
    taxProvision:      total,
    sixtyTrap:         false,
    catMessage:        refund > 0
      ? `${fmtGBP(taxFreeRedund)} redundancy exemption applied. You may be owed a PAYE refund of ${fmtGBP(refund)} — contact HMRC.`
      : `${fmtGBP(taxFreeRedund)} tax-free redundancy exemption applied. The first ${fmtGBP(REDUNDANCY_EXEMPTION)} is always yours free.`,
    lines: [
      { label: `Salary Earned (${months} months)`,            value: earned },
      { label: 'Redundancy Payment',                          value: inp.redundancyPayment },
      { label: `Tax-Free Redundancy (${fmtGBP(REDUNDANCY_EXEMPTION)} rule)`, value: taxFreeRedund,        negative: true, indent: true },
      { label: 'Taxable Redundancy',                          value: taxableRedund,        indent: true },
      { label: 'Total Taxable Income',                        value: totalTaxable,         bold: true },
      { label: 'Personal Allowance',                          value: pa,                   negative: true, indent: true },
      { label: 'Taxable After PA',                            value: taxable },
      { label: 'Income Tax Due',                              value: itaxDue,              negative: true, indent: true },
      { label: 'PAYE Tax Already Paid',                       value: inp.payeTaxPaid,      negative: true, indent: true },
      { label: 'PAYE Refund Owed',                            value: refund,               bold: true },
      { label: 'NI Class 1 (8%)',                             value: ni,                   negative: true, indent: true },
      { label: 'Estimated Net Position',                      value: takeHome,             bold: true },
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
  const { salary, dividends } = inp
  const pensionCap  = Math.min(inp.pension, salary, PENSION_ANNUAL_CAP)
  const adjustedSal = Math.max(0, salary - pensionCap)

  // NI: salary only (after pension sacrifice). Dividends are NI-free.
  const ni          = calcClass1NI(adjustedSal)
  // PA taper: combined adjusted income.
  const pa          = calcPA(adjustedSal + dividends)
  // Income tax: salary consumes PA first, dividends stack on top.
  const salTaxable  = Math.max(0, adjustedSal - pa)
  const itaxSal     = rukIncomeTax(salTaxable)
  const divTax      = calcDividendTax(dividends, salTaxable)
  const itaxTotal   = round2(itaxSal + divTax)

  const total       = round2(itaxTotal + ni)
  const totalIncome = adjustedSal + dividends
  const takeHome    = round2(Math.max(0, totalIncome - total))
  const effRate     = effective(total, totalIncome)
  const niSaving    = round2(calcClass4NI(totalIncome) - ni)   // vs self-employed

  return {
    scenario:          'Director (Salary + Dividends)',
    grossIncome:       salary + dividends,
    personalAllowance: pa,
    taxableIncome:     salTaxable,
    incomeTax:         itaxTotal,
    nationalInsurance: ni,
    dividendTax:       divTax,
    totalDeductions:   total,
    netTakeHome:       takeHome,
    effectiveRate:     effRate,
    taxProvision:      total,
    sixtyTrap:         false,
    catMessage:        [
      `By taking ${fmtGBP(dividends)} in dividends, you avoid 8% NI on the top slice.`,
      niSaving > 0   ? `Estimated NI saving vs self-employed: ${fmtGBP(niSaving)}.` : '',
      salary === DIRECTOR_OPTIMAL_SALARY
        ? `✓ Optimal ${fmtGBP(DIRECTOR_OPTIMAL_SALARY)} salary — no NI, full State Pension credit.`
        : '',
    ].filter(Boolean).join(' '),
    lines: [
      { label: 'Director Salary',                                                    value: salary },
      { label: 'Pension Contribution',                                               value: pensionCap, negative: true, indent: true },
      { label: 'Adjusted Salary',                                                    value: adjustedSal },
      { label: 'Dividends',                                                          value: dividends },
      { label: `Dividend Allowance (${fmtGBP(DIV_ALLOWANCE)} tax-free)`,             value: Math.min(dividends, DIV_ALLOWANCE), negative: true, indent: true },
      { label: 'Personal Allowance',                                                 value: pa,         negative: true, indent: true },
      { label: 'Income Tax (salary)',                                                value: itaxSal,    negative: true, indent: true },
      { label: 'Dividend Tax',                                                       value: divTax,     negative: true, indent: true },
      { label: 'NI Class 1 on Salary',                                               value: ni,         negative: true, indent: true },
      { label: 'Net Take-Home',                                                      value: takeHome,   bold: true },
    ],
  }
}
