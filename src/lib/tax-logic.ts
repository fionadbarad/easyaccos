// ─── 2026/27 UK Tax Engine ─────────────────────────────────────────────────
// Supports: rUK (3-band) · Scotland (6-band) · Employed · Self-Employed · Director
// Includes: 60% Trap · Dividends · Allowable Expenses · All NI classes · Student Loans

export type EmploymentType = 'employed' | 'self-employed' | 'director'
export type StudentLoanPlan = 'none' | 'plan1' | 'plan2' | 'plan4' | 'plan5' | 'postgraduate'
export type TaxRegion = 'ruk' | 'scotland'

export interface TaxInput {
  grossRevenue: number
  allowableExpenses: number
  dividendIncome: number
  employmentType: EmploymentType
  taxRegion: TaxRegion
  studentLoanPlan: StudentLoanPlan
  voluntaryClass2NI: boolean
  marriageAllowance: boolean   // transfer £1,260 of PA to partner → saves £252
  blindPersonsAllowance: boolean // extra £3,250 PA for 2026/27
}

export interface TaxBand {
  label: string
  rate: number
  amount: number
  tax: number
}

export interface TaxResult {
  grossRevenue: number
  allowableExpenses: number
  grossProfit: number
  personalAllowance: number
  taxableIncome: number
  incomeTax: number
  taxBands: TaxBand[]
  niClass1: number
  niClass4: number
  niClass2: number
  dividendTax: number
  studentLoanRepayment: number
  totalDeductions: number
  netTakeHome: number
  effectiveTaxRate: number
  sixtyPercentTrap: boolean
  taperWarning: boolean
}

// ─── Constants ──────────────────────────────────────────────────────────────
const PA_BASE = 12_570
const MARRIAGE_ALLOWANCE_TRANSFER = 1_260   // reduces YOUR PA by £1,260 (saves partner £252)
const BLIND_PERSONS_ALLOWANCE = 3_250       // 2026/27 indexed rate
const PA_TAPER_START = 100_000
const PA_TAPER_END = 125_140

// rUK bands (income above PA)
const RUK_BASIC_LIMIT = 50_270      // 20% up to here
const RUK_HIGHER_LIMIT = 125_140    // 40% up to here, 45% above

// Scotland bands (absolute income thresholds)
const SCO_STARTER_END   = 16_537    // 19%
const SCO_BASIC_END     = 29_526    // 20%
const SCO_INTERMEDIATE_END = 43_662 // 21%
const SCO_HIGHER_END    = 75_000    // 42%
const SCO_ADVANCED_END  = 125_140   // 45%
// 48% above SCO_ADVANCED_END

// NI thresholds 2026/27
const NI_PRIMARY_THRESHOLD  = 12_570
const NI_UPPER_EARNINGS     = 50_270
const NI_CLASS1_MAIN  = 0.08  // Employed: 8% on earnings £12.5k–£50.2k
const NI_CLASS1_UPPER = 0.02  // Employed: 2% above £50.2k
const NI_CLASS4_MAIN  = 0.06  // Self-Employed: 6% on profits £12.5k–£50.2k
const NI_CLASS4_UPPER = 0.02  // Self-Employed: 2% above
const NI_CLASS2_WEEKLY = 3.65
const NI_CLASS2_SMALL_PROFITS = 6_845

// Dividends 2026/27
const DIVIDEND_ALLOWANCE = 500
const DIVIDEND_BASIC_RATE  = 0.1075  // 10.75%
const DIVIDEND_HIGHER_RATE = 0.3575  // 35.75%
const DIVIDEND_ADDL_RATE   = 0.3935  // 39.35%

// Student loans
const STUDENT_LOAN: Record<StudentLoanPlan, { threshold: number; rate: number }> = {
  none:         { threshold: 0,      rate: 0    },
  plan1:        { threshold: 26_900, rate: 0.09 },
  plan2:        { threshold: 29_385, rate: 0.09 },
  plan4:        { threshold: 33_795, rate: 0.09 },
  plan5:        { threshold: 25_000, rate: 0.09 },
  postgraduate: { threshold: 21_000, rate: 0.06 },
}

// ─── Personal Allowance with taper ─────────────────────────────────────────
function calcPA(adjustedNetIncome: number): number {
  if (adjustedNetIncome <= PA_TAPER_START) return PA_BASE
  const excess    = adjustedNetIncome - PA_TAPER_START
  const reduction = Math.floor(excess / 2)
  return Math.max(0, PA_BASE - reduction)
}

// ─── rUK Income Tax (3 bands on income above PA) ───────────────────────────
function calcRukTax(taxableIncome: number): { tax: number; bands: TaxBand[] } {
  if (taxableIncome <= 0) return { tax: 0, bands: [] }
  const bands: TaxBand[] = []
  let remaining = taxableIncome
  let tax = 0

  // Basic: 20%
  const basicAmt = Math.min(remaining, RUK_BASIC_LIMIT - PA_BASE)
  if (basicAmt > 0) {
    const t = basicAmt * 0.20
    bands.push({ label: 'Basic Rate', rate: 20, amount: basicAmt, tax: t })
    tax += t; remaining -= basicAmt
  }
  // Higher: 40%
  const higherAmt = Math.min(remaining, RUK_HIGHER_LIMIT - RUK_BASIC_LIMIT)
  if (higherAmt > 0) {
    const t = higherAmt * 0.40
    bands.push({ label: 'Higher Rate', rate: 40, amount: higherAmt, tax: t })
    tax += t; remaining -= higherAmt
  }
  // Additional: 45%
  if (remaining > 0) {
    const t = remaining * 0.45
    bands.push({ label: 'Additional Rate', rate: 45, amount: remaining, tax: t })
    tax += t
  }
  return { tax, bands }
}

// ─── Scotland Income Tax (6 bands on absolute gross income, minus PA) ───────
function calcScotlandTax(grossIncome: number, pa: number): { tax: number; bands: TaxBand[] } {
  const taxable = Math.max(0, grossIncome - pa)
  if (taxable <= 0) return { tax: 0, bands: [] }

  const bands: TaxBand[] = []
  let tax = 0

  // Thresholds relative to the PA level (income above PA)
  const limits = [
    { label: 'Starter Rate',      rate: 19, ceiling: SCO_STARTER_END },
    { label: 'Basic Rate',        rate: 20, ceiling: SCO_BASIC_END },
    { label: 'Intermediate Rate', rate: 21, ceiling: SCO_INTERMEDIATE_END },
    { label: 'Higher Rate',       rate: 42, ceiling: SCO_HIGHER_END },
    { label: 'Advanced Rate',     rate: 45, ceiling: SCO_ADVANCED_END },
    { label: 'Top Rate',          rate: 48, ceiling: Infinity },
  ]

  let prev = PA_BASE // income start for bands
  for (const { label, rate, ceiling } of limits) {
    const bandStart = prev
    const bandEnd   = ceiling
    const lower     = Math.max(0, taxable - Math.max(0, bandStart - pa))
    const upper     = Math.max(0, taxable - Math.max(0, bandEnd   - pa))
    const amount    = lower - upper
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

// ─── NI Class 1 (Employed / Director) ──────────────────────────────────────
function calcClass1NI(earnings: number): number {
  if (earnings <= NI_PRIMARY_THRESHOLD) return 0
  if (earnings <= NI_UPPER_EARNINGS) {
    return (earnings - NI_PRIMARY_THRESHOLD) * NI_CLASS1_MAIN
  }
  return (
    (NI_UPPER_EARNINGS - NI_PRIMARY_THRESHOLD) * NI_CLASS1_MAIN +
    (earnings - NI_UPPER_EARNINGS) * NI_CLASS1_UPPER
  )
}

// ─── NI Class 4 (Self-Employed) ─────────────────────────────────────────────
function calcClass4NI(profit: number): number {
  if (profit <= NI_PRIMARY_THRESHOLD) return 0
  if (profit <= NI_UPPER_EARNINGS) {
    return (profit - NI_PRIMARY_THRESHOLD) * NI_CLASS4_MAIN
  }
  return (
    (NI_UPPER_EARNINGS - NI_PRIMARY_THRESHOLD) * NI_CLASS4_MAIN +
    (profit - NI_UPPER_EARNINGS) * NI_CLASS4_UPPER
  )
}

// ─── Dividend Tax ───────────────────────────────────────────────────────────
function calcDividendTax(
  dividends: number,
  taxableEmploymentIncome: number,
  pa: number,
  region: TaxRegion
): number {
  if (dividends <= DIVIDEND_ALLOWANCE) return 0
  const taxableDivs = dividends - DIVIDEND_ALLOWANCE

  // Dividends are taxed on top of non-dividend income
  const occupiedBand = taxableEmploymentIncome
  const basicBandLimit = region === 'scotland' ? (SCO_BASIC_END - PA_BASE) : (RUK_BASIC_LIMIT - PA_BASE)
  const higherBandLimit = PA_TAPER_END - PA_BASE

  let remaining = taxableDivs
  let tax = 0

  const inBasic  = Math.max(0, basicBandLimit - occupiedBand)
  const basicDiv = Math.min(remaining, inBasic)
  if (basicDiv > 0) { tax += basicDiv * DIVIDEND_BASIC_RATE; remaining -= basicDiv }

  const inHigher  = Math.max(0, higherBandLimit - Math.max(occupiedBand, basicBandLimit))
  const higherDiv = Math.min(remaining, inHigher)
  if (higherDiv > 0) { tax += higherDiv * DIVIDEND_HIGHER_RATE; remaining -= higherDiv }

  if (remaining > 0) tax += remaining * DIVIDEND_ADDL_RATE

  return tax
}

// ─── Student Loan ───────────────────────────────────────────────────────────
function calcStudentLoan(income: number, plan: StudentLoanPlan): number {
  if (plan === 'none') return 0
  const { threshold, rate } = STUDENT_LOAN[plan]
  return Math.max(0, income - threshold) * rate
}

// ─── Main Calculator ─────────────────────────────────────────────────────────
export function calculateTax(input: TaxInput): TaxResult {
  const {
    grossRevenue, allowableExpenses, dividendIncome,
    employmentType, taxRegion, studentLoanPlan, voluntaryClass2NI,
    marriageAllowance, blindPersonsAllowance,
  } = input

  const grossProfit = Math.max(0, grossRevenue - allowableExpenses)

  // PA adjustments: Marriage Allowance reduces YOUR PA; Blind Person's adds to it
  const paBase = calcPA(grossProfit + dividendIncome)
  const paAfterMarriage = marriageAllowance
    ? Math.max(0, paBase - MARRIAGE_ALLOWANCE_TRANSFER)
    : paBase
  const pa = blindPersonsAllowance
    ? paAfterMarriage + BLIND_PERSONS_ALLOWANCE
    : paAfterMarriage

  const taxableIncome = Math.max(0, grossProfit - pa)

  // Income tax on employment/self-employment profit
  const { tax: incomeTax, bands: taxBands } = taxRegion === 'scotland'
    ? calcScotlandTax(grossProfit, pa)
    : calcRukTax(taxableIncome)

  // NI
  const niClass1 = (employmentType === 'employed' || employmentType === 'director')
    ? calcClass1NI(grossProfit) : 0
  const niClass4 = (employmentType === 'self-employed')
    ? calcClass4NI(grossProfit) : 0
  const niClass2 = (employmentType === 'self-employed') && voluntaryClass2NI && (grossProfit < NI_CLASS2_SMALL_PROFITS)
    ? NI_CLASS2_WEEKLY * 52 : 0

  // Dividend tax (directors & others)
  const dividendTax = dividendIncome > 0
    ? calcDividendTax(dividendIncome, taxableIncome, pa, taxRegion)
    : 0

  // Student loan
  const studentLoanRepayment = calcStudentLoan(grossProfit, studentLoanPlan)

  // 60% trap detection
  const sixtyPercentTrap = grossProfit > PA_TAPER_START && grossProfit < PA_TAPER_END
  const taperWarning     = sixtyPercentTrap

  const totalDeductions = incomeTax + niClass1 + niClass4 + niClass2 + dividendTax + studentLoanRepayment
  const netTakeHome     = Math.max(0, grossProfit + dividendIncome - totalDeductions)
  const totalIncome     = grossProfit + dividendIncome
  const effectiveTaxRate = totalIncome > 0 ? (totalDeductions / totalIncome) * 100 : 0

  return {
    grossRevenue,
    allowableExpenses,
    grossProfit,
    personalAllowance: pa,
    taxableIncome,
    incomeTax,
    taxBands,
    niClass1,
    niClass4,
    niClass2,
    dividendTax,
    studentLoanRepayment,
    totalDeductions,
    netTakeHome,
    effectiveTaxRate,
    sixtyPercentTrap,
    taperWarning,
  }
}

// ─── Legacy shim (keeps old callers working) ────────────────────────────────
export interface TaxInput_Legacy {
  grossIncome: number
  employmentType: 'self-employed' | 'employed' | 'both'
  studentLoanPlan: StudentLoanPlan
  voluntaryClass2NI: boolean
}
