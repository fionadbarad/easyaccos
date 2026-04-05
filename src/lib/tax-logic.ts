// ─── 2026/27 UK Tax Engine v2 ────────────────────────────────────────────────
// Fixes: dividend rates (8.75/33.75%), student loan thresholds, NI Class 2 auto-logic
// Added: optimization tips, mandatory/voluntary Class 2 distinction, PA taper verified

export type EmploymentType  = 'employed' | 'self-employed' | 'director'
export type StudentLoanPlan = 'none' | 'plan1' | 'plan2' | 'plan4' | 'plan5' | 'postgraduate'
export type TaxRegion       = 'ruk' | 'scotland'

export interface TaxInput {
  grossRevenue:        number
  allowableExpenses:   number
  dividendIncome:      number
  employmentType:      EmploymentType
  taxRegion:           TaxRegion
  studentLoanPlan:     StudentLoanPlan
  voluntaryClass2NI:   boolean   // only relevant when profit < SPT
  marriageAllowance:   boolean   // transfer £1,260 of PA to partner
  blindPersonsAllowance: boolean // extra £3,250 PA
  pensionContribution: number    // annual SIPP/pension contribution (reduces taxable profit)
}

export interface TaxBand {
  label:  string
  rate:   number
  amount: number
  tax:    number
}

export interface OptimizationTip {
  id:           string
  icon:         string
  title:        string
  description:  string
  saving:       number   // estimated annual saving in £
}

export interface BreakdownStep {
  label: string
  value: number
  note:  string
}

export interface TaxResult {
  // Inputs echoed
  grossRevenue:        number
  allowableExpenses:   number
  pensionContribution: number
  // Computed
  grossProfit:         number   // revenue - expenses
  adjustedProfit:      number   // grossProfit - pensionContribution
  personalAllowance:   number
  taxableIncome:       number
  // Income tax
  incomeTax:           number
  taxBands:            TaxBand[]
  // NI
  niClass1:            number
  niClass4:            number
  niClass2:            number
  niClass2Deemed:      boolean  // true = profit >= SPT, treated as paid (£0 charge); false = voluntary payment
  // Other
  dividendTax:             number
  studentLoanRepayment:    number
  // Totals
  totalDeductions:     number
  netTakeHome:         number
  effectiveTaxRate:    number
  // Flags
  sixtyPercentTrap:    boolean
  taperWarning:        boolean
  mtdWarning:          boolean  // income > £50k SE/director
  // Extras
  optimizationTips:    OptimizationTip[]
  breakdown:           BreakdownStep[]
}

// ─── 2026/27 Constants ───────────────────────────────────────────────────────
const PA_BASE                  = 12_570
const MARRIAGE_ALLOWANCE_XFER  = 1_260
const BLIND_PERSONS_ALLOWANCE  = 3_250
const PA_TAPER_START           = 100_000
const PA_TAPER_END             = 125_140

// rUK income tax bands
const RUK_BASIC_RATE_WIDTH = 37_700  // 20% on £12,571–£50,270 (width = 37,700)
const RUK_BASIC_LIMIT      = 50_270
const RUK_HIGHER_LIMIT     = 125_140

// Scotland 2026/27 band ceilings (absolute gross income)
const SCO_STARTER_END      = 16_537   // 19%
const SCO_BASIC_END        = 29_526   // 20%
const SCO_INTERMEDIATE_END = 43_662   // 21%
const SCO_HIGHER_END       = 75_000   // 42%
const SCO_ADVANCED_END     = 125_140  // 45%
// 48% above SCO_ADVANCED_END

// NI 2026/27
const NI_PRIMARY_THRESHOLD    = 12_570
const NI_UPPER_EARNINGS_LIMIT = 50_270
const NI_CLASS1_MAIN  = 0.08   // Employee: 8%
const NI_CLASS1_UPPER = 0.02   // Employee: 2% above UEL
const NI_CLASS4_MAIN  = 0.06   // SE: 6%
const NI_CLASS4_UPPER = 0.02   // SE: 2% above UEL
const NI_CLASS2_WEEKLY        = 3.65
// 2026/27 Small Profits Threshold (up from £6,845 in 2025/26)
const NI_CLASS2_SMALL_PROFITS = 7_105

// Dividends 2026/27 — CORRECTED (not 10.75/35.75%)
const DIVIDEND_ALLOWANCE   = 500
const DIVIDEND_BASIC_RATE  = 0.0875  // 8.75%  in basic rate band
const DIVIDEND_HIGHER_RATE = 0.3375  // 33.75% in higher rate band
const DIVIDEND_ADDL_RATE   = 0.3935  // 39.35% above £125,140

// Student loan 2026/27 thresholds
const STUDENT_LOAN: Record<StudentLoanPlan, { threshold: number; rate: number; label: string }> = {
  none:         { threshold: 0,      rate: 0,    label: 'None'                              },
  plan1:        { threshold: 24_990, rate: 0.09, label: 'Plan 1 — £24,990 (pre-2012 English/Welsh)' },
  plan2:        { threshold: 28_470, rate: 0.09, label: 'Plan 2 — £28,470 (2012–2023)'     },
  plan4:        { threshold: 32_745, rate: 0.09, label: 'Plan 4 — £32,745 (Scotland)'      },
  plan5:        { threshold: 25_000, rate: 0.09, label: 'Plan 5 — £25,000 (post-Aug 2023)' },
  postgraduate: { threshold: 21_000, rate: 0.06, label: 'Postgraduate — £21,000 (6%)'      },
}

// Export labels for UI
export const STUDENT_LOAN_LABELS = Object.fromEntries(
  Object.entries(STUDENT_LOAN).map(([k, v]) => [k, v.label])
) as Record<StudentLoanPlan, string>

// ─── Personal Allowance with taper ──────────────────────────────────────────
// Formula: reduce by £1 for every £2 above £100,000; zero at £125,140
function calcPA(adjustedNetIncome: number): number {
  if (adjustedNetIncome <= PA_TAPER_START) return PA_BASE
  const reduction = Math.floor((adjustedNetIncome - PA_TAPER_START) / 2)
  return Math.max(0, PA_BASE - reduction)
}

// ─── rUK Income Tax ──────────────────────────────────────────────────────────
// Basic rate band is always £37,700 wide regardless of PA taper.
// Taxable income = gross profit - (tapered) PA
function calcRukTax(taxableIncome: number): { tax: number; bands: TaxBand[] } {
  if (taxableIncome <= 0) return { tax: 0, bands: [] }
  const bands: TaxBand[] = []
  let remaining = taxableIncome
  let tax = 0

  const basicAmt = Math.min(remaining, RUK_BASIC_RATE_WIDTH)
  if (basicAmt > 0) {
    const t = basicAmt * 0.20
    bands.push({ label: 'Basic Rate', rate: 20, amount: basicAmt, tax: t })
    tax += t; remaining -= basicAmt
  }
  const higherAmt = Math.min(remaining, RUK_HIGHER_LIMIT - RUK_BASIC_LIMIT)
  if (higherAmt > 0) {
    const t = higherAmt * 0.40
    bands.push({ label: 'Higher Rate', rate: 40, amount: higherAmt, tax: t })
    tax += t; remaining -= higherAmt
  }
  if (remaining > 0) {
    const t = remaining * 0.45
    bands.push({ label: 'Additional Rate', rate: 45, amount: remaining, tax: t })
    tax += t
  }
  return { tax, bands }
}

// ─── Scotland Income Tax ─────────────────────────────────────────────────────
function calcScotlandTax(grossIncome: number, pa: number): { tax: number; bands: TaxBand[] } {
  const taxable = Math.max(0, grossIncome - pa)
  if (taxable <= 0) return { tax: 0, bands: [] }

  const limits = [
    { label: 'Starter Rate',      rate: 19, ceiling: SCO_STARTER_END      },
    { label: 'Basic Rate',        rate: 20, ceiling: SCO_BASIC_END         },
    { label: 'Intermediate Rate', rate: 21, ceiling: SCO_INTERMEDIATE_END  },
    { label: 'Higher Rate',       rate: 42, ceiling: SCO_HIGHER_END        },
    { label: 'Advanced Rate',     rate: 45, ceiling: SCO_ADVANCED_END      },
    { label: 'Top Rate',          rate: 48, ceiling: Infinity              },
  ]

  const bands: TaxBand[] = []
  let tax = 0
  let prev = PA_BASE

  for (const { label, rate, ceiling } of limits) {
    const lower  = Math.max(0, taxable - Math.max(0, prev    - pa))
    const upper  = Math.max(0, taxable - Math.max(0, ceiling - pa))
    const amount = lower - upper
    if (amount > 0) {
      const t = amount * (rate / 100)
      bands.push({ label, rate, amount, tax: t })
      tax += t
    }
    prev = ceiling
    if (prev >= grossIncome) break
  }
  return { tax, bands }
}

// ─── NI Class 1 (Employed / Director) ────────────────────────────────────────
function calcClass1NI(earnings: number): number {
  if (earnings <= NI_PRIMARY_THRESHOLD) return 0
  if (earnings <= NI_UPPER_EARNINGS_LIMIT) {
    return (earnings - NI_PRIMARY_THRESHOLD) * NI_CLASS1_MAIN
  }
  return (
    (NI_UPPER_EARNINGS_LIMIT - NI_PRIMARY_THRESHOLD) * NI_CLASS1_MAIN +
    (earnings - NI_UPPER_EARNINGS_LIMIT) * NI_CLASS1_UPPER
  )
}

// ─── NI Class 4 (Self-Employed) ──────────────────────────────────────────────
function calcClass4NI(profit: number): number {
  if (profit <= NI_PRIMARY_THRESHOLD) return 0
  if (profit <= NI_UPPER_EARNINGS_LIMIT) {
    return (profit - NI_PRIMARY_THRESHOLD) * NI_CLASS4_MAIN
  }
  return (
    (NI_UPPER_EARNINGS_LIMIT - NI_PRIMARY_THRESHOLD) * NI_CLASS4_MAIN +
    (profit - NI_UPPER_EARNINGS_LIMIT) * NI_CLASS4_UPPER
  )
}

// ─── Dividend Tax ─────────────────────────────────────────────────────────────
// Dividends are stacked on top of non-dividend income.
// First £500 is tax-free (2026/27 allowance).
function calcDividendTax(
  dividends:                number,
  taxableNonDividendIncome: number,
  region:                   TaxRegion,
): number {
  if (dividends <= DIVIDEND_ALLOWANCE) return 0
  const taxableDivs  = dividends - DIVIDEND_ALLOWANCE
  const basicWidth   = region === 'scotland' ? (SCO_BASIC_END - PA_BASE) : RUK_BASIC_RATE_WIDTH
  const higherWidth  = PA_TAPER_END - RUK_BASIC_LIMIT  // 74,870

  let remaining = taxableDivs
  let tax = 0

  const inBasic  = Math.max(0, basicWidth - taxableNonDividendIncome)
  const basicDiv = Math.min(remaining, inBasic)
  if (basicDiv > 0) { tax += basicDiv * DIVIDEND_BASIC_RATE; remaining -= basicDiv }

  const inHigher  = Math.max(0, higherWidth - Math.max(0, taxableNonDividendIncome - basicWidth))
  const higherDiv = Math.min(remaining, inHigher)
  if (higherDiv > 0) { tax += higherDiv * DIVIDEND_HIGHER_RATE; remaining -= higherDiv }

  if (remaining > 0) tax += remaining * DIVIDEND_ADDL_RATE

  return tax
}

// ─── Student Loan ─────────────────────────────────────────────────────────────
function calcStudentLoan(income: number, plan: StudentLoanPlan): number {
  if (plan === 'none') return 0
  const { threshold, rate } = STUDENT_LOAN[plan]
  return Math.max(0, income - threshold) * rate
}

// ─── Optimization Tips ────────────────────────────────────────────────────────
function buildOptimizationTips(
  grossProfit:      number,
  adjustedProfit:   number,
  dividendIncome:   number,
  employmentType:   EmploymentType,
  result60pct:      boolean,
  incomeTax:        number,
): OptimizationTip[] {
  const tips: OptimizationTip[] = []
  const total = adjustedProfit + dividendIncome

  // 60% trap: show exact pension contribution to escape
  if (result60pct) {
    const toEscape = adjustedProfit - PA_TAPER_START
    const saving   = Math.round(toEscape * 0.60)
    tips.push({
      id: 'pension-60pct',
      icon: 'bolt',
      title: 'Escape the 60% Trap',
      description: `Contribute ${fmtN(toEscape)} to a SIPP. This brings your income to exactly £100,000, restores your full Personal Allowance, and saves ~${fmtN(saving)} in tax this year.`,
      saving,
    })
  }

  // Higher-rate pension tip (not already in 60% trap)
  if (adjustedProfit > RUK_BASIC_LIMIT && !result60pct) {
    const higherRateIncome  = Math.min(adjustedProfit, PA_TAPER_START) - RUK_BASIC_LIMIT
    const suggestContrib    = Math.min(10_000, higherRateIncome)
    const saving            = Math.round(suggestContrib * 0.40)
    if (saving > 0) {
      tips.push({
        id: 'pension-higher',
        icon: 'piggy',
        title: 'Higher-Rate Pension Relief',
        description: `Contributing ${fmtN(suggestContrib)} to a SIPP gets you 40% tax relief — saving ~${fmtN(saving)}. Your pension provider claims basic rate, you claim the rest via Self Assessment.`,
        saving,
      })
    }
  }

  // Director dividend structure (SE earning > 30k)
  if (employmentType === 'self-employed' && adjustedProfit > 30_000) {
    const niSavingEstimate = Math.round(
      Math.min(adjustedProfit - 12_570, 50_270 - 12_570) * (NI_CLASS4_MAIN - 0)
    ) // rough: directors pay no Class 4 on dividend income
    tips.push({
      id: 'director-structure',
      icon: 'building',
      title: 'Ltd Company Could Save NI',
      description: `Directors pay Class 1 NI only on salary (set at £12,570), not on dividends. Incorporating could save ~${fmtN(niSavingEstimate / 3)} in NI. Accountant setup cost typically pays back in year 1.`,
      saving: Math.round(niSavingEstimate / 3),
    })
  }

  // ISA reminder for anyone paying tax
  if (incomeTax > 0) {
    tips.push({
      id: 'isa',
      icon: 'shield',
      title: 'Use Your £20,000 ISA Allowance',
      description: 'Savings, dividends, and gains inside a Stocks & Shares or Cash ISA are completely free of Income Tax and CGT. Each tax year the allowance resets — unused allowance is lost.',
      saving: 0,
    })
  }

  return tips
}

// Simple formatter used inside tip strings (no JSX)
function fmtN(n: number): string {
  return 'GBP' + Math.round(n).toLocaleString('en-GB')
}

// ─── Main Calculator ──────────────────────────────────────────────────────────
export function calculateTax(input: TaxInput): TaxResult {
  const {
    grossRevenue, allowableExpenses, dividendIncome,
    employmentType, taxRegion, studentLoanPlan,
    voluntaryClass2NI, marriageAllowance, blindPersonsAllowance,
    pensionContribution,
  } = input

  // Step 1: Profit after expenses
  const grossProfit = Math.max(0, grossRevenue - allowableExpenses)

  // Step 2: Adjusted profit after pension contribution
  const pensionCapped    = Math.min(pensionContribution, grossProfit)
  const adjustedProfit   = Math.max(0, grossProfit - pensionCapped)

  // Step 3: Personal Allowance (taper based on adjusted profit + dividends)
  const paRaw  = calcPA(adjustedProfit + dividendIncome)
  const paMarr = marriageAllowance ? Math.max(0, paRaw - MARRIAGE_ALLOWANCE_XFER) : paRaw
  const pa     = blindPersonsAllowance ? paMarr + BLIND_PERSONS_ALLOWANCE : paMarr

  // Step 4: Taxable income
  const taxableIncome = Math.max(0, adjustedProfit - pa)

  // Step 5: Income tax
  const { tax: incomeTax, bands: taxBands } = taxRegion === 'scotland'
    ? calcScotlandTax(adjustedProfit, pa)
    : calcRukTax(taxableIncome)

  // Step 6: NI
  // Class 1 for employed/director
  const niClass1 = (employmentType === 'employed' || employmentType === 'director')
    ? calcClass1NI(adjustedProfit) : 0

  // Class 4 for SE
  const niClass4 = employmentType === 'self-employed'
    ? calcClass4NI(adjustedProfit) : 0

  // Class 2 for SE 2026/27 rules:
  // - Profit >= SPT (£7,105): DEEMED PAID — NI record protected, NO actual charge
  // - Profit <  SPT (£7,105): can pay VOLUNTARILY (£3.65/wk) to protect State Pension
  const niClass2Deemed    = employmentType === 'self-employed' && adjustedProfit >= NI_CLASS2_SMALL_PROFITS
  const niClass2Voluntary = employmentType === 'self-employed' && !niClass2Deemed && voluntaryClass2NI
  // Only the voluntary payment is an actual cost; deemed contributions are £0
  const niClass2          = niClass2Voluntary ? NI_CLASS2_WEEKLY * 52 : 0

  // Step 7: Dividend tax
  const dividendTax = dividendIncome > 0
    ? calcDividendTax(dividendIncome, taxableIncome, taxRegion)
    : 0

  // Step 8: Student loan
  const studentLoanRepayment = calcStudentLoan(adjustedProfit, studentLoanPlan)

  // Totals
  const totalDeductions  = incomeTax + niClass1 + niClass4 + niClass2 + dividendTax + studentLoanRepayment
  const totalIncome      = adjustedProfit + dividendIncome
  const netTakeHome      = Math.max(0, totalIncome - totalDeductions)
  const effectiveTaxRate = totalIncome > 0 ? (totalDeductions / totalIncome) * 100 : 0

  // Flags
  const sixtyPercentTrap = adjustedProfit > PA_TAPER_START && adjustedProfit < PA_TAPER_END
  const taperWarning     = sixtyPercentTrap
  const mtdWarning       = (employmentType === 'self-employed' || employmentType === 'director')
    && grossRevenue > 50_000

  // Optimization tips
  const optimizationTips = buildOptimizationTips(
    grossProfit, adjustedProfit, dividendIncome,
    employmentType, sixtyPercentTrap, incomeTax,
  )

  // Breakdown steps for transparency panel
  const breakdown: BreakdownStep[] = [
    { label: 'Gross Revenue',        value: grossRevenue,      note: 'Total income before deductions'                                      },
    { label: 'Allowable Expenses',   value: -allowableExpenses, note: 'Deducted from revenue to arrive at taxable profit'                  },
    { label: 'Gross Profit',         value: grossProfit,        note: 'Revenue minus expenses — this is what gets taxed'                   },
    { label: 'Pension Contribution', value: -pensionCapped,     note: 'Reduces adjusted net income — attracts tax relief at your top rate' },
    { label: 'Adjusted Profit',      value: adjustedProfit,     note: 'Profit after pension — used for PA taper and all tax calculations'  },
    { label: 'Personal Allowance',   value: -pa,                note: pa < PA_BASE ? 'Tapered — income above £100,000 reduces your PA by £1 per £2' : 'Standard 2026/27 allowance' },
    { label: 'Taxable Income',       value: taxableIncome,      note: 'Income subject to Income Tax rates'                                 },
  ]

  return {
    grossRevenue,
    allowableExpenses,
    pensionContribution: pensionCapped,
    grossProfit,
    adjustedProfit,
    personalAllowance: pa,
    taxableIncome,
    incomeTax,
    taxBands,
    niClass1,
    niClass4,
    niClass2,
    niClass2Deemed,
    dividendTax,
    studentLoanRepayment,
    totalDeductions,
    netTakeHome,
    effectiveTaxRate,
    sixtyPercentTrap,
    taperWarning,
    mtdWarning,
    optimizationTips,
    breakdown,
  }
}

// ─── Validation ───────────────────────────────────────────────────────────────
export interface ValidationErrors {
  grossRevenue?:      string
  allowableExpenses?: string
  dividendIncome?:    string
  pensionContribution?: string
}

export function validateTaxInput(input: TaxInput): ValidationErrors {
  const e: ValidationErrors = {}
  const MAX = 9_999_999

  if (input.grossRevenue <= 0)
    e.grossRevenue = 'Enter a gross income greater than £0'
  else if (input.grossRevenue > MAX)
    e.grossRevenue = 'Maximum supported income is £9,999,999'

  if (input.allowableExpenses < 0)
    e.allowableExpenses = 'Expenses cannot be negative'
  else if (input.allowableExpenses > input.grossRevenue)
    e.allowableExpenses = 'Expenses cannot exceed gross revenue'

  if (input.dividendIncome < 0)
    e.dividendIncome = 'Dividend income cannot be negative'
  else if (input.dividendIncome > MAX)
    e.dividendIncome = 'Maximum supported dividend income is £9,999,999'

  if (input.pensionContribution < 0)
    e.pensionContribution = 'Pension contribution cannot be negative'
  else if (input.pensionContribution > 60_000)
    e.pensionContribution = 'Maximum pension annual allowance is £60,000'

  return e
}

// ─── Legacy shim ─────────────────────────────────────────────────────────────
export interface TaxInput_Legacy {
  grossIncome:     number
  employmentType:  'self-employed' | 'employed' | 'both'
  studentLoanPlan: StudentLoanPlan
  voluntaryClass2NI: boolean
}
