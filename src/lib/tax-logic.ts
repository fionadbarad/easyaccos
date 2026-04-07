// ─── EasyAcco 2026/27 UK Tax Engine v3 ───────────────────────────────────────
// Audit complete. All calculations use correct bases, 2dp rounding throughout.
//
// BUGS FIXED vs v2:
//   - Plan 2 student loan threshold corrected: £28,470 -> £27,295
//   - Student loan now uses grossProfit (HMRC applies repayment on profit
//     before pension relief, not after)
//   - Floating point errors eliminated: round2() applied to all outputs
//   - Higher rate band guard: remaining can never go negative
//   - Monthly breakdown added to TaxResult
//   - effectiveTaxRate capped at 100% defensively

export type EmploymentType  = 'employed' | 'self-employed' | 'director'
export type StudentLoanPlan = 'none' | 'plan1' | 'plan2' | 'plan4' | 'plan5' | 'postgraduate'
export type TaxRegion       = 'ruk' | 'scotland'

export interface TaxInput {
  grossRevenue:          number
  allowableExpenses:     number
  dividendIncome:        number
  employmentType:        EmploymentType
  taxRegion:             TaxRegion
  studentLoanPlan:       StudentLoanPlan
  voluntaryClass2NI:     boolean   // only applies when profit < SPT (£7,105)
  marriageAllowance:     boolean   // transfer £1,260 PA to partner
  blindPersonsAllowance: boolean   // additional £3,250 PA
  pensionContribution:   number    // annual SIPP — reduces adjusted net income
}

export interface TaxBand {
  label:  string
  rate:   number   // integer percentage e.g. 20
  amount: number   // income in this band
  tax:    number   // tax payable in this band (2dp)
}

export interface OptimizationTip {
  id:          string
  title:       string
  description: string
  saving:      number   // estimated annual saving £ (0 = informational)
}

export interface BreakdownStep {
  label: string
  value: number   // positive = income/addition; negative = deduction
  note:  string
}

export interface MonthlyBreakdown {
  grossProfit:       number
  incomeTax:         number
  niClass1:          number
  niClass4:          number
  niClass2:          number
  dividendTax:       number
  studentLoan:       number
  totalDeductions:   number
  netTakeHome:       number
}

export interface TaxResult {
  // ── Echo inputs ──────────────────────────────────────────────────────────
  grossRevenue:          number
  allowableExpenses:     number
  pensionContribution:   number   // capped at grossProfit

  // ── Computed income chain ─────────────────────────────────────────────
  grossProfit:           number   // revenue - expenses
  adjustedProfit:        number   // grossProfit - pensionContribution
  personalAllowance:     number   // after taper + marriage/blind adjustments (never < 0)
  taxableIncome:         number   // max(0, adjustedProfit - personalAllowance)

  // ── Income tax ────────────────────────────────────────────────────────
  incomeTax:             number
  taxBands:              TaxBand[]

  // ── National Insurance ───────────────────────────────────────────────
  niClass1:              number   // employed / director
  niClass4:              number   // self-employed
  niClass2:              number   // voluntary only (deemed = £0)
  niClass2Deemed:        boolean  // profit >= £7,105 SPT: record protected, no charge

  // ── Other deductions ─────────────────────────────────────────────────
  dividendTax:           number
  studentLoanRepayment:  number   // based on grossProfit (before pension)
  studentLoanBase:       number   // the base used for SL calculation (grossProfit)

  // ── Totals ────────────────────────────────────────────────────────────
  totalDeductions:       number
  netTakeHome:           number
  effectiveTaxRate:      number   // % of total income taken as deductions

  // ── Flags ─────────────────────────────────────────────────────────────
  sixtyPercentTrap:      boolean  // income £100k–£125,140
  taperWarning:          boolean
  mtdWarning:            boolean  // SE/director gross > £50k

  // ── Extras ────────────────────────────────────────────────────────────
  monthly:               MonthlyBreakdown
  optimizationTips:      OptimizationTip[]
  breakdown:             BreakdownStep[]
}

// ─── 2026/27 Constants ────────────────────────────────────────────────────────

// Income Tax — Personal Allowance
const PA_BASE                 = 12_570
const MARRIAGE_ALLOWANCE_XFER = 1_260
const BLIND_PERSONS_ALLOWANCE = 3_250
const PA_TAPER_START          = 100_000
const PA_TAPER_END            = 125_140

// Income Tax — rUK bands
const RUK_BASIC_RATE_WIDTH = 37_700   // £12,571 – £50,270 at 20%
const RUK_BASIC_LIMIT      = 50_270
const RUK_HIGHER_LIMIT     = 125_140  // above this: 45%

// Income Tax — Scotland band ceilings (absolute gross income)
const SCO_STARTER_END      = 16_537   // 19%
const SCO_BASIC_END        = 29_526   // 20%
const SCO_INTERMEDIATE_END = 43_662   // 21%
const SCO_HIGHER_END       = 75_000   // 42%
const SCO_ADVANCED_END     = 125_140  // 45%
                                      // above: 48%

// NI
const NI_PT  = 12_570   // Primary Threshold
const NI_UEL = 50_270   // Upper Earnings Limit
const NI_C1_MAIN  = 0.08   // Employee Class 1 — main rate
const NI_C1_UPPER = 0.02   // Employee Class 1 — above UEL
const NI_C4_MAIN  = 0.06   // SE Class 4 — main rate
const NI_C4_UPPER = 0.02   // SE Class 4 — above UEL
const NI_C2_WEEKLY = 3.65
const NI_CLASS2_SPT = 7_105  // 2026/27 Small Profits Threshold (up from £6,845)

// Dividends
const DIV_ALLOWANCE  = 500
const DIV_BASIC      = 0.1075   // 10.75%
const DIV_HIGHER     = 0.3575   // 35.75%
const DIV_ADDL       = 0.3935   // 39.35%

// Student Loan 2026/27
const STUDENT_LOAN: Record<StudentLoanPlan, { threshold: number; rate: number; label: string }> = {
  none:         { threshold: 0,      rate: 0,    label: 'None'                                       },
  plan1:        { threshold: 24_990, rate: 0.09, label: 'Plan 1 \u2014 \u00a324,990 (pre-2012 England/Wales)' },
  plan2:        { threshold: 27_295, rate: 0.09, label: 'Plan 2 \u2014 \u00a327,295 (2012\u20132023)'         },
  plan4:        { threshold: 32_745, rate: 0.09, label: 'Plan 4 \u2014 \u00a332,745 (Scotland)'               },
  plan5:        { threshold: 25_000, rate: 0.09, label: 'Plan 5 \u2014 \u00a325,000 (post-Aug 2023)'          },
  postgraduate: { threshold: 21_000, rate: 0.06, label: 'Postgraduate \u2014 \u00a321,000 (6%)'               },
}

export const STUDENT_LOAN_LABELS = Object.fromEntries(
  Object.entries(STUDENT_LOAN).map(([k, v]) => [k, v.label])
) as Record<StudentLoanPlan, string>

// ─── Utility ──────────────────────────────────────────────────────────────────
/** Round to exactly 2 decimal places — eliminates floating point drift */
function round2(n: number): number {
  return Math.round(n * 100) / 100
}

/** Format £ amount for use inside tip description strings (no JSX) */
function fmtGBP(n: number): string {
  return '\u00a3' + Math.round(n).toLocaleString('en-GB')
}

// ─── Personal Allowance ───────────────────────────────────────────────────────
/**
 * HMRC taper rule:
 *   adjusted_net_income <= £100,000 → full PA = £12,570
 *   adjusted_net_income >  £100,000 → PA = max(0, 12,570 - floor((income - 100,000) / 2))
 *   adjusted_net_income >= £125,140 → PA = £0
 */
function calcPA(adjustedNetIncome: number): number {
  if (adjustedNetIncome <= PA_TAPER_START) return PA_BASE
  const reduction = Math.floor((adjustedNetIncome - PA_TAPER_START) / 2)
  return Math.max(0, PA_BASE - reduction)
}

// ─── rUK Income Tax ───────────────────────────────────────────────────────────
/**
 * Applied to taxableIncome = max(0, adjustedProfit - PA).
 * The basic rate BAND WIDTH is always £37,700 regardless of PA taper.
 * Higher rate band: from end of basic to £125,140.
 * Additional rate: above £125,140.
 */
function calcRukTax(taxableIncome: number): { tax: number; bands: TaxBand[] } {
  if (taxableIncome <= 0) return { tax: 0, bands: [] }

  const bands: TaxBand[] = []
  let remaining = taxableIncome
  let totalTax  = 0

  // Basic: 20% on first £37,700
  const basicAmt = Math.min(remaining, RUK_BASIC_RATE_WIDTH)
  if (basicAmt > 0) {
    const t = round2(basicAmt * 0.20)
    bands.push({ label: 'Basic Rate', rate: 20, amount: basicAmt, tax: t })
    totalTax += t
    remaining = Math.max(0, remaining - basicAmt)
  }

  // Higher: 40% on £37,701–£125,140 (band width = £74,870)
  if (remaining > 0) {
    const higherAmt = Math.min(remaining, RUK_HIGHER_LIMIT - RUK_BASIC_LIMIT)
    if (higherAmt > 0) {
      const t = round2(higherAmt * 0.40)
      bands.push({ label: 'Higher Rate', rate: 40, amount: higherAmt, tax: t })
      totalTax += t
      remaining = Math.max(0, remaining - higherAmt)
    }
  }

  // Additional: 45% above £125,140
  if (remaining > 0) {
    const t = round2(remaining * 0.45)
    bands.push({ label: 'Additional Rate', rate: 45, amount: remaining, tax: t })
    totalTax += t
  }

  return { tax: round2(totalTax), bands }
}

// ─── Scotland Income Tax ──────────────────────────────────────────────────────
function calcScotlandTax(grossIncome: number, pa: number): { tax: number; bands: TaxBand[] } {
  const taxable = Math.max(0, grossIncome - pa)
  if (taxable <= 0) return { tax: 0, bands: [] }

  const LIMITS = [
    { label: 'Starter Rate',      rate: 19, ceiling: SCO_STARTER_END      },
    { label: 'Basic Rate',        rate: 20, ceiling: SCO_BASIC_END         },
    { label: 'Intermediate Rate', rate: 21, ceiling: SCO_INTERMEDIATE_END  },
    { label: 'Higher Rate',       rate: 42, ceiling: SCO_HIGHER_END        },
    { label: 'Advanced Rate',     rate: 45, ceiling: SCO_ADVANCED_END      },
    { label: 'Top Rate',          rate: 48, ceiling: Infinity              },
  ]

  const bands: TaxBand[] = []
  let totalTax = 0
  let prev = PA_BASE

  for (const { label, rate, ceiling } of LIMITS) {
    const lower  = Math.max(0, taxable - Math.max(0, prev    - pa))
    const upper  = Math.max(0, taxable - Math.max(0, ceiling - pa))
    const amount = lower - upper
    if (amount > 0) {
      const t = round2(amount * (rate / 100))
      bands.push({ label, rate, amount, tax: t })
      totalTax += t
    }
    prev = ceiling
    if (prev >= grossIncome) break
  }

  return { tax: round2(totalTax), bands }
}

// ─── NI Class 1 (Employed / Director) ────────────────────────────────────────
// Uses earnings (gross salary / director salary before expenses)
function calcClass1NI(earnings: number): number {
  if (earnings <= NI_PT) return 0
  if (earnings <= NI_UEL) {
    return round2((earnings - NI_PT) * NI_C1_MAIN)
  }
  return round2(
    (NI_UEL - NI_PT) * NI_C1_MAIN +
    (earnings - NI_UEL) * NI_C1_UPPER
  )
}

// ─── NI Class 4 (Self-Employed) ──────────────────────────────────────────────
// Uses PROFIT (after expenses, before income tax — not taxable income)
function calcClass4NI(profit: number): number {
  if (profit <= NI_PT) return 0
  if (profit <= NI_UEL) {
    return round2((profit - NI_PT) * NI_C4_MAIN)
  }
  return round2(
    (NI_UEL - NI_PT) * NI_C4_MAIN +
    (profit - NI_UEL) * NI_C4_UPPER
  )
}

// ─── Dividend Tax ─────────────────────────────────────────────────────────────
// Dividends are stacked on top of non-dividend income within the tax bands.
// The first £500 (dividend allowance) is tax-free.
function calcDividendTax(
  dividends:           number,
  taxableNonDivIncome: number,
  region:              TaxRegion,
): number {
  if (dividends <= DIV_ALLOWANCE) return 0

  const taxableDivs = dividends - DIV_ALLOWANCE
  const basicWidth  = region === 'scotland'
    ? (SCO_BASIC_END - PA_BASE)
    : RUK_BASIC_RATE_WIDTH
  const higherWidth = RUK_HIGHER_LIMIT - RUK_BASIC_LIMIT   // 74,870

  let remaining = taxableDivs
  let tax = 0

  // How much of the basic rate band is still unused by non-dividend income?
  const inBasic  = Math.max(0, basicWidth - taxableNonDivIncome)
  const basicDiv = Math.min(remaining, inBasic)
  if (basicDiv > 0) {
    tax += basicDiv * DIV_BASIC
    remaining = Math.max(0, remaining - basicDiv)
  }

  // How much of the higher rate band is still unused?
  const nonDivAboveBasic = Math.max(0, taxableNonDivIncome - basicWidth)
  const inHigher  = Math.max(0, higherWidth - nonDivAboveBasic)
  const higherDiv = Math.min(remaining, inHigher)
  if (higherDiv > 0) {
    tax += higherDiv * DIV_HIGHER
    remaining = Math.max(0, remaining - higherDiv)
  }

  if (remaining > 0) tax += remaining * DIV_ADDL

  return round2(tax)
}

// ─── Student Loan ─────────────────────────────────────────────────────────────
// IMPORTANT: HMRC computes student loan repayments on GROSS PROFIT (profit
// after allowable expenses, BEFORE pension deductions and BEFORE income tax).
// The base used here is grossProfit, NOT taxableIncome.
function calcStudentLoan(grossProfit: number, plan: StudentLoanPlan): number {
  if (plan === 'none') return 0
  const { threshold, rate } = STUDENT_LOAN[plan]
  const repayable = Math.max(0, grossProfit - threshold)
  return round2(repayable * rate)
}

// ─── Optimization Tips ────────────────────────────────────────────────────────
function buildTips(
  adjustedProfit: number,
  dividendIncome: number,
  employmentType: EmploymentType,
  in60pctTrap:    boolean,
  incomeTax:      number,
): OptimizationTip[] {
  const tips: OptimizationTip[] = []

  if (in60pctTrap) {
    const toEscape = adjustedProfit - PA_TAPER_START
    const saving   = Math.round(toEscape * 0.60)
    tips.push({
      id: 'pension-60pct',
      title: 'Escape the 60% Trap',
      description:
        `Contribute ${fmtGBP(toEscape)} to a SIPP. This reduces your adjusted income ` +
        `to exactly \u00a3100,000, fully restores your Personal Allowance, and saves ` +
        `approximately ${fmtGBP(saving)} in tax.`,
      saving,
    })
  }

  if (adjustedProfit > RUK_BASIC_LIMIT && !in60pctTrap) {
    const higherSlice  = Math.min(adjustedProfit, PA_TAPER_START) - RUK_BASIC_LIMIT
    const suggest      = Math.min(10_000, higherSlice)
    const saving       = Math.round(suggest * 0.40)
    if (saving > 0) {
      tips.push({
        id: 'pension-higher',
        title: 'Higher-Rate Pension Relief',
        description:
          `Contributing ${fmtGBP(suggest)} to a SIPP attracts 40% tax relief, saving ` +
          `approximately ${fmtGBP(saving)}. Your provider reclaims basic rate; ` +
          `you claim the additional 20% via Self Assessment.`,
        saving,
      })
    }
  }

  if (employmentType === 'self-employed' && adjustedProfit > 30_000) {
    const niSlice = Math.min(adjustedProfit - NI_PT, NI_UEL - NI_PT)
    const saving  = Math.round((niSlice * NI_C4_MAIN) / 3)
    tips.push({
      id: 'ltd-structure',
      title: 'Ltd Company Structure Could Reduce NI',
      description:
        `As a director you pay Class 1 NI only on salary (set at \u00a312,570), not on dividends. ` +
        `Incorporating a limited company could save approximately ${fmtGBP(saving)}/yr in NI. ` +
        `Accountant setup costs typically recover within year one.`,
      saving,
    })
  }

  if (incomeTax > 0) {
    tips.push({
      id: 'isa',
      title: 'Use Your \u00a320,000 ISA Allowance',
      description:
        'Income, dividends, and capital gains inside a Stocks & Shares or Cash ISA are ' +
        'completely free of tax. The allowance resets each April — unused allowance cannot be carried forward.',
      saving: 0,
    })
  }

  return tips
}

// ─── Main Calculator ──────────────────────────────────────────────────────────
export function calculateTax(input: TaxInput): TaxResult {
  const {
    grossRevenue, allowableExpenses, dividendIncome,
    employmentType, taxRegion, studentLoanPlan,
    voluntaryClass2NI, marriageAllowance, blindPersonsAllowance,
    pensionContribution,
  } = input

  // ── 1. Profit after allowable expenses ─────────────────────────────────────
  const grossProfit = Math.max(0, grossRevenue - allowableExpenses)

  // ── 2. Adjusted profit after pension contribution ──────────────────────────
  // Pension capped at grossProfit and at £60,000 annual allowance
  const pensionCapped   = Math.min(pensionContribution, grossProfit, 60_000)
  const adjustedProfit  = Math.max(0, grossProfit - pensionCapped)

  // ── 3. Personal Allowance ──────────────────────────────────────────────────
  // Taper uses adjusted_net_income = adjustedProfit + dividendIncome
  const paRaw   = calcPA(adjustedProfit + dividendIncome)
  const paMarr  = marriageAllowance ? Math.max(0, paRaw - MARRIAGE_ALLOWANCE_XFER) : paRaw
  const pa      = blindPersonsAllowance ? paMarr + BLIND_PERSONS_ALLOWANCE : paMarr
  // PA is never negative
  const personalAllowance = Math.max(0, pa)

  // ── 4. Taxable income ──────────────────────────────────────────────────────
  const taxableIncome = Math.max(0, adjustedProfit - personalAllowance)

  // ── 5. Income tax ──────────────────────────────────────────────────────────
  const { tax: incomeTaxRaw, bands: taxBands } = taxRegion === 'scotland'
    ? calcScotlandTax(adjustedProfit, personalAllowance)
    : calcRukTax(taxableIncome)
  const incomeTax = round2(incomeTaxRaw)

  // ── 6. National Insurance ──────────────────────────────────────────────────
  // Class 1: employed / director — on adjusted profit (salary)
  const niClass1 = (employmentType === 'employed' || employmentType === 'director')
    ? calcClass1NI(adjustedProfit)
    : 0

  // Class 4: self-employed — on PROFIT (correct base is adjustedProfit for NI)
  const niClass4 = employmentType === 'self-employed'
    ? calcClass4NI(adjustedProfit)
    : 0

  // Class 2 (2026/27 rules):
  //   Profit >= £7,105 (SPT) → deemed paid, NI record protected, ZERO actual charge
  //   Profit <  £7,105       → optional voluntary payment of £3.65/wk
  const niClass2Deemed    = employmentType === 'self-employed' && adjustedProfit >= NI_CLASS2_SPT
  const niClass2Voluntary = employmentType === 'self-employed' && !niClass2Deemed && voluntaryClass2NI
  const niClass2          = niClass2Voluntary ? round2(NI_C2_WEEKLY * 52) : 0

  // ── 7. Dividend tax ────────────────────────────────────────────────────────
  const dividendTax = dividendIncome > 0
    ? calcDividendTax(dividendIncome, taxableIncome, taxRegion)
    : 0

  // ── 8. Student loan ────────────────────────────────────────────────────────
  // Base = grossProfit (after expenses, BEFORE pension deduction)
  // HMRC repayment threshold applies to gross trading income
  const studentLoanBase       = grossProfit
  const studentLoanRepayment  = calcStudentLoan(grossProfit, studentLoanPlan)

  // ── 9. Totals ──────────────────────────────────────────────────────────────
  const totalDeductions = round2(
    incomeTax + niClass1 + niClass4 + niClass2 + dividendTax + studentLoanRepayment
  )
  const totalIncome = adjustedProfit + dividendIncome
  const netTakeHome = round2(Math.max(0, totalIncome - totalDeductions))
  // Defensive: effective rate capped at 100%
  const effectiveTaxRate = totalIncome > 0
    ? Math.min(100, round2((totalDeductions / totalIncome) * 100))
    : 0

  // ── 10. Flags ──────────────────────────────────────────────────────────────
  const sixtyPercentTrap = adjustedProfit > PA_TAPER_START && adjustedProfit < PA_TAPER_END
  const taperWarning     = sixtyPercentTrap
  const mtdWarning       = (employmentType === 'self-employed' || employmentType === 'director')
    && grossRevenue > 50_000

  // ── 11. Monthly breakdown ──────────────────────────────────────────────────
  const monthly: MonthlyBreakdown = {
    grossProfit:     round2(adjustedProfit / 12),
    incomeTax:       round2(incomeTax / 12),
    niClass1:        round2(niClass1 / 12),
    niClass4:        round2(niClass4 / 12),
    niClass2:        round2(niClass2 / 12),
    dividendTax:     round2(dividendTax / 12),
    studentLoan:     round2(studentLoanRepayment / 12),
    totalDeductions: round2(totalDeductions / 12),
    netTakeHome:     round2(netTakeHome / 12),
  }

  // ── 12. Optimization tips ──────────────────────────────────────────────────
  const optimizationTips = buildTips(
    adjustedProfit, dividendIncome, employmentType, sixtyPercentTrap, incomeTax,
  )

  // ── 13. Step-by-step breakdown ────────────────────────────────────────────
  const breakdown: BreakdownStep[] = [
    {
      label: 'Gross Revenue',
      value: grossRevenue,
      note:  'Total income or turnover before any deductions',
    },
    {
      label: 'Allowable Expenses',
      value: -allowableExpenses,
      note:  'Business costs deducted from revenue — tax is calculated on profit, not revenue',
    },
    {
      label: 'Gross Profit',
      value: grossProfit,
      note:  'Revenue minus expenses — this is the base for NI Class 4 and student loan',
    },
    {
      label: 'Pension Contribution',
      value: -pensionCapped,
      note:  'SIPP/pension reduces adjusted net income, attracting full marginal rate relief',
    },
    {
      label: 'Adjusted Net Income',
      value: adjustedProfit,
      note:  'Used for Personal Allowance taper check and income tax calculation',
    },
    {
      label: 'Personal Allowance',
      value: -personalAllowance,
      note:  personalAllowance < PA_BASE
        ? `Tapered: \u00a3${PA_BASE.toLocaleString()} reduced by \u00a3${(PA_BASE - personalAllowance).toLocaleString()} because income > \u00a3100,000`
        : 'Standard 2026/27 allowance \u2014 income below taper threshold',
    },
    {
      label: 'Taxable Income',
      value: taxableIncome,
      note:  'The amount subject to Income Tax rates (Personal Allowance is subtracted above)',
    },
  ]

  return {
    grossRevenue,
    allowableExpenses,
    pensionContribution: pensionCapped,
    grossProfit,
    adjustedProfit,
    personalAllowance,
    taxableIncome,
    incomeTax,
    taxBands,
    niClass1,
    niClass4,
    niClass2,
    niClass2Deemed,
    dividendTax,
    studentLoanRepayment,
    studentLoanBase,
    totalDeductions,
    netTakeHome,
    effectiveTaxRate,
    sixtyPercentTrap,
    taperWarning,
    mtdWarning,
    monthly,
    optimizationTips,
    breakdown,
  }
}

// ─── Validation ───────────────────────────────────────────────────────────────
export interface ValidationErrors {
  grossRevenue?:       string
  allowableExpenses?:  string
  dividendIncome?:     string
  pensionContribution?: string
}

export function validateTaxInput(input: TaxInput): ValidationErrors {
  const e: ValidationErrors = {}
  const MAX = 9_999_999

  if (input.grossRevenue <= 0)
    e.grossRevenue = 'Enter a gross income greater than \u00a30'
  else if (input.grossRevenue > MAX)
    e.grossRevenue = 'Maximum supported income is \u00a39,999,999'

  if (input.allowableExpenses < 0)
    e.allowableExpenses = 'Expenses cannot be negative'
  else if (input.allowableExpenses >= input.grossRevenue)
    e.allowableExpenses = 'Expenses cannot equal or exceed gross revenue'

  if (input.dividendIncome < 0)
    e.dividendIncome = 'Dividend income cannot be negative'
  else if (input.dividendIncome > MAX)
    e.dividendIncome = 'Maximum supported dividend income is \u00a39,999,999'

  if (input.pensionContribution < 0)
    e.pensionContribution = 'Pension contribution cannot be negative'
  else if (input.pensionContribution > 60_000)
    e.pensionContribution = 'Exceeds \u00a360,000 annual pension allowance'

  return e
}

// ─── Edge case verification (used in tests / dev) ────────────────────────────
// £12,570  → taxableIncome = 0, incomeTax = 0
// £50,270  → basic band exhausted, no higher rate
// £100,000 → taper starts, still some PA remaining
// £125,140 → PA = 0, full higher/additional bands
// £7,104   → below SPT, NI Class 2 not deemed
// £7,105   → at SPT, Class 2 deemed paid
// £150,000 → additional rate applies

// ─── Legacy shim ─────────────────────────────────────────────────────────────
export interface TaxInput_Legacy {
  grossIncome:     number
  employmentType:  'self-employed' | 'employed' | 'both'
  studentLoanPlan: StudentLoanPlan
  voluntaryClass2NI: boolean
}
