/**
 * The five hand-worked HMRC 2026/27 scenarios behind /validation.
 *
 * This is the strongest evidence in the repo: each scenario carries a column of
 * figures worked by hand from HMRC's own rules, and the page shows them beside
 * what the engine actually returns. It lived inside the page component, which
 * meant the claim was only ever checked by a human looking at a browser. Moving
 * it here lets CI assert it on every run — see __tests__/validation-scenarios.
 *
 * THE `manual` AND `expected` FIGURES ARE DELIBERATELY HARD-CODED. They must
 * NEVER be derived from bands-2026: deriving them would make the page compare
 * the engine against itself and prove nothing. Prose that quotes a threshold
 * still interpolates from bands-2026 — that is copy, not evidence.
 */

import { calculateTax, type TaxInput, type TaxResult } from '@/lib/tax-engine'
import { fmtGBP } from '@/lib/formatters'
import { PA_BASE, PA_TAPER_START, PA_TAPER_END, NI_PT } from '@/lib/tax/bands-2026'

export interface Scenario {
  id: string
  title: string
  why: string
  input: TaxInput
  manual: { label: string; value: number }[]
  assertions: {
    path: keyof TaxResult | 'incomeTax+niClass4' | 'taxBands.length' | 'taxBands[0].rate'
    expected: number | boolean
    note?: string
  }[]
}

export function baseInput(over: Partial<TaxInput>): TaxInput {
  return {
    grossRevenue: 0,
    allowableExpenses: 0,
    dividendIncome: 0,
    employmentType: 'self-employed',
    taxRegion: 'ruk',
    studentLoanPlan: 'none',
    voluntaryClass2NI: false,
    marriageAllowance: false,
    blindPersonsAllowance: false,
    pensionContribution: 0,
    ...over,
  }
}

export const SCENARIOS: Scenario[] = [
  {
    id: 'sixty-percent-trap',
    title: '60% Tax Trap — self-employed at £110,000',
    why:
      `Between ${fmtGBP(PA_TAPER_START)} and ${fmtGBP(PA_TAPER_END)}, the Personal Allowance tapers by £1 for every £2 of income above ${fmtGBP(PA_TAPER_START)}. ` +
      'The lost PA sits inside the 40% higher rate band, creating an effective 60% marginal rate on that slice. ' +
      'This is the single most expensive tax cliff in the UK code and the one most often mis-calculated by DIY tools.',
    input: baseInput({ grossRevenue: 110_000 }),
    manual: [
      { label: 'Gross profit', value: 110_000 },
      { label: 'PA taper: (110,000 − 100,000) ÷ 2', value: -5_000 },
      { label: 'Personal Allowance (12,570 − 5,000)', value: 7_570 },
      { label: 'Taxable income (110,000 − 7,570)', value: 102_430 },
      { label: 'Basic rate: 37,700 × 20%', value: 7_540 },
      { label: 'Higher rate: (102,430 − 37,700) × 40%', value: 25_892 },
      { label: 'Income tax', value: 33_432 },
    ],
    assertions: [
      { path: 'personalAllowance', expected: 7_570, note: 'PA after taper' },
      { path: 'incomeTax', expected: 33_432 },
      { path: 'sixtyPercentTrap', expected: true, note: 'Engine must flag this' },
    ],
  },
  {
    id: 'pa-fully-tapered',
    title: `Personal Allowance fully tapered — ${fmtGBP(PA_TAPER_END)}`,
    why:
      `At exactly ${fmtGBP(PA_TAPER_END)} the entire ${fmtGBP(PA_BASE)} Personal Allowance has been withdrawn. ` +
      'The taxable amount equals gross income. This is the ceiling of the 60% trap and the floor of the 45% additional rate band for taxable income.',
    input: baseInput({ grossRevenue: 125_140 }),
    manual: [
      { label: 'Gross profit', value: 125_140 },
      { label: 'Personal Allowance', value: 0 },
      { label: 'Taxable income', value: 125_140 },
      { label: 'Basic rate: 37,700 × 20%', value: 7_540 },
      { label: 'Higher rate: (125,140 − 37,700) × 40%', value: 34_976 },
      { label: 'Income tax', value: 42_516 },
    ],
    assertions: [
      { path: 'personalAllowance', expected: 0 },
      { path: 'incomeTax', expected: 42_516 },
      { path: 'sixtyPercentTrap', expected: false, note: `Trap ends at ${fmtGBP(PA_TAPER_END)}` },
    ],
  },
  {
    id: 'scotland-starter',
    title: 'Scottish starter rate — £15,000',
    why:
      'Scotland has six income-tax bands (starter 19%, basic 20%, intermediate 21%, higher 42%, advanced 45%, top 48%). ' +
      `At £15,000, income above the shared ${fmtGBP(PA_BASE)} PA falls entirely in the 19% starter band — a subtlety most UK-only calculators miss.`,
    input: baseInput({ grossRevenue: 15_000, taxRegion: 'scotland' }),
    manual: [
      { label: 'Gross profit', value: 15_000 },
      { label: 'Personal Allowance', value: 12_570 },
      { label: 'Taxable income (15,000 − 12,570)', value: 2_430 },
      { label: 'Starter rate: 2,430 × 19%', value: 461.7 },
    ],
    assertions: [
      { path: 'incomeTax', expected: 461.7 },
      { path: 'taxBands.length', expected: 1, note: 'Only the starter band applies' },
      { path: 'taxBands[0].rate', expected: 19 },
    ],
  },
  {
    id: 'director-optimal',
    title: `Director optimal mix — ${fmtGBP(NI_PT)} salary + £50,000 dividends`,
    why:
      'The canonical limited-company structure: salary set at the Primary Threshold (no Class 1 NI) and the rest as dividends. ' +
      'Dividend allowance is £500 (2026/27, down from £1,000) — a 0% band that still uses up £500 of the basic-rate band. ' +
      'So £37,200 of taxable dividends (37,700 − 500) hit 10.75%, the rest 35.75% (2026/27 hiked rates). ' +
      'Getting the dividend-allowance-first ordering wrong is a classic error.',
    input: baseInput({
      grossRevenue: 12_570,
      dividendIncome: 50_000,
      employmentType: 'director',
    }),
    manual: [
      { label: 'Salary (PA fully uses)', value: 12_570 },
      { label: 'Class 1 NI on salary at PT', value: 0 },
      { label: 'Dividend allowance (first £500 tax-free)', value: 500 },
      { label: 'Taxable dividends (50,000 − 500)', value: 49_500 },
      { label: 'Basic-band dividends: (37,700 − 500 allowance) = 37,200 × 10.75%', value: 3_999.0 },
      { label: 'Higher-band dividends: 12,300 × 35.75%', value: 4_397.25 },
      { label: 'Dividend tax', value: 8_396.25 },
    ],
    assertions: [
      { path: 'niClass1', expected: 0, note: 'Salary at PT → zero Class 1' },
      { path: 'dividendTax', expected: 8_396.25 },
    ],
  },
  {
    id: 'additional-rate-dividends',
    title: 'Additional rate + dividends — £160,000 SE + £10,000 divs',
    why:
      `Three-layer complexity: PA is fully gone (income > ${fmtGBP(PA_TAPER_END)}), income tax spans all three bands including 45% additional, ` +
      'and dividends tax at the additional dividend rate (39.35%). Class 4 NI applies across the full profit range. ' +
      'Any one of these three can mask an error in another.',
    input: baseInput({ grossRevenue: 160_000, dividendIncome: 10_000 }),
    manual: [
      { label: `PA (income ≥ ${fmtGBP(PA_TAPER_END)})`, value: 0 },
      { label: 'Basic rate: 37,700 × 20%', value: 7_540 },
      { label: 'Higher rate: 87,440 × 40%', value: 34_976 },
      { label: 'Additional rate: (160,000 − 125,140) × 45%', value: 15_687 },
      { label: 'Income tax', value: 58_203 },
      { label: 'Dividend allowance', value: 500 },
      { label: 'Dividend tax (additional): 9,500 × 39.35%', value: 3_738.25 },
    ],
    assertions: [
      { path: 'personalAllowance', expected: 0 },
      { path: 'incomeTax', expected: 58_203 },
      { path: 'dividendTax', expected: 3_738.25 },
    ],
  },
]

export function pickAssertion(result: TaxResult, path: string): number | boolean | undefined {
  if (path === 'taxBands.length') return result.taxBands.length
  if (path === 'taxBands[0].rate') return result.taxBands[0]?.rate
  if (path === 'incomeTax+niClass4') return result.incomeTax + result.niClass4
  const v = (result as unknown as Record<string, unknown>)[path]
  return typeof v === 'number' || typeof v === 'boolean' ? v : undefined
}

export function fmtVal(v: number | boolean | undefined): string {
  if (v === undefined) return '—'
  if (typeof v === 'boolean') return v ? 'true' : 'false'
  if (Math.abs(v) < 100 && !Number.isInteger(v)) return v.toFixed(2)
  return fmtGBP(v)
}

/** One assertion, resolved against the engine's real output. */
export type ScenarioCheck = Scenario['assertions'][number] & {
  actual: number | boolean | undefined
  match: boolean
}

export type ScenarioResult = {
  scenario: Scenario
  result: TaxResult
  checks: ScenarioCheck[]
}

/**
 * Run every scenario through the engine and compare against the hand-worked
 * figures. Pure — the page renders this and the test asserts on it, so the two
 * cannot disagree.
 *
 * Money is compared to the nearest penny: the hand-worked column is written to
 * 2dp, so an exact `===` would fail on the engine's own float representation.
 */
export function runScenarios(): ScenarioResult[] {
  return SCENARIOS.map((scenario) => {
    const result = calculateTax(scenario.input)
    const checks = scenario.assertions.map((a) => {
      const actual = pickAssertion(result, a.path)
      const match =
        typeof a.expected === 'number' && typeof actual === 'number'
          ? Math.abs(actual - a.expected) < 0.01
          : actual === a.expected
      return { ...a, actual, match }
    })
    return { scenario, result, checks }
  })
}

/** Totals for the page's summary line. */
export function tallyScenarios(results: ScenarioResult[]): {
  total: number
  passing: number
  allPass: boolean
} {
  const total = results.reduce((n, r) => n + r.checks.length, 0)
  const passing = results.reduce((n, r) => n + r.checks.filter((c) => c.match).length, 0)
  return { total, passing, allPass: total === passing }
}
