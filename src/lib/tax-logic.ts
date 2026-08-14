// ─── EasyAcco 2026/27 UK Tax Engine ──────────────────────────────────────────
// An estimator, not a substitute for HMRC's calculation. It models the common
// self-employed / director cases.
//
// Correctness notes:
//   - Money rounded to 2dp via round2() throughout.
//   - Student loan uses trading profit before pension relief, plus dividends
//     once they cross the £2,000 disregard — a cliff edge, not an allowance.
//   - Class 4 NIC uses grossProfit — a personal SIPP does not reduce it (TAX-2).
//   - Unused Personal Allowance shelters dividends before the £500 band (TAX-1).
//   - Plan 2 student loan threshold £29,385/yr (2026/27, HMRC).
//   - Higher-rate band guard: remaining can never go negative.
//   - Pension relief (TAX-10): rUK SIPPs use RELIEF AT SOURCE — the saver pays
//     80%, the provider reclaims 20% into the pot, and higher-rate relief comes
//     from extending the basic-rate band by the gross contribution (not a flat
//     income deduction). The annual allowance is tapered £60k→£10k for high
//     earners, with the £10k MPAA for flexibly-accessed pots. Scottish relief
//     keeps the simpler marginal deduction — a documented simplification.

export type EmploymentType = 'employed' | 'self-employed' | 'director'
export type StudentLoanPlan = 'none' | 'plan1' | 'plan2' | 'plan4' | 'plan5' | 'postgraduate'
export type TaxRegion = 'ruk' | 'scotland'
// Which side of a Marriage Allowance claim the user is on (TAX-8):
//   'transferor' — gives £1,260 of their own PA away (their PA drops)
//   'recipient'  — receives it as a ~£252 tax reducer (their PA is unchanged)
export type MarriageAllowanceRole = 'transferor' | 'recipient'

export interface TaxInput {
  grossRevenue: number
  allowableExpenses: number
  dividendIncome: number
  employmentType: EmploymentType
  taxRegion: TaxRegion
  studentLoanPlan: StudentLoanPlan
  voluntaryClass2NI: boolean // only applies when profit < SPT (£7,105)
  marriageAllowance: boolean // Marriage Allowance claim active
  marriageAllowanceRole?: MarriageAllowanceRole // defaults to 'transferor' (back-compat)
  blindPersonsAllowance: boolean // additional £3,250 PA
  pensionContribution: number // annual GROSS SIPP contribution (incl. the 20% top-up)
  flexiblyAccessedPension?: boolean // triggers the £10k MPAA (defaults false)
}

export interface TaxBand {
  label: string
  rate: number // integer percentage e.g. 20
  amount: number // income in this band
  tax: number // tax payable in this band (2dp)
}

export interface OptimizationTip {
  id: string
  title: string
  description: string
  saving: number // estimated annual saving £ (0 = informational)
}

export interface BreakdownStep {
  label: string
  value: number // positive = income/addition; negative = deduction
  note: string
}

export interface MonthlyBreakdown {
  grossProfit: number
  incomeTax: number
  niClass1: number
  niClass4: number
  niClass2: number
  dividendTax: number
  studentLoan: number
  totalDeductions: number
  netTakeHome: number
}

export interface TaxResult {
  // ── Echo inputs ──────────────────────────────────────────────────────────
  grossRevenue: number
  allowableExpenses: number
  pensionContribution: number // gross contribution, capped at relevant earnings + the (tapered) AA

  // ── Pension (TAX-10) ──────────────────────────────────────────────────────
  annualAllowance: number // the applied allowance (tapered / MPAA where relevant)
  annualAllowanceExceeded: boolean // requested gross contribution was capped by the AA
  pensionReliefAtSource: number // 20% of the gross contribution, added to the pot by HMRC
  pensionNetCost: number // what the saver actually pays out of pocket (80% of gross)

  // ── Computed income chain ─────────────────────────────────────────────
  grossProfit: number // revenue - expenses
  adjustedProfit: number // grossProfit - pensionContribution
  personalAllowance: number // after taper + marriage/blind adjustments (never < 0)
  taxableIncome: number // max(0, adjustedProfit - personalAllowance)

  // ── Income tax ────────────────────────────────────────────────────────
  incomeTax: number // net of any Marriage Allowance recipient reducer
  taxBands: TaxBand[]
  marriageAllowanceReducer: number // £ knocked off tax as MA recipient (0 if n/a)

  // ── National Insurance ───────────────────────────────────────────────
  niClass1: number // employed / director — employee's own liability
  // The EMPLOYER's secondary contribution on the same salary. Reported for the
  // one-person-company case where the user is also the employer; deliberately
  // NOT part of totalDeductions, which is the individual's liability.
  niEmployerClass1: number
  niClass4: number // self-employed
  niClass2: number // voluntary only (deemed = £0)
  niClass2Deemed: boolean // profit >= £7,105 SPT: record protected, no charge

  // ── Other deductions ─────────────────────────────────────────────────
  dividendTax: number
  studentLoanRepayment: number // based on studentLoanBase (before pension)
  studentLoanBase: number // trading profit + dividends once past the disregard

  // ── Totals ────────────────────────────────────────────────────────────
  totalDeductions: number
  netTakeHome: number
  effectiveTaxRate: number // % of total income taken as deductions

  // ── Flags ─────────────────────────────────────────────────────────────
  sixtyPercentTrap: boolean // income £100k–£125,140
  taperWarning: boolean
  mtdWarning: boolean // SE/director gross > £50k

  // ── Extras ────────────────────────────────────────────────────────────
  monthly: MonthlyBreakdown
  optimizationTips: OptimizationTip[]
  breakdown: BreakdownStep[]
}

// ─── 2026/27 Constants ────────────────────────────────────────────────────────
// Single source of truth lives in ./tax/bands-2026.
import {
  PA_BASE,
  PA_TAPER_START,
  PA_TAPER_END,
  MARRIAGE_ALLOWANCE_XFER,
  BLIND_PERSONS_ALLOWANCE,
  RUK_BASIC_RATE_WIDTH,
  RUK_BASIC_LIMIT,
  RUK_HIGHER_LIMIT,
  SCO_STARTER_END,
  SCO_BASIC_END,
  SCO_INTERMEDIATE_END,
  SCO_HIGHER_END,
  SCO_ADVANCED_END,
  ANNUAL_ALLOWANCE,
  PENSION_BASIC_RELIEF_RATE,
  AA_TAPER_THRESHOLD_INCOME,
  AA_TAPER_ADJUSTED_INCOME,
  AA_TAPER_FLOOR,
  MPAA,
  NI_PT,
  NI_UEL,
  NI_C1_MAIN,
  NI_C1_UPPER,
  NI_C4_MAIN,
  NI_C4_UPPER,
  NI_C2_WEEKLY,
  NI_CLASS2_SPT,
  EMPLOYER_NI_RATE,
  EMPLOYER_NI_THRESH,
  DIV_ALLOWANCE,
  DIV_BASIC,
  DIV_HIGHER,
  DIV_ADDL,
  SL_PLAN1_THRESH,
  SL_PLAN2_THRESH,
  SL_PLAN4_THRESH,
  SL_PLAN5_THRESH,
  SL_POSTGRAD_THRESH,
  SL_PLAN_RATE,
  SL_POSTGRAD_RATE,
  SL_UNEARNED_DISREGARD,
} from './tax/bands-2026'

// Student Loan 2026/27
// Every figure comes from bands-2026 \u2014 including the ones inside the labels,
// which are user-facing copy. This table previously carried its own literal
// copy of all five thresholds and both rates while the plan pickers in
// TaxPotCalculator and TaxEstimator2026 read bands-2026, so a threshold change
// would have moved the dropdowns and left the arithmetic behind.
const STUDENT_LOAN: Record<StudentLoanPlan, { threshold: number; rate: number; label: string }> = {
  none: { threshold: 0, rate: 0, label: 'None' },
  plan1: {
    threshold: SL_PLAN1_THRESH,
    rate: SL_PLAN_RATE,
    label: `Plan 1 \u2014 ${fmtGBP(SL_PLAN1_THRESH)} (pre-2012 England/Wales)`,
  },
  plan2: {
    threshold: SL_PLAN2_THRESH,
    rate: SL_PLAN_RATE,
    label: `Plan 2 \u2014 ${fmtGBP(SL_PLAN2_THRESH)} (2012\u20132023)`,
  },
  plan4: {
    threshold: SL_PLAN4_THRESH,
    rate: SL_PLAN_RATE,
    label: `Plan 4 \u2014 ${fmtGBP(SL_PLAN4_THRESH)} (Scotland)`,
  },
  plan5: {
    threshold: SL_PLAN5_THRESH,
    rate: SL_PLAN_RATE,
    label: `Plan 5 \u2014 ${fmtGBP(SL_PLAN5_THRESH)} (post-Aug 2023)`,
  },
  postgraduate: {
    threshold: SL_POSTGRAD_THRESH,
    rate: SL_POSTGRAD_RATE,
    label: `Postgraduate \u2014 ${fmtGBP(SL_POSTGRAD_THRESH)} (${SL_POSTGRAD_RATE * 100}%)`,
  },
}

export const STUDENT_LOAN_LABELS = Object.fromEntries(
  Object.entries(STUDENT_LOAN).map(([k, v]) => [k, v.label]),
) as Record<StudentLoanPlan, string>

// ─── Exported constants (shared across engine modules) ───────────────────────
export {
  PA_BASE,
  PA_TAPER_START,
  PA_TAPER_END,
  RUK_BASIC_RATE_WIDTH,
  RUK_BASIC_LIMIT,
  RUK_HIGHER_LIMIT,
}

// ─── Utility ──────────────────────────────────────────────────────────────────
/**
 * Round to exactly 2 decimal places, half away from zero.
 *
 * The obvious `Math.round(n * 100) / 100` is wrong on the exact cases money
 * cares about: `2.675 * 100` is `267.49999999999997` in binary floating point,
 * so it rounds *down* to 2.67 where a person doing the sum by hand gets 2.68.
 *
 * Shifting the decimal point through the number's own decimal string
 * (`"2.675" + "e2"` → `267.5`) sidesteps the multiplication entirely, so the
 * value we round is the one the user actually typed. Rounding is symmetric
 * about zero so a refund of −2.675 mirrors a charge of 2.675; `Math.round`
 * alone breaks ties toward +∞ and would give −2.67 against +2.68.
 */
export function round2(n: number): number {
  if (!Number.isFinite(n)) return n

  const s = n.toString()
  // Exponential notation ("1e-7") cannot take an "e2" suffix. Magnitudes that
  // extreme are far outside money, so plain arithmetic is adequate there.
  if (s.includes('e') || s.includes('E')) return Math.round(n * 100) / 100

  const scaled = Number(`${s}e2`)
  const rounded = scaled < 0 ? -Math.round(-scaled) : Math.round(scaled)
  const result = Number(`${rounded}e-2`)
  return Number.isFinite(result) ? result : Math.round(n * 100) / 100
}

// fmtGBP lives in lib/formatters.ts — import only, no re-export.
import { fmtGBP } from './formatters'

// ─── Personal Allowance ───────────────────────────────────────────────────────
/**
 * HMRC taper rule:
 *   adjusted_net_income <= £100,000 → full PA = £12,570
 *   adjusted_net_income >  £100,000 → PA = max(0, 12,570 - floor((income - 100,000) / 2))
 *   adjusted_net_income >= £125,140 → PA = £0
 */
export function calcPA(adjustedNetIncome: number): number {
  if (adjustedNetIncome <= PA_TAPER_START) return PA_BASE
  const reduction = Math.floor((adjustedNetIncome - PA_TAPER_START) / 2)
  return Math.max(0, PA_BASE - reduction)
}

// ─── rUK Income Tax ───────────────────────────────────────────────────────────
/**
 * Applied to taxableIncome = max(0, nonDivIncome - PA).
 * The basic rate BAND WIDTH is always £37,700 regardless of PA taper.
 * Higher rate band: from end of basic to £125,140.
 * Additional rate: above £125,140.
 *
 * `bandExtension` widens the basic-rate band (and shifts the higher-/additional-
 * rate thresholds up by the same amount) to deliver SIPP relief at source: a
 * gross pension contribution moves that slice of income from 40%/45% down to 20%
 * (TAX-10). It never narrows the bands.
 */
export function calcRukTax(
  taxableIncome: number,
  bandExtension = 0,
): { tax: number; bands: TaxBand[] } {
  if (taxableIncome <= 0) return { tax: 0, bands: [] }

  const ext = Math.max(0, bandExtension)
  const basicWidth = RUK_BASIC_RATE_WIDTH + ext
  const higherWidth = RUK_HIGHER_LIMIT - RUK_BASIC_RATE_WIDTH // £87,440 — width unchanged, only shifted

  const bands: TaxBand[] = []
  let remaining = taxableIncome
  let totalTax = 0

  // Basic: 20% on the first (£37,700 + extension)
  const basicAmt = Math.min(remaining, basicWidth)
  if (basicAmt > 0) {
    const t = round2(basicAmt * 0.2)
    bands.push({ label: 'Basic Rate', rate: 20, amount: basicAmt, tax: t })
    totalTax += t
    remaining = Math.max(0, remaining - basicAmt)
  }

  // Higher: 40% for the next £87,440 (the higher-rate limit rides up with the
  // basic band, so the additional-rate threshold moves by the extension too).
  // The width must NOT re-subtract the Personal Allowance (doing so starts the
  // 45% rate £12,570 too early and over-taxes additional-rate payers by £628.50).
  if (remaining > 0) {
    const higherAmt = Math.min(remaining, higherWidth)
    if (higherAmt > 0) {
      const t = round2(higherAmt * 0.4)
      bands.push({ label: 'Higher Rate', rate: 40, amount: higherAmt, tax: t })
      totalTax += t
      remaining = Math.max(0, remaining - higherAmt)
    }
  }

  // Additional: 45% above (£125,140 + extension)
  if (remaining > 0) {
    const t = round2(remaining * 0.45)
    bands.push({ label: 'Additional Rate', rate: 45, amount: remaining, tax: t })
    totalTax += t
  }

  return { tax: round2(totalTax), bands }
}

// ─── Scotland Income Tax ──────────────────────────────────────────────────────
export function calcScotlandTax(
  grossIncome: number,
  pa: number,
): { tax: number; bands: TaxBand[] } {
  const taxable = Math.max(0, grossIncome - pa)
  if (taxable <= 0) return { tax: 0, bands: [] }

  const LIMITS = [
    { label: 'Starter Rate', rate: 19, ceiling: SCO_STARTER_END },
    { label: 'Basic Rate', rate: 20, ceiling: SCO_BASIC_END },
    { label: 'Intermediate Rate', rate: 21, ceiling: SCO_INTERMEDIATE_END },
    { label: 'Higher Rate', rate: 42, ceiling: SCO_HIGHER_END },
    { label: 'Advanced Rate', rate: 45, ceiling: SCO_ADVANCED_END },
    { label: 'Top Rate', rate: 48, ceiling: Infinity },
  ]

  // The Scottish ceilings are absolute GROSS thresholds that bake in the standard
  // £12,570 PA, so each band's WIDTH is `ceiling − previousCeiling` (with the
  // first width measured down to PA_BASE). Those widths are then applied to the
  // taxable income (gross − the ACTUAL PA) from £0 up — exactly as calcRukTax
  // does. Seeding the walk from PA_BASE and slicing taxable income directly means
  // a tapered/blind-adjusted PA no longer leaves a slice untaxed or mislabelled
  // for Scots over £100k (TAX-9). (The prior code seeded band edges off the
  // hardcoded £12,570, so `PA_BASE − actualPA` of income fell into no band.)
  const bands: TaxBand[] = []
  let totalTax = 0
  let remaining = taxable
  let prevCeiling = PA_BASE

  for (const { label, rate, ceiling } of LIMITS) {
    const width = ceiling === Infinity ? remaining : Math.max(0, ceiling - prevCeiling)
    const amount = Math.min(remaining, width)
    if (amount > 0) {
      const t = round2(amount * (rate / 100))
      bands.push({ label, rate, amount, tax: t })
      totalTax += t
      remaining -= amount
    }
    prevCeiling = ceiling
    if (remaining <= 0) break
  }

  return { tax: round2(totalTax), bands }
}

// ─── NI Class 1 Secondary (Employer) ─────────────────────────────────────────
/**
 * The EMPLOYER's Class 1 contribution on a salary — 15% of everything above the
 * £5,000 Secondary Threshold from 6 April 2026.
 *
 * This is not the individual's liability, so it is never added to
 * `totalDeductions`. It is reported separately because for a one-person limited
 * company the director IS the employer, and the app's "optimal £12,570 salary —
 * no NI" advice was simply false without it: that salary costs the company
 * £1,135.50 a year in secondary contributions.
 *
 * NOT MODELLED: Employment Allowance, which can offset an employer's secondary
 * bill — but is specifically denied to a single-director company with no other
 * employees, i.e. exactly the case this advice targets. Companies with staff
 * should expect their real cost to be lower than this figure.
 */
export function calcEmployerNI(salary: number): number {
  if (salary <= EMPLOYER_NI_THRESH) return 0
  return round2((salary - EMPLOYER_NI_THRESH) * EMPLOYER_NI_RATE)
}

// ─── NI Class 1 (Employed / Director) ────────────────────────────────────────
// Uses GROSS earnings — see the base note in calculateTax step 6.
export function calcClass1NI(earnings: number): number {
  if (earnings <= NI_PT) return 0
  if (earnings <= NI_UEL) {
    return round2((earnings - NI_PT) * NI_C1_MAIN)
  }
  return round2((NI_UEL - NI_PT) * NI_C1_MAIN + (earnings - NI_UEL) * NI_C1_UPPER)
}

// ─── NI Class 4 (Self-Employed) ──────────────────────────────────────────────
// Uses PROFIT (after expenses, before income tax — not taxable income)
export function calcClass4NI(profit: number): number {
  if (profit <= NI_PT) return 0
  if (profit <= NI_UEL) {
    return round2((profit - NI_PT) * NI_C4_MAIN)
  }
  return round2((NI_UEL - NI_PT) * NI_C4_MAIN + (profit - NI_UEL) * NI_C4_UPPER)
}

// ─── Dividend Tax ─────────────────────────────────────────────────────────────
// Dividends are taxed at the UK-wide rates and bands for ALL UK taxpayers,
// INCLUDING Scottish taxpayers — Scottish bands apply only to non-savings,
// non-dividend income, so the band ceilings here are always the rUK figures.
// Refs: gov.uk/scottish-income-tax; LITRG "Tax on dividends".
//
// Dividends stack on top of non-dividend taxable income. The £500 dividend
// allowance is a 0% NIL-RATE band: the dividends it covers are tax-free but
// STILL USE UP basic/higher rate band, pushing the dividends above the
// allowance up into the next band. (LITRG worked example: £40,650 earnings +
// £10,000 divs → £9,120 @ 10.75% + £380 @ 35.75% = £1,116.25.)
//
// `sparePersonalAllowance` is any Personal Allowance NOT consumed by
// non-dividend income (e.g. a £6k salary leaves £6,570 of PA spare). HMRC sets
// unused PA against dividends first, tax-free, BEFORE the £500 nil-rate band —
// so those dividends are sheltered and never enter the rateable stack. Omitting
// this over-taxes low-salary/high-dividend cases (TAX-1).
// `bandExtension` widens the dividend band ceilings by a gross pension
// contribution, in step with the non-dividend bands, so RAS relief also reaches
// dividends stacked into the extended basic band (TAX-10).
export function calcDividendTax(
  dividends: number,
  taxableNonDivIncome: number,
  sparePersonalAllowance = 0,
  bandExtension = 0,
): number {
  if (dividends <= 0) return 0

  // Dividends covered by unused PA are tax-free and drop out of the stack.
  const rateableDividends = Math.max(0, dividends - Math.max(0, sparePersonalAllowance))
  if (rateableDividends <= 0) return 0

  // Absolute taxable-income ceilings of the UK dividend bands (raised by any
  // pension band extension).
  const ext = Math.max(0, bandExtension)
  const BASIC_CEIL = RUK_BASIC_RATE_WIDTH + ext // 37,700 taxable: dividends at 10.75%
  const HIGHER_CEIL = RUK_HIGHER_LIMIT + ext // 125,140: above this 39.35%

  // The dividend stack occupies taxable-income positions [base, base+rateable).
  // The first £500 (allowance) is taxed at 0% but still CONSUMES band, so the
  // rateable dividends begin one allowance-width higher up the stack.
  const base = Math.max(0, taxableNonDivIncome)
  const allowance = Math.min(rateableDividends, DIV_ALLOWANCE)
  const hi = base + rateableDividends // top of the dividend stack
  let lo = base + allowance // bottom of the RATEABLE dividends
  if (hi <= lo) return 0

  let tax = 0

  const basicPart = Math.max(0, Math.min(hi, BASIC_CEIL) - lo)
  if (basicPart > 0) {
    tax += basicPart * DIV_BASIC
    lo += basicPart
  }

  const higherPart = Math.max(0, Math.min(hi, HIGHER_CEIL) - lo)
  if (higherPart > 0) {
    tax += higherPart * DIV_HIGHER
    lo += higherPart
  }

  const additionalPart = Math.max(0, hi - lo)
  if (additionalPart > 0) tax += additionalPart * DIV_ADDL

  return round2(tax)
}

// ─── Student Loan ─────────────────────────────────────────────────────────────
// IMPORTANT: HMRC computes student loan repayments on TRADING PROFIT (profit
// after allowable expenses, BEFORE pension deductions and BEFORE income tax),
// PLUS unearned income once that crosses the disregard. Not taxableIncome.
//
// THE £2,000 RULE IS A CLIFF EDGE, NOT AN ALLOWANCE (TAX-12). Under Self
// Assessment, unearned income — dividends, savings interest, property — is
// ignored entirely at or below SL_UNEARNED_DISREGARD, and brought in IN FULL
// above it. £2,000 of dividends adds nothing to the base; £2,001 adds the whole
// £2,001, not the £1 of excess. Writing this as `unearned - DISREGARD` is the
// obvious mistake and it under-collects on every affected return.
//
// This engine models dividends as the only unearned income. A user with savings
// or property income sits below the real base and this function cannot know it;
// that is a limit of the input model, not of the rule above.
//
// LOSS YEARS: the trading component is floored at zero before the unearned
// income is added, so a loss does not reduce the dividend part of the base.
// Setting a trading loss against other income for student loan purposes is a
// relief this engine does not model — the floor is the conservative reading and
// it matches how every other base in this file treats a loss.
export function calcStudentLoan(
  tradingProfit: number,
  plan: StudentLoanPlan,
  unearnedIncome: number = 0,
): number {
  if (plan === 'none') return 0
  const { threshold, rate } = STUDENT_LOAN[plan]
  const repayable = Math.max(0, studentLoanBaseFor(tradingProfit, unearnedIncome) - threshold)
  // HMRC floors student-loan repayments to whole pounds — the pence are never
  // collected (SL3 guidance). round2 over-collected by up to 99p (TAX-6).
  return Math.floor(repayable * rate)
}

/**
 * The income the student loan rate is charged on, before the plan threshold.
 * Exported through `TaxResult.studentLoanBase` so the breakdown can show the
 * figure rather than leaving the user to guess why the dividends counted.
 */
export function studentLoanBaseFor(tradingProfit: number, unearnedIncome: number = 0): number {
  const unearned = Math.max(0, unearnedIncome)
  const counted = unearned > SL_UNEARNED_DISREGARD ? unearned : 0
  return Math.max(0, tradingProfit) + counted
}

// ─── Pension Annual Allowance (taper + MPAA) ─────────────────────────────────
/**
 * The pension annual allowance for the year (TAX-10).
 *   - Flexibly-accessed DC pot → the £10,000 MPAA (does not itself taper).
 *   - Otherwise £60,000, TAPERED for the highest earners: reduced by £1 for
 *     every £2 of ADJUSTED income above £260,000, but only once THRESHOLD income
 *     also exceeds £200,000. Floored at £10,000 (reached at £360,000 adjusted).
 * `thresholdIncome` ≈ taxable income less gross personal pension contributions;
 * `adjustedIncome`  ≈ taxable income (personal contributions are NOT deducted).
 */
export function annualAllowance(opts: {
  thresholdIncome: number
  adjustedIncome: number
  flexiblyAccessed?: boolean
}): number {
  if (opts.flexiblyAccessed) return MPAA
  if (opts.thresholdIncome <= AA_TAPER_THRESHOLD_INCOME) return ANNUAL_ALLOWANCE
  const excess = Math.max(0, opts.adjustedIncome - AA_TAPER_ADJUSTED_INCOME)
  return Math.max(AA_TAPER_FLOOR, ANNUAL_ALLOWANCE - Math.floor(excess / 2))
}

// ─── Optimization Tips ────────────────────────────────────────────────────────
function buildTips(
  adjustedProfit: number,
  dividendIncome: number,
  employmentType: EmploymentType,
  in60pctTrap: boolean,
  incomeTax: number,
): OptimizationTip[] {
  const tips: OptimizationTip[] = []

  // Band position is decided by TOTAL adjusted net income \u2014 dividends included.
  // A \u00a390k profit plus \u00a330k of dividends sits squarely in the taper, and the
  // tips have to be measured against that, not against the trading profit alone.
  const adjustedNetIncome = adjustedProfit + Math.max(0, dividendIncome)
  // Pension contributions are only relievable up to relevant EARNINGS, so a
  // suggested contribution can never exceed the trading profit however much
  // dividend income sits on top of it.
  const relievable = Math.max(0, adjustedProfit)

  if (in60pctTrap) {
    const toEscape = Math.min(adjustedNetIncome - PA_TAPER_START, relievable)
    const saving = Math.round(toEscape * 0.6)
    if (toEscape > 0) {
      const fullEscape = adjustedNetIncome - PA_TAPER_START <= relievable
      tips.push({
        id: 'pension-60pct',
        title: 'Escape the 60% Trap',
        description:
          `Contribute ${fmtGBP(toEscape)} to a SIPP. ` +
          (fullEscape
            ? `This reduces your adjusted income to exactly \u00a3100,000, fully restores your Personal Allowance, and saves `
            : `That is the most you can relieve this year (contributions are capped at your relevant earnings), which recovers part of your Personal Allowance and saves `) +
          `approximately ${fmtGBP(saving)} in tax.`,
        saving,
      })
    }
  }

  if (adjustedNetIncome > RUK_BASIC_LIMIT && !in60pctTrap) {
    const higherSlice = Math.min(adjustedNetIncome, PA_TAPER_START) - RUK_BASIC_LIMIT
    const suggest = Math.min(10_000, higherSlice, relievable)
    const saving = Math.round(suggest * 0.4)
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
    const saving = Math.round((niSlice * NI_C4_MAIN) / 3)
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
    grossRevenue,
    allowableExpenses,
    dividendIncome,
    employmentType,
    taxRegion,
    studentLoanPlan,
    voluntaryClass2NI,
    marriageAllowance,
    marriageAllowanceRole = 'transferor',
    blindPersonsAllowance,
    pensionContribution,
    flexiblyAccessedPension = false,
  } = input

  // ── 1. Profit after allowable expenses ─────────────────────────────────────
  // Trading profit can be NEGATIVE — a legitimate loss year where expenses
  // exceed revenue. We keep the real signed figure so the breakdown reports the
  // loss; every downstream tax/NIC step already floors its own base at 0, so a
  // loss correctly yields zero tax instead of a clamp that hides it (TAX-11).
  const grossProfit = grossRevenue - allowableExpenses
  const earnings = Math.max(0, grossProfit) // relevant earnings (floor at 0 in a loss year)

  // ── 2. Pension: gross contribution, relief at source, tapered annual allowance ─
  // The input is the GROSS contribution (the amount landing in the pot). Relief
  // is at source: the saver pays 80%, HMRC tops up the 20% basic rate into the
  // pot, and higher-rate relief is delivered by extending the basic-rate band in
  // step 5 — NOT by reducing taxable income (TAX-10). Relievable up to relevant
  // earnings and the (possibly tapered) annual allowance.
  const requestedPension = Math.max(0, pensionContribution)
  const adjustedIncomeForAA = earnings + dividendIncome // personal contribs not deducted here
  const earningsCappedPension = Math.min(requestedPension, earnings)
  const thresholdIncomeForAA = Math.max(0, adjustedIncomeForAA - earningsCappedPension)
  const appliedAnnualAllowance = annualAllowance({
    thresholdIncome: thresholdIncomeForAA,
    adjustedIncome: adjustedIncomeForAA,
    flexiblyAccessed: flexiblyAccessedPension,
  })
  const pensionGross = Math.min(earningsCappedPension, appliedAnnualAllowance)
  const annualAllowanceExceeded = earningsCappedPension > appliedAnnualAllowance
  const pensionReliefAtSource = round2(pensionGross * PENSION_BASIC_RELIEF_RATE)
  const pensionNetCost = round2(pensionGross - pensionReliefAtSource)

  // adjustedProfit keeps its historic meaning (earnings net of the gross pension)
  // — it feeds NI/Class-2 modelling (unchanged, out of scope) and the Scottish
  // deduction path below.
  const adjustedProfit = Math.max(0, earnings - pensionGross)

  // ── 3. Personal Allowance ──────────────────────────────────────────────────
  // Taper uses adjusted NET income = total income less the gross pension
  // contribution (= earnings + dividends − pensionGross = adjustedProfit + divs).
  // This single figure also drives the taper/60%-trap flags in step 10 — they
  // must agree with the allowance they claim to explain.
  const adjustedNetIncome = adjustedProfit + Math.max(0, dividendIncome)
  const paRaw = calcPA(adjustedNetIncome)
  // Marriage Allowance TRANSFEROR gives £1,260 of PA away → their PA drops.
  // RECIPIENT keeps full PA and instead gets a tax reducer applied after the
  // income-tax bands (see step 5). MA off, or role=recipient, leaves PA intact.
  const isMaTransferor = marriageAllowance && marriageAllowanceRole === 'transferor'
  const paMarr = isMaTransferor ? Math.max(0, paRaw - MARRIAGE_ALLOWANCE_XFER) : paRaw
  const pa = blindPersonsAllowance ? paMarr + BLIND_PERSONS_ALLOWANCE : paMarr
  // PA is never negative
  const personalAllowance = Math.max(0, pa)

  // ── 4/5. Income tax — the relief mechanism differs by region ────────────────
  // rUK: relief at source — the FULL earnings are taxable and the basic-rate
  //      band is extended by the gross contribution to give higher-rate relief.
  // Scotland: a documented simplification keeps marginal relief via deduction —
  //      the pension reduces the taxable base, with no band extension. (Scottish
  //      RAS band mechanics are subtler; see docs/AUDIT.md.)
  const isScotland = taxRegion === 'scotland'
  const nonDivIncome = isScotland ? adjustedProfit : earnings
  const bandExtension = isScotland ? 0 : pensionGross
  const taxableIncome = Math.max(0, nonDivIncome - personalAllowance)

  const { tax: incomeTaxRaw, bands: taxBands } = isScotland
    ? calcScotlandTax(nonDivIncome, personalAllowance)
    : calcRukTax(taxableIncome, bandExtension)

  // Marriage Allowance RECIPIENT relief: a tax reducer of 20% × £1,260 = £252
  // (given at the rUK basic rate even for Scottish taxpayers), non-refundable so
  // capped at the tax due. Only available if the recipient is NOT a higher-/
  // additional-rate payer — rUK basic (20%), or Scotland up to intermediate
  // (21%). Ineligible → £0 (TAX-8).
  const maxEligibleRate = taxRegion === 'scotland' ? 21 : 20
  const maRecipientEligible =
    marriageAllowance &&
    marriageAllowanceRole === 'recipient' &&
    !taxBands.some((b) => b.rate > maxEligibleRate)
  const marriageAllowanceReducer = maRecipientEligible
    ? Math.min(round2(incomeTaxRaw), round2(MARRIAGE_ALLOWANCE_XFER * 0.2))
    : 0
  const incomeTax = round2(Math.max(0, incomeTaxRaw - marriageAllowanceReducer))

  // ── 6. National Insurance ──────────────────────────────────────────────────
  // NEITHER class of NIC is reduced by a personal pension. `pensionContribution`
  // is documented as a GROSS SIPP contribution given relief at source: the saver
  // pays it out of income already taxed and NIC'd, and the relief arrives as the
  // provider's 20% top-up plus a wider basic-rate band. Only SALARY SACRIFICE
  // lowers an NIC base, and that is a different arrangement this engine does not
  // model. Both bases are therefore the pre-pension figure.
  //
  // Class 1: employed / director — on GROSS PAY, which means neither the pension
  // NOR the allowable expenses come off it.
  //
  // Expenses were still being deducted here after the pension fix, which was the
  // same mistake half-corrected: `earnings` is revenue LESS expenses, so a
  // £50,000 salary with £5,000 of employment expenses was charged Class 1 on
  // £45,000 — under-collecting £400, exactly 8% of the expenses.
  //
  // Deductible employment expenses (s336 ITEPA 2003) reduce TAXABLE INCOME for
  // income tax; they do not reduce "earnings" for NIC purposes (s3 SSCBA 1992).
  // Income tax and NICs simply have different bases, and the engine has to keep
  // them apart. Hence grossRevenue, not grossProfit and not adjustedProfit.
  const salaryForNi = Math.max(0, grossRevenue)
  const isEmployedOrDirector = employmentType === 'employed' || employmentType === 'director'
  const niClass1 = isEmployedOrDirector ? calcClass1NI(salaryForNi) : 0

  // The employer's side of the same salary. Reported, never added to the
  // individual's deductions — see calcEmployerNI.
  const niEmployerClass1 = isEmployedOrDirector ? calcEmployerNI(salaryForNi) : 0

  // Class 4: self-employed — on trading PROFIT before pension (TAX-2).
  const niClass4 = employmentType === 'self-employed' ? calcClass4NI(grossProfit) : 0

  // Class 2 (2026/27 rules):
  //   Profit >= £7,105 (SPT) → deemed paid, NI record protected, ZERO actual charge
  //   Profit <  £7,105       → optional voluntary payment of £3.65/wk
  const niClass2Deemed = employmentType === 'self-employed' && adjustedProfit >= NI_CLASS2_SPT
  const niClass2Voluntary =
    employmentType === 'self-employed' && !niClass2Deemed && voluntaryClass2NI
  const niClass2 = niClass2Voluntary ? round2(NI_C2_WEEKLY * 52) : 0

  // ── 7. Dividend tax ────────────────────────────────────────────────────────
  // Personal Allowance not used by non-dividend income shelters dividends first
  // (TAX-1). Dividends stack on the non-dividend taxable income and their bands
  // ride up with any rUK pension band extension (TAX-10).
  const sparePersonalAllowance = Math.max(0, personalAllowance - nonDivIncome)
  const dividendTax =
    dividendIncome > 0
      ? calcDividendTax(dividendIncome, taxableIncome, sparePersonalAllowance, bandExtension)
      : 0

  // ── 8. Student loan ────────────────────────────────────────────────────────
  // Base = trading profit (after expenses, BEFORE pension deduction) plus
  // dividends, but ONLY once the dividends exceed the disregard — at which
  // point the whole amount counts, not the excess. See calcStudentLoan.
  const studentLoanBase = studentLoanBaseFor(grossProfit, dividendIncome)
  const studentLoanRepayment = calcStudentLoan(grossProfit, studentLoanPlan, dividendIncome)

  // ── 9. Totals ──────────────────────────────────────────────────────────────
  const totalDeductions = round2(
    incomeTax + niClass1 + niClass4 + niClass2 + dividendTax + studentLoanRepayment,
  )
  // Cash position. rUK relief-at-source: you keep your full income, pay
  // tax/NI/SL, and pay only the NET (80%) pension cost out of pocket — the 20%
  // top-up is HMRC's money added to the pot. Scotland (deduction model): the
  // whole gross contribution leaves pre-tax income, matching the reduced base.
  const totalIncome = isScotland ? adjustedProfit + dividendIncome : earnings + dividendIncome
  const outOfPocketPension = isScotland ? 0 : pensionNetCost
  const netTakeHome = round2(Math.max(0, totalIncome - totalDeductions - outOfPocketPension))
  // Defensive: effective rate capped at 100%
  const effectiveTaxRate =
    totalIncome > 0 ? Math.min(100, round2((totalDeductions / totalIncome) * 100)) : 0

  // ── 10. Flags ──────────────────────────────────────────────────────────────
  // The trap is a property of ADJUSTED NET INCOME — the same figure the taper in
  // step 3 uses. Measuring it on adjustedProfit alone meant a user whose income
  // crossed £100,000 only once dividends were counted had their Personal
  // Allowance quietly tapered while the app told them they were not in the trap
  // and withheld the tip that would have fixed it.
  const sixtyPercentTrap = adjustedNetIncome > PA_TAPER_START && adjustedNetIncome < PA_TAPER_END
  const taperWarning = sixtyPercentTrap
  const mtdWarning =
    (employmentType === 'self-employed' || employmentType === 'director') && grossRevenue > 50_000

  // ── 11. Monthly breakdown ──────────────────────────────────────────────────
  const monthly: MonthlyBreakdown = {
    grossProfit: round2(adjustedProfit / 12),
    incomeTax: round2(incomeTax / 12),
    niClass1: round2(niClass1 / 12),
    niClass4: round2(niClass4 / 12),
    niClass2: round2(niClass2 / 12),
    dividendTax: round2(dividendTax / 12),
    studentLoan: round2(studentLoanRepayment / 12),
    totalDeductions: round2(totalDeductions / 12),
    netTakeHome: round2(netTakeHome / 12),
  }

  // ── 12. Optimization tips ──────────────────────────────────────────────────
  const optimizationTips = buildTips(
    adjustedProfit,
    dividendIncome,
    employmentType,
    sixtyPercentTrap,
    incomeTax,
  )

  // ── 13. Step-by-step breakdown ────────────────────────────────────────────
  const breakdown: BreakdownStep[] = [
    {
      label: 'Gross Revenue',
      value: grossRevenue,
      note: 'Total income or turnover before any deductions',
    },
    {
      label: 'Allowable Expenses',
      value: -allowableExpenses,
      note: 'Business costs deducted from revenue — tax is calculated on profit, not revenue',
    },
    {
      label: 'Gross Profit',
      value: grossProfit,
      note: 'Revenue minus expenses — this is the base for NI Class 4 and student loan',
    },
    {
      label: 'Gross Pension Contribution',
      value: -pensionGross,
      note: isScotland
        ? 'SIPP/pension reduces the taxable base at your marginal rate (Scottish estimate)'
        : `Relief at source: you pay ${fmtGBP(pensionNetCost)}, HMRC adds ${fmtGBP(pensionReliefAtSource)} to your pot. Higher-rate relief comes from the wider basic-rate band below`,
    },
    {
      label: 'Adjusted Net Income',
      value: adjustedProfit,
      note:
        (isScotland
          ? 'Income less the gross pension — the Personal Allowance taper and income-tax base'
          : 'Income less the gross pension — used for the Personal Allowance taper check') +
        (dividendIncome > 0
          ? `. The taper is measured on ${fmtGBP(adjustedNetIncome)} — this figure plus your ${fmtGBP(dividendIncome)} of dividends`
          : ''),
    },
    {
      label: 'Personal Allowance',
      value: -personalAllowance,
      note:
        personalAllowance < PA_BASE
          ? `Tapered: \u00a3${PA_BASE.toLocaleString()} reduced by \u00a3${(PA_BASE - personalAllowance).toLocaleString()} because income > \u00a3100,000`
          : 'Standard 2026/27 allowance \u2014 income below taper threshold',
    },
    {
      label: 'Taxable Income',
      value: taxableIncome,
      note: isScotland
        ? 'The amount subject to Income Tax rates (Personal Allowance is subtracted above)'
        : `Full earnings less Personal Allowance — the basic-rate band is widened by ${fmtGBP(pensionGross)} to give pension relief`,
    },
    ...(annualAllowanceExceeded
      ? [
          {
            label: 'Annual Allowance applied',
            value: appliedAnnualAllowance,
            note: 'Contribution capped at the (tapered / MPAA) annual allowance — the excess is not relieved here',
          },
        ]
      : []),
    ...(marriageAllowanceReducer > 0
      ? [
          {
            label: 'Marriage Allowance (received)',
            value: -marriageAllowanceReducer,
            note: 'Tax reducer of 20% × £1,260 for the receiving partner (basic-rate only)',
          },
        ]
      : []),
  ]

  return {
    grossRevenue,
    allowableExpenses,
    pensionContribution: pensionGross,
    annualAllowance: appliedAnnualAllowance,
    annualAllowanceExceeded,
    pensionReliefAtSource,
    pensionNetCost,
    grossProfit,
    adjustedProfit,
    personalAllowance,
    taxableIncome,
    incomeTax,
    taxBands,
    marriageAllowanceReducer,
    niClass1,
    niEmployerClass1,
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
  grossRevenue?: string
  allowableExpenses?: string
  dividendIncome?: string
  pensionContribution?: string
}

export function validateTaxInput(input: TaxInput): ValidationErrors {
  const e: ValidationErrors = {}
  const MAX = 9_999_999

  // Every check below is a `<`/`>` comparison, and EVERY comparison against NaN
  // is false \u2014 so NaN (and \u00b1Infinity) used to pass validation untouched, flow
  // straight into calculateTax, and come back out as NaN in every field for the
  // UI to render as "\u00a3NaN". A blank or half-typed number input reaches here as
  // NaN routinely, so this is the common path, not an exotic one. Reject
  // non-finite values up front, the way missingVatFields already does.
  const NOT_A_NUMBER = 'Enter a valid number'
  if (!Number.isFinite(input.grossRevenue)) e.grossRevenue = NOT_A_NUMBER
  else if (input.grossRevenue < 0) e.grossRevenue = 'Gross income cannot be negative'
  else if (input.grossRevenue > MAX) e.grossRevenue = 'Maximum supported income is \u00a39,999,999'

  // Expenses may legitimately equal or exceed revenue \u2014 that is a trading loss,
  // not an error. Only a negative or oversized figure is rejected (TAX-11).
  if (!Number.isFinite(input.allowableExpenses)) e.allowableExpenses = NOT_A_NUMBER
  else if (input.allowableExpenses < 0) e.allowableExpenses = 'Expenses cannot be negative'
  else if (input.allowableExpenses > MAX)
    e.allowableExpenses = 'Maximum supported expenses is \u00a39,999,999'

  if (!Number.isFinite(input.dividendIncome)) e.dividendIncome = NOT_A_NUMBER
  else if (input.dividendIncome < 0) e.dividendIncome = 'Dividend income cannot be negative'
  else if (input.dividendIncome > MAX)
    e.dividendIncome = 'Maximum supported dividend income is \u00a39,999,999'

  // Exceeding the annual allowance is NOT an input error (TAX-15).
  //
  // The old rule rejected anything over \u00a360,000 with "Exceeds \u00a360,000 annual
  // pension allowance", which was wrong in both directions. Wrong high: CARRY
  // FORWARD lets you use unused allowance from the previous three tax years, so
  // a \u00a3120,000 gross contribution can be entirely legitimate and the form
  // simply refused to accept it. Wrong low: for a high earner the TAPERED
  // allowance bottoms out at \u00a310,000 (and the MPAA is a flat \u00a310,000), so
  // \u00a360,000 was never their ceiling and the message quoted a figure that did
  // not apply to them.
  //
  // No figure the engine produces was ever wrong \u2014 `annualAllowance()` already
  // applies the taper and the MPAA, caps the contribution, and reports the cap
  // through `annualAllowanceExceeded` and `annualAllowance` on the result. So
  // validation only rejects what is genuinely unusable, and the RESULT explains
  // the cap where the user can see it against their own numbers.
  //
  // Not done here: letting the user declare unused allowance from earlier
  // years so carry-forward is modelled rather than merely permitted. That needs
  // a new input, which is a form-design change \u2014 see docs/AUDIT.md TAX-15.
  if (!Number.isFinite(input.pensionContribution)) e.pensionContribution = NOT_A_NUMBER
  else if (input.pensionContribution < 0)
    e.pensionContribution = 'Pension contribution cannot be negative'
  else if (input.pensionContribution > MAX)
    e.pensionContribution = 'Maximum supported pension contribution is \u00a39,999,999'

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
  grossIncome: number
  employmentType: 'self-employed' | 'employed' | 'both'
  studentLoanPlan: StudentLoanPlan
  voluntaryClass2NI: boolean
}
