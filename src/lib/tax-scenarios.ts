// ─── tax-scenarios.ts — EasyAcco HMRC 2026/27 Scenario Engine ────────────────
// Five UX-shaped wrappers that compose canonical tax math.
//   numbers  → bands-2026.ts        (single source of truth)
//   formulas → tax-logic.ts         (single source of truth)
// This file owns ONLY the scenario shape: input/output types and per-journey
// narration. Add a constant here and you have already lost.

import {
  round2,
  calcPA,
  calcRukTax,
  calcClass1NI,
  calcClass4NI,
  calcDividendTax,
  annualAllowance,
} from './tax-logic'
import { fmtGBP } from './formatters'
import {
  PA_BASE,
  PA_TAPER_START,
  PA_TAPER_END,
  DIV_ALLOWANCE,
  DIRECTOR_OPTIMAL_SALARY,
  REDUNDANCY_EXEMPTION,
  PENSION_BASIC_RELIEF_RATE,
} from './tax/bands-2026'

export { round2 }

// ─── Scenario result shape ───────────────────────────────────────────────────
export interface ScenarioLine {
  label: string
  value: number
  indent?: boolean
  bold?: boolean
  negative?: boolean
}

export interface ScenarioResult {
  scenario: string
  grossIncome: number
  personalAllowance: number
  taxableIncome: number
  incomeTax: number
  nationalInsurance: number
  dividendTax: number
  totalDeductions: number
  netTakeHome: number
  effectiveRate: number
  taxProvision: number // P&L convention: incomeTax + NI
  sixtyTrap: boolean
  catMessage: string
  lines: ScenarioLine[]
}

const rukIncomeTax = (taxable: number, bandExtension = 0) => calcRukTax(taxable, bandExtension).tax
const effective = (deductions: number, base: number) =>
  base > 0 ? round2((deductions / base) * 100) : 0

// SIPP relief at source, mirroring calculateTax (TAX-10). `earnings` is the
// relievable trading/salary income; `dividends` are relevant only for the AA
// income tests (they are not themselves relievable). Returns the gross
// contribution actually relieved (capped at relevant earnings and the tapered
// annual allowance), its 20% at-source top-up, the net out-of-pocket cost, and
// the pension-band extension to apply to the rUK bands.
function sippRelief(earnings: number, dividends: number, requested: number) {
  const req = Math.max(0, requested)
  const adjustedIncome = Math.max(0, earnings) + dividends
  const earningsCapped = Math.min(req, Math.max(0, earnings))
  const thresholdIncome = Math.max(0, adjustedIncome - earningsCapped)
  const aa = annualAllowance({ thresholdIncome, adjustedIncome })
  const gross = Math.min(earningsCapped, aa)
  const reliefAtSource = round2(gross * PENSION_BASIC_RELIEF_RATE)
  return {
    gross,
    reliefAtSource,
    netCost: round2(gross - reliefAtSource),
    // adjusted net income (income less the gross contribution) — PA taper base
    adjusted: Math.max(0, Math.max(0, earnings) - gross),
  }
}

// ─── SCENARIO 1: Standard Employed / Self-Employed ───────────────────────────
export interface S1Input {
  grossIncome: number
  expenses: number
  employmentType: 'employed' | 'self-employed'
  pension: number
}
export function calcScenario1(inp: S1Input): ScenarioResult {
  const profit = Math.max(0, inp.grossIncome - inp.expenses)
  // SIPP relief at source: the pension does NOT reduce the income-tax base;
  // instead the basic-rate band is widened by the gross contribution (TAX-10).
  const p = sippRelief(profit, 0, inp.pension)
  const pa = calcPA(p.adjusted)
  const taxable = Math.max(0, profit - pa)
  const itax = rukIncomeTax(taxable, p.gross)
  // Neither NIC class is reduced by a personal SIPP: relief at source is paid
  // out of income that has already borne NI, and only salary sacrifice moves an
  // NIC base. Both are charged on the pre-pension profit (TAX-2).
  const ni = inp.employmentType === 'employed' ? calcClass1NI(profit) : calcClass4NI(profit)
  const total = round2(itax + ni)
  const takeHome = round2(Math.max(0, profit - total - p.netCost))
  const effRate = effective(total, profit)
  const niLabel = inp.employmentType === 'employed' ? 'NI Class 1 (8%)' : 'NI Class 4 (6%)'

  return {
    scenario: inp.employmentType === 'employed' ? 'Employed' : 'Self-Employed',
    grossIncome: inp.grossIncome,
    personalAllowance: pa,
    taxableIncome: taxable,
    incomeTax: itax,
    nationalInsurance: ni,
    dividendTax: 0,
    totalDeductions: total,
    netTakeHome: takeHome,
    effectiveRate: effRate,
    taxProvision: total,
    sixtyTrap: false,
    catMessage: `Your effective rate is ${effRate}%.${ni > 0 ? ` You're paying ${fmtGBP(ni)} in ${niLabel}.` : ''}`,
    lines: [
      { label: 'Gross Income', value: inp.grossIncome },
      { label: 'Allowable Expenses', value: inp.expenses, negative: true, indent: true },
      { label: 'Gross Profit', value: profit, bold: true },
      { label: 'Personal Allowance', value: pa, negative: true, indent: true },
      { label: 'Taxable Income', value: taxable, bold: true },
      { label: 'Income Tax', value: itax, negative: true, indent: true },
      { label: niLabel, value: ni, negative: true, indent: true },
      ...(p.gross > 0
        ? [
            {
              label: 'Pension (net cost, you pay)',
              value: p.netCost,
              negative: true,
              indent: true,
            },
            { label: 'Basic-rate relief (into pot)', value: p.reliefAtSource, indent: true },
          ]
        : []),
      { label: 'Net Take-Home', value: takeHome, bold: true },
    ],
  }
}

// ─── SCENARIO 2: High Earner £100k+ (60% Trap) ───────────────────────────────
export interface S2Input {
  grossIncome: number
  pension: number
}
export function calcScenario2(inp: S2Input): ScenarioResult {
  // Relief at source: pension widens the basic-rate band and lowers adjusted net
  // income (restoring tapered PA), but does not reduce the taxable base (TAX-10).
  const p = sippRelief(inp.grossIncome, 0, inp.pension)
  const adjusted = p.adjusted
  const pa = calcPA(adjusted)
  const paLost = Math.max(0, PA_BASE - pa)
  const taxable = Math.max(0, inp.grossIncome - pa)
  const itax = rukIncomeTax(taxable, p.gross)
  // Class 1 on the FULL salary — a relief-at-source SIPP does not reduce the
  // NIC base, only the PA-taper base above (TAX-2).
  const ni = calcClass1NI(inp.grossIncome)
  const total = round2(itax + ni)
  const takeHome = round2(Math.max(0, inp.grossIncome - total - p.netCost))
  const effRate = effective(total, inp.grossIncome)
  const inTrap = adjusted > PA_TAPER_START && adjusted < PA_TAPER_END
  const toEscape = inTrap ? adjusted - PA_TAPER_START : 0

  return {
    scenario: 'High Earner',
    grossIncome: inp.grossIncome,
    personalAllowance: pa,
    taxableIncome: taxable,
    incomeTax: itax,
    nationalInsurance: ni,
    dividendTax: 0,
    totalDeductions: total,
    netTakeHome: takeHome,
    effectiveRate: effRate,
    taxProvision: total,
    sixtyTrap: inTrap,
    catMessage: inTrap
      ? `⚠️ You're in the 60% Trap! Personal Allowance reduced by ${fmtGBP(paLost)}. Contribute ${fmtGBP(toEscape)} to a pension to escape and save ~${fmtGBP(Math.round(toEscape * 0.6))}.`
      : `You earn over ${fmtGBP(PA_TAPER_START)}. PA tapered to ${fmtGBP(pa)}. Consider SIPP contributions for relief.`,
    lines: [
      { label: 'Gross Income', value: inp.grossIncome },
      { label: 'Adjusted Net Income (for PA taper)', value: adjusted, indent: true },
      {
        label: `Personal Allowance (tapered from ${fmtGBP(PA_BASE)})`,
        value: pa,
        negative: true,
        indent: true,
      },
      { label: 'PA Lost to Taper', value: paLost, negative: true, indent: true },
      { label: 'Taxable Income', value: taxable, bold: true },
      { label: 'Income Tax (incl. 60% zone)', value: itax, negative: true, indent: true },
      { label: 'NI Class 1 (8%)', value: ni, negative: true, indent: true },
      ...(p.gross > 0
        ? [
            {
              label: 'Pension (net cost, you pay)',
              value: p.netCost,
              negative: true,
              indent: true,
            },
            { label: 'Basic-rate relief (into pot)', value: p.reliefAtSource, indent: true },
          ]
        : []),
      { label: 'Net Take-Home', value: takeHome, bold: true },
    ],
  }
}

// ─── SCENARIO 3: Welfare & Support ───────────────────────────────────────────
// Universal Credit is non-taxable and does NOT consume PA.
export interface S3Input {
  universalCredit: number // tax-free
  jsaAmount: number // taxable
  carersAllowance: number // taxable
  otherIncome: number // taxable (e.g. part-time earnings)
}
export function calcScenario3(inp: S3Input): ScenarioResult {
  const taxableIncome = inp.jsaAmount + inp.carersAllowance + inp.otherIncome
  const pa = calcPA(taxableIncome)
  const taxable = Math.max(0, taxableIncome - pa)
  const itax = rukIncomeTax(taxable)
  // National Insurance is charged on EARNINGS only. JSA and Carer's Allowance are
  // taxable social-security benefits, not earnings, so they attract no NI — only
  // the earned `otherIncome` (e.g. part-time work) forms the NI base (TAX-7).
  const ni = calcClass1NI(inp.otherIncome)
  const total = round2(itax + ni)
  const totalIncoming = taxableIncome + inp.universalCredit
  const takeHome = round2(Math.max(0, totalIncoming - total))
  const effRate = effective(total, taxableIncome)

  return {
    scenario: 'Welfare & Support',
    grossIncome: totalIncoming,
    personalAllowance: pa,
    taxableIncome: taxable,
    incomeTax: itax,
    nationalInsurance: ni,
    dividendTax: 0,
    totalDeductions: total,
    netTakeHome: takeHome,
    effectiveRate: effRate,
    taxProvision: total,
    sixtyTrap: false,
    catMessage: `Universal Credit is 100% tax-free — it won't touch your ${fmtGBP(PA_BASE)} allowance.${
      inp.jsaAmount > 0 ? ` JSA of ${fmtGBP(inp.jsaAmount)} is taxable income though.` : ''
    }`,
    lines: [
      { label: 'Universal Credit (Tax-Free)', value: inp.universalCredit },
      { label: 'JSA (Taxable)', value: inp.jsaAmount, indent: true },
      { label: "Carer's Allowance (Taxable)", value: inp.carersAllowance, indent: true },
      { label: 'Other Income (Taxable)', value: inp.otherIncome, indent: true },
      { label: 'Total Taxable Income', value: taxableIncome, bold: true },
      { label: 'Personal Allowance', value: pa, negative: true, indent: true },
      { label: 'Taxable After PA', value: taxable },
      { label: 'Income Tax', value: itax, negative: true, indent: true },
      { label: 'National Insurance', value: ni, negative: true, indent: true },
      { label: 'Total In-Hand (incl. UC)', value: takeHome, bold: true },
    ],
  }
}

// ─── SCENARIO 4: Job Loss & Redundancy ───────────────────────────────────────
// £30,000 redundancy exemption + PAYE refund logic.
export interface S4Input {
  annualSalary: number // full-year salary
  monthsWorked: number // 1–12 (stopped work mid-year)
  redundancyPayment: number // total package received
  payeTaxPaid: number // PAYE actually deducted so far
}
export function calcScenario4(inp: S4Input): ScenarioResult {
  const months = Math.max(1, Math.min(12, inp.monthsWorked))
  const earned = round2((inp.annualSalary / 12) * months)
  const taxFreeRedund = Math.min(inp.redundancyPayment, REDUNDANCY_EXEMPTION)
  const taxableRedund = Math.max(0, inp.redundancyPayment - REDUNDANCY_EXEMPTION)
  const totalTaxable = earned + taxableRedund
  const pa = calcPA(totalTaxable)
  const taxable = Math.max(0, totalTaxable - pa)
  const itaxDue = rukIncomeTax(taxable)
  const ni = calcClass1NI(earned)
  const total = round2(itaxDue + ni)
  const refund = round2(Math.max(0, inp.payeTaxPaid - itaxDue))
  const takeHome = round2(earned + taxFreeRedund + taxableRedund - itaxDue - ni)
  const effRate = effective(total, totalTaxable)

  return {
    scenario: 'Job Loss & Redundancy',
    grossIncome: earned + inp.redundancyPayment,
    personalAllowance: pa,
    taxableIncome: taxable,
    incomeTax: itaxDue,
    nationalInsurance: ni,
    dividendTax: 0,
    totalDeductions: total,
    netTakeHome: takeHome,
    effectiveRate: effRate,
    taxProvision: total,
    sixtyTrap: false,
    catMessage:
      refund > 0
        ? `${fmtGBP(taxFreeRedund)} redundancy exemption applied. You may be owed a PAYE refund of ${fmtGBP(refund)} — contact HMRC.`
        : `${fmtGBP(taxFreeRedund)} tax-free redundancy exemption applied. The first ${fmtGBP(REDUNDANCY_EXEMPTION)} is always yours free.`,
    lines: [
      { label: `Salary Earned (${months} months)`, value: earned },
      { label: 'Redundancy Payment', value: inp.redundancyPayment },
      {
        label: `Tax-Free Redundancy (${fmtGBP(REDUNDANCY_EXEMPTION)} rule)`,
        value: taxFreeRedund,
        negative: true,
        indent: true,
      },
      { label: 'Taxable Redundancy', value: taxableRedund, indent: true },
      { label: 'Total Taxable Income', value: totalTaxable, bold: true },
      { label: 'Personal Allowance', value: pa, negative: true, indent: true },
      { label: 'Taxable After PA', value: taxable },
      { label: 'Income Tax Due', value: itaxDue, negative: true, indent: true },
      { label: 'PAYE Tax Already Paid', value: inp.payeTaxPaid, negative: true, indent: true },
      { label: 'PAYE Refund Owed', value: refund, bold: true },
      { label: 'NI Class 1 (8%)', value: ni, negative: true, indent: true },
      { label: 'Estimated Net Position', value: takeHome, bold: true },
    ],
  }
}

// ─── SCENARIO 5: The Director (Salary + Dividends) ───────────────────────────
export interface S5Input {
  salary: number // recommended: £12,570 to minimise NI
  dividends: number // company profit paid as dividends
  pension: number // director pension contribution
}
export function calcScenario5(inp: S5Input): ScenarioResult {
  const { salary, dividends } = inp
  // Relief at source: pension is relievable against the SALARY (relevant
  // earnings); dividends are not. It widens the basic-rate band rather than
  // reducing the taxable base (TAX-10).
  const p = sippRelief(salary, dividends, inp.pension)
  const adjustedSal = p.adjusted

  // NI: salary only, and on the FULL salary — dividends are NI-free, and a
  // relief-at-source SIPP does not reduce the Class 1 base (TAX-2).
  const ni = calcClass1NI(salary)
  // PA taper: combined adjusted net income.
  const pa = calcPA(adjustedSal + dividends)
  // Income tax: the full salary consumes PA first (relief comes via the wider
  // band, not a lower base), dividends stack on top.
  const salTaxable = Math.max(0, salary - pa)
  const itaxSal = rukIncomeTax(salTaxable, p.gross)
  // Unused PA (salary below PA) shelters dividends first, tax-free (TAX-1).
  const sparePA = Math.max(0, pa - salary)
  const divTax = calcDividendTax(dividends, salTaxable, sparePA, p.gross)
  const itaxTotal = round2(itaxSal + divTax)

  const total = round2(itaxTotal + ni)
  const cashIncome = salary + dividends
  const takeHome = round2(Math.max(0, cashIncome - total - p.netCost))
  const effRate = effective(total, cashIncome)
  const niSaving = round2(calcClass4NI(cashIncome) - ni) // vs self-employed

  return {
    scenario: 'Director (Salary + Dividends)',
    grossIncome: salary + dividends,
    personalAllowance: pa,
    taxableIncome: salTaxable,
    incomeTax: itaxTotal,
    nationalInsurance: ni,
    dividendTax: divTax,
    totalDeductions: total,
    netTakeHome: takeHome,
    effectiveRate: effRate,
    taxProvision: total,
    sixtyTrap: false,
    catMessage: [
      `By taking ${fmtGBP(dividends)} in dividends, you avoid 8% NI on the top slice.`,
      niSaving > 0 ? `Estimated NI saving vs self-employed: ${fmtGBP(niSaving)}.` : '',
      salary === DIRECTOR_OPTIMAL_SALARY
        ? `✓ Optimal ${fmtGBP(DIRECTOR_OPTIMAL_SALARY)} salary — no NI, full State Pension credit.`
        : '',
    ]
      .filter(Boolean)
      .join(' '),
    lines: [
      { label: 'Director Salary', value: salary },
      { label: 'Dividends', value: dividends },
      {
        label: `Dividend Allowance (${fmtGBP(DIV_ALLOWANCE)} tax-free)`,
        value: Math.min(dividends, DIV_ALLOWANCE),
        negative: true,
        indent: true,
      },
      { label: 'Personal Allowance', value: pa, negative: true, indent: true },
      { label: 'Income Tax (salary)', value: itaxSal, negative: true, indent: true },
      { label: 'Dividend Tax', value: divTax, negative: true, indent: true },
      { label: 'NI Class 1 on Salary', value: ni, negative: true, indent: true },
      ...(p.gross > 0
        ? [
            {
              label: 'Pension (net cost, you pay)',
              value: p.netCost,
              negative: true,
              indent: true,
            },
            { label: 'Basic-rate relief (into pot)', value: p.reliefAtSource, indent: true },
          ]
        : []),
      { label: 'Net Take-Home', value: takeHome, bold: true },
    ],
  }
}
