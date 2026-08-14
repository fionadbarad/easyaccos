/**
 * The evidence behind /validation: five HMRC 2026/27 scenarios worked by hand,
 * and the machinery for checking them against live engine output.
 *
 * Extracted from the page component so it can be tested. The page renders what
 * runScenarios() returns and does no arithmetic of its own — which means the
 * figures shown as proof are the figures the test suite checks, not a second
 * copy that could quietly disagree with them.
 *
 * ── The expected values here are DELIBERATELY hand-typed ──────────────────
 *
 * Every other module in this codebase is required to derive rates and
 * thresholds from bands-2026 (CLAUDE.md hard rule 1). This one is the single
 * exception, and inverting the rule is the entire point: an assertion computed
 * from the same constants the engine uses would pass no matter what the engine
 * did. The manual column is arithmetic worked from HMRC's published rules by a
 * person; if bands-2026 moves and these figures are not re-worked by hand, the
 * page is supposed to go red. That failure is the signal, not a bug.
 *
 * The prose in `why` and `title` still interpolates from bands-2026, because
 * that is copy rather than evidence — it should follow a band change silently.
 */

import { calculateTax, type TaxInput, type TaxResult } from '@/lib/tax-engine'
import { fmtGBP } from '@/lib/formatters'
import { PA_BASE, PA_TAPER_START, PA_TAPER_END, NI_PT } from '@/lib/tax/bands-2026'
import { HMRC_ERROR_MESSAGES } from '@/lib/hmrc/mtd-errors'

/** The engine fields a scenario can assert on, including two derived forms. */
export type AssertionPath =
  keyof TaxResult | 'incomeTax+niClass4' | 'taxBands.length' | 'taxBands[0].rate'

export interface Scenario {
  id: string
  title: string
  why: string
  input: TaxInput
  manual: { label: string; value: number }[]
  assertions: {
    path: AssertionPath
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

// Gov-Test-Scenario header values that drive specific sandbox responses,
// paired with the HMRC error body each one triggers and the human-readable
// message easyacco surfaces via mapHmrcError().
//
// The response bodies are the EXACT shape HMRC's sandbox returns when the
// matching Gov-Test-Scenario is set on a submission. Documented at
// https://developer.service.hmrc.gov.uk/api-documentation/docs/api/service/
export type ScenarioCase = {
  govTestScenario: string
  surface: 'MTD-IT' | 'MTD-VAT'
  why: string
  responseStatus: number
  responseBody: unknown
}

export const HMRC_SCENARIOS: ScenarioCase[] = [
  {
    govTestScenario: 'OVERLAPPING_PERIOD',
    surface: 'MTD-IT',
    why:
      'Sandbox simulates a quarterly period that overlaps a period already on file. ' +
      'HMRC enforces non-overlapping period summaries — submitting one is a hard rejection, not a warning.',
    responseStatus: 403,
    responseBody: {
      code: 'RULE_OVERLAPPING_PERIOD',
      message: 'The period overlaps an existing summary',
    },
  },
  {
    govTestScenario: 'DUPLICATE_SUBMISSION',
    surface: 'MTD-IT',
    why:
      'Sandbox simulates the same period summary being submitted twice. HMRC returns RULE_DUPLICATE_SUBMISSION ' +
      'rather than silently overwriting — important: easyacco must surface this so the user does not assume the second send is a correction.',
    responseStatus: 403,
    responseBody: {
      code: 'RULE_DUPLICATE_SUBMISSION',
      message: 'Submission already exists for this period',
    },
  },
  {
    govTestScenario: 'CLIENT_OR_AGENT_NOT_AUTHORISED',
    surface: 'MTD-IT',
    why:
      'Sandbox simulates the access token being valid but not scoped to this taxpayer (e.g. wrong NINO). ' +
      'In production this is the canonical "your auth went through but you are not allowed to act for this user" failure.',
    responseStatus: 403,
    responseBody: { code: 'CLIENT_OR_AGENT_NOT_AUTHORISED', message: 'Not authorised' },
  },
  {
    govTestScenario: 'VAT_TOTAL_VALUE',
    surface: 'MTD-VAT',
    why:
      'Sandbox simulates totalVatDue not equalling vatDueSales + vatDueAcquisitions. easyacco pre-validates this client-side, ' +
      'so this code only appears if a request bypasses the dashboard — proves the server-side mapping still degrades gracefully.',
    responseStatus: 400,
    responseBody: {
      code: 'INVALID_REQUEST',
      message: 'Invalid request',
      errors: [
        { code: 'VAT_TOTAL_VALUE', message: 'totalVatDue does not equal sales + acquisitions' },
      ],
    },
  },
  {
    govTestScenario: 'TAX_PERIOD_NOT_ENDED',
    surface: 'MTD-VAT',
    why:
      'Sandbox simulates submitting a VAT return for a period that has not finished yet. HMRC rejects rather than ' +
      'accepting a partial-period return — easyacco surfaces the cause so the user knows to wait, not to fix data.',
    responseStatus: 403,
    responseBody: { code: 'TAX_PERIOD_NOT_ENDED', message: 'Tax period has not ended' },
  },
]

const ERROR_BUCKETS: { label: string; prefix: (code: string) => boolean }[] = [
  { label: 'MTD-IT format errors', prefix: (c) => c.startsWith('FORMAT_') },
  {
    label: 'MTD-IT business rules',
    prefix: (c) => c.startsWith('RULE_') || c === 'MATCHING_RESOURCE_NOT_FOUND',
  },
  {
    label: 'MTD-VAT format errors',
    prefix: (c) =>
      [
        'VRN_INVALID',
        'PERIOD_KEY_INVALID',
        'INVALID_REQUEST',
        'INVALID_NUMERIC_VALUE',
        'INVALID_MONETARY_AMOUNT',
        'VAT_TOTAL_VALUE',
        'VAT_NET_VALUE',
      ].includes(c),
  },
  {
    label: 'MTD-VAT business rules',
    prefix: (c) =>
      [
        'NOT_FINALISED',
        'DUPLICATE_SUBMISSION',
        'TAX_PERIOD_NOT_ENDED',
        'RULE_INSOLVENT_TRADER',
      ].includes(c),
  },
  {
    label: 'Auth & rate limits',
    prefix: (c) =>
      [
        'CLIENT_OR_AGENT_NOT_AUTHORISED',
        'INVALID_CREDENTIALS',
        'INVALID_SCOPE',
        'TOO_MANY_REQUESTS',
      ].includes(c),
  },
]

/**
 * Group every mapped HMRC code into display buckets, first match wins, with
 * anything unclaimed collected under "Other" so no code can be silently
 * dropped from the coverage table by a bucket predicate that missed it.
 */
export function bucketErrors(): { label: string; entries: [string, string][] }[] {
  const codes = Object.keys(HMRC_ERROR_MESSAGES)
  const used = new Set<string>()
  const out = ERROR_BUCKETS.map((b) => {
    const entries = codes
      .filter((c) => b.prefix(c) && !used.has(c))
      .map((c) => {
        used.add(c)
        return [c, HMRC_ERROR_MESSAGES[c]] as [string, string]
      })
    return { label: b.label, entries }
  })
  const leftover = codes
    .filter((c) => !used.has(c))
    .map((c) => [c, HMRC_ERROR_MESSAGES[c]] as [string, string])
  if (leftover.length) out.push({ label: 'Other', entries: leftover })
  return out
}

/**
 * The most-specific HMRC code in an error body — first inner error, else the
 * top-level code. The same one mapHmrcError keys off internally.
 */
export function errorCodeOf(body: unknown): string {
  if (typeof body !== 'object' || body === null) return '—'
  const b = body as { code?: string; errors?: Array<{ code?: string }> }
  if (Array.isArray(b.errors) && b.errors[0]?.code) return b.errors[0].code
  return b.code ?? '—'
}

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

export interface CheckedAssertion {
  path: AssertionPath
  expected: number | boolean
  note?: string
  actual: number | boolean | undefined
  pass: boolean
}

export interface ScenarioRun {
  scenario: Scenario
  result: TaxResult
  assertions: CheckedAssertion[]
}

/**
 * Run every scenario through the production engine and check each assertion.
 *
 * Money is compared to within a penny: the hand-worked figures are rounded to
 * 2dp by a person, so an exact === would fail on binary floating-point noise
 * that no user could ever see. Booleans compare exactly — a flag is either
 * raised or it is not.
 */
export function runScenarios(): ScenarioRun[] {
  return SCENARIOS.map((scenario) => {
    const result = calculateTax(scenario.input)
    const assertions = scenario.assertions.map((a) => {
      const actual = pickAssertion(result, a.path)
      const pass =
        typeof a.expected === 'number' && typeof actual === 'number'
          ? Math.abs(actual - a.expected) < 0.01
          : actual === a.expected
      return { ...a, actual, pass }
    })
    return { scenario, result, assertions }
  })
}
