import Link from 'next/link'
import { calculateTax, type TaxInput, type TaxResult } from '@/lib/tax-engine'
import { fmtGBP } from '@/lib/formatters'
import { HMRC_ERROR_MESSAGES, mapHmrcError } from '@/lib/hmrc/mtd-errors'
import { ShieldCheck, AlertCircle, CheckCircle2, Network } from 'lucide-react'

export const metadata = {
  title: 'Engine Validation — EasyAcco',
  description:
    'Five HMRC 2026/27 scenarios worked by hand alongside EasyAcco engine output — 60% tax trap, PA fully tapered, Scottish starter rate, director optimal mix, and additional rate with dividends.',
}

interface Scenario {
  id:            string
  title:         string
  why:           string
  input:         TaxInput
  manual:        { label: string; value: number }[]
  assertions:    { path: keyof TaxResult | 'incomeTax+niClass4' | 'taxBands.length' | 'taxBands[0].rate'; expected: number | boolean; note?: string }[]
}

function baseInput(over: Partial<TaxInput>): TaxInput {
  return {
    grossRevenue:          0,
    allowableExpenses:     0,
    dividendIncome:        0,
    employmentType:        'self-employed',
    taxRegion:             'ruk',
    studentLoanPlan:       'none',
    voluntaryClass2NI:     false,
    marriageAllowance:     false,
    blindPersonsAllowance: false,
    pensionContribution:   0,
    ...over,
  }
}

const SCENARIOS: Scenario[] = [
  {
    id:    'sixty-percent-trap',
    title: '60% Tax Trap — self-employed at £110,000',
    why:
      'Between £100,000 and £125,140, the Personal Allowance tapers by £1 for every £2 of income above £100,000. ' +
      'The lost PA sits inside the 40% higher rate band, creating an effective 60% marginal rate on that slice. ' +
      'This is the single most expensive tax cliff in the UK code and the one most often mis-calculated by DIY tools.',
    input: baseInput({ grossRevenue: 110_000 }),
    manual: [
      { label: 'Gross profit',                               value: 110_000 },
      { label: 'PA taper: (110,000 − 100,000) ÷ 2',           value: -5_000 },
      { label: 'Personal Allowance (12,570 − 5,000)',         value: 7_570 },
      { label: 'Taxable income (110,000 − 7,570)',            value: 102_430 },
      { label: 'Basic rate: 37,700 × 20%',                    value: 7_540 },
      { label: 'Higher rate: (102,430 − 37,700) × 40%',       value: 25_892 },
      { label: 'Income tax',                                  value: 33_432 },
    ],
    assertions: [
      { path: 'personalAllowance',   expected: 7_570,   note: 'PA after taper' },
      { path: 'incomeTax',           expected: 33_432 },
      { path: 'sixtyPercentTrap',    expected: true,    note: 'Engine must flag this' },
    ],
  },
  {
    id:    'pa-fully-tapered',
    title: 'Personal Allowance fully tapered — £125,140',
    why:
      'At exactly £125,140 the entire £12,570 Personal Allowance has been withdrawn. ' +
      'The taxable amount equals gross income. This is the ceiling of the 60% trap and the floor of the 45% additional rate band for taxable income.',
    input: baseInput({ grossRevenue: 125_140 }),
    manual: [
      { label: 'Gross profit',                               value: 125_140 },
      { label: 'Personal Allowance',                         value: 0 },
      { label: 'Taxable income',                             value: 125_140 },
      { label: 'Basic rate: 37,700 × 20%',                   value: 7_540 },
      { label: 'Higher rate: (125,140 − 37,700) × 40%',      value: 34_976 },
      { label: 'Income tax',                                 value: 42_516 },
    ],
    assertions: [
      { path: 'personalAllowance',   expected: 0 },
      { path: 'incomeTax',           expected: 42_516 },
      { path: 'sixtyPercentTrap',    expected: false,   note: 'Trap ends at £125,140' },
    ],
  },
  {
    id:    'scotland-starter',
    title: 'Scottish starter rate — £15,000',
    why:
      'Scotland has six income-tax bands (starter 19%, basic 20%, intermediate 21%, higher 42%, advanced 45%, top 48%). ' +
      'At £15,000, income above the shared £12,570 PA falls entirely in the 19% starter band — a subtlety most UK-only calculators miss.',
    input: baseInput({ grossRevenue: 15_000, taxRegion: 'scotland' }),
    manual: [
      { label: 'Gross profit',                               value: 15_000 },
      { label: 'Personal Allowance',                         value: 12_570 },
      { label: 'Taxable income (15,000 − 12,570)',           value: 2_430 },
      { label: 'Starter rate: 2,430 × 19%',                  value: 461.70 },
    ],
    assertions: [
      { path: 'incomeTax',           expected: 461.70 },
      { path: 'taxBands.length',     expected: 1,      note: 'Only the starter band applies' },
      { path: 'taxBands[0].rate',    expected: 19 },
    ],
  },
  {
    id:    'director-optimal',
    title: 'Director optimal mix — £12,570 salary + £50,000 dividends',
    why:
      'The canonical limited-company structure: salary set at the Primary Threshold (no Class 1 NI) and the rest as dividends. ' +
      'Dividend allowance is £500 (2026/27, down from £1,000) — a 0% band that still uses up £500 of the basic-rate band. ' +
      'So £37,200 of taxable dividends (37,700 − 500) hit 10.75%, the rest 35.75% (2026/27 hiked rates). ' +
      'Getting the dividend-allowance-first ordering wrong is a classic error.',
    input: baseInput({
      grossRevenue:   12_570,
      dividendIncome: 50_000,
      employmentType: 'director',
    }),
    manual: [
      { label: 'Salary (PA fully uses)',                     value: 12_570 },
      { label: 'Class 1 NI on salary at PT',                 value: 0 },
      { label: 'Dividend allowance (first £500 tax-free)',   value: 500 },
      { label: 'Taxable dividends (50,000 − 500)',           value: 49_500 },
      { label: 'Basic-band dividends: (37,700 − 500 allowance) = 37,200 × 10.75%', value: 3_999.00 },
      { label: 'Higher-band dividends: 12,300 × 35.75%',     value: 4_397.25 },
      { label: 'Dividend tax',                               value: 8_396.25 },
    ],
    assertions: [
      { path: 'niClass1',            expected: 0,       note: 'Salary at PT → zero Class 1' },
      { path: 'dividendTax',         expected: 8_396.25 },
    ],
  },
  {
    id:    'additional-rate-dividends',
    title: 'Additional rate + dividends — £160,000 SE + £10,000 divs',
    why:
      'Three-layer complexity: PA is fully gone (income > £125,140), income tax spans all three bands including 45% additional, ' +
      'and dividends tax at the additional dividend rate (39.35%). Class 4 NI applies across the full profit range. ' +
      'Any one of these three can mask an error in another.',
    input: baseInput({ grossRevenue: 160_000, dividendIncome: 10_000 }),
    manual: [
      { label: 'PA (income ≥ £125,140)',                     value: 0 },
      { label: 'Basic rate: 37,700 × 20%',                   value: 7_540 },
      { label: 'Higher rate: 87,440 × 40%',                  value: 34_976 },
      { label: 'Additional rate: (160,000 − 125,140) × 45%', value: 15_687 },
      { label: 'Income tax',                                 value: 58_203 },
      { label: 'Dividend allowance',                         value: 500 },
      { label: 'Dividend tax (additional): 9,500 × 39.35%',  value: 3_738.25 },
    ],
    assertions: [
      { path: 'personalAllowance',   expected: 0 },
      { path: 'incomeTax',           expected: 58_203 },
      { path: 'dividendTax',         expected: 3_738.25 },
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
type ScenarioCase = {
  govTestScenario: string
  surface:         'MTD-IT' | 'MTD-VAT'
  why:             string
  responseStatus:  number
  responseBody:    unknown
}

const HMRC_SCENARIOS: ScenarioCase[] = [
  {
    govTestScenario: 'OVERLAPPING_PERIOD',
    surface: 'MTD-IT',
    why:
      'Sandbox simulates a quarterly period that overlaps a period already on file. ' +
      'HMRC enforces non-overlapping period summaries — submitting one is a hard rejection, not a warning.',
    responseStatus: 403,
    responseBody:  { code: 'RULE_OVERLAPPING_PERIOD', message: 'The period overlaps an existing summary' },
  },
  {
    govTestScenario: 'DUPLICATE_SUBMISSION',
    surface: 'MTD-IT',
    why:
      'Sandbox simulates the same period summary being submitted twice. HMRC returns RULE_DUPLICATE_SUBMISSION ' +
      'rather than silently overwriting — important: easyacco must surface this so the user does not assume the second send is a correction.',
    responseStatus: 403,
    responseBody:  { code: 'RULE_DUPLICATE_SUBMISSION', message: 'Submission already exists for this period' },
  },
  {
    govTestScenario: 'CLIENT_OR_AGENT_NOT_AUTHORISED',
    surface: 'MTD-IT',
    why:
      'Sandbox simulates the access token being valid but not scoped to this taxpayer (e.g. wrong NINO). ' +
      'In production this is the canonical "your auth went through but you are not allowed to act for this user" failure.',
    responseStatus: 403,
    responseBody:  { code: 'CLIENT_OR_AGENT_NOT_AUTHORISED', message: 'Not authorised' },
  },
  {
    govTestScenario: 'VAT_TOTAL_VALUE',
    surface: 'MTD-VAT',
    why:
      'Sandbox simulates totalVatDue not equalling vatDueSales + vatDueAcquisitions. easyacco pre-validates this client-side, ' +
      'so this code only appears if a request bypasses the dashboard — proves the server-side mapping still degrades gracefully.',
    responseStatus: 400,
    responseBody: {
      code:    'INVALID_REQUEST',
      message: 'Invalid request',
      errors:  [{ code: 'VAT_TOTAL_VALUE', message: 'totalVatDue does not equal sales + acquisitions' }],
    },
  },
  {
    govTestScenario: 'TAX_PERIOD_NOT_ENDED',
    surface: 'MTD-VAT',
    why:
      'Sandbox simulates submitting a VAT return for a period that has not finished yet. HMRC rejects rather than ' +
      'accepting a partial-period return — easyacco surfaces the cause so the user knows to wait, not to fix data.',
    responseStatus: 403,
    responseBody:  { code: 'TAX_PERIOD_NOT_ENDED', message: 'Tax period has not ended' },
  },
]

const ERROR_BUCKETS: { label: string; prefix: (code: string) => boolean }[] = [
  { label: 'MTD-IT format errors',     prefix: (c) => c.startsWith('FORMAT_') },
  { label: 'MTD-IT business rules',    prefix: (c) => c.startsWith('RULE_') || c === 'MATCHING_RESOURCE_NOT_FOUND' },
  { label: 'MTD-VAT format errors',    prefix: (c) => ['VRN_INVALID', 'PERIOD_KEY_INVALID', 'INVALID_REQUEST', 'INVALID_NUMERIC_VALUE', 'INVALID_MONETARY_AMOUNT', 'VAT_TOTAL_VALUE', 'VAT_NET_VALUE'].includes(c) },
  { label: 'MTD-VAT business rules',   prefix: (c) => ['NOT_FINALISED', 'DUPLICATE_SUBMISSION', 'TAX_PERIOD_NOT_ENDED', 'RULE_INSOLVENT_TRADER'].includes(c) },
  { label: 'Auth & rate limits',       prefix: (c) => ['CLIENT_OR_AGENT_NOT_AUTHORISED', 'INVALID_CREDENTIALS', 'INVALID_SCOPE', 'TOO_MANY_REQUESTS'].includes(c) },
]

function bucketErrors(): { label: string; entries: [string, string][] }[] {
  const codes = Object.keys(HMRC_ERROR_MESSAGES)
  const used  = new Set<string>()
  const out   = ERROR_BUCKETS.map((b) => {
    const entries = codes
      .filter((c) => b.prefix(c) && !used.has(c))
      .map((c) => {
        used.add(c)
        return [c, HMRC_ERROR_MESSAGES[c]] as [string, string]
      })
    return { label: b.label, entries }
  })
  const leftover = codes.filter((c) => !used.has(c)).map((c) => [c, HMRC_ERROR_MESSAGES[c]] as [string, string])
  if (leftover.length) out.push({ label: 'Other', entries: leftover })
  return out
}

// Extracts the most-specific HMRC code from an error body (first inner error,
// else top-level) — the code mapHmrcError keys off internally.
function errorCodeOf(body: unknown): string {
  if (typeof body !== 'object' || body === null) return '—'
  const b = body as { code?: string; errors?: Array<{ code?: string }> }
  if (Array.isArray(b.errors) && b.errors[0]?.code) return b.errors[0].code
  return b.code ?? '—'
}

function pickAssertion(result: TaxResult, path: string): number | boolean | undefined {
  if (path === 'taxBands.length')   return result.taxBands.length
  if (path === 'taxBands[0].rate')  return result.taxBands[0]?.rate
  if (path === 'incomeTax+niClass4') return result.incomeTax + result.niClass4
  const v = (result as unknown as Record<string, unknown>)[path]
  return typeof v === 'number' || typeof v === 'boolean' ? v : undefined
}

function fmtVal(v: number | boolean | undefined): string {
  if (v === undefined)    return '—'
  if (typeof v === 'boolean') return v ? 'true' : 'false'
  if (Math.abs(v) < 100 && !Number.isInteger(v)) return v.toFixed(2)
  return fmtGBP(v)
}

export default function ValidationPage() {
  const results = SCENARIOS.map((s) => {
    const result = calculateTax(s.input)
    const checks = s.assertions.map((a) => {
      const actual   = pickAssertion(result, a.path)
      const expected = a.expected
      const match =
        typeof expected === 'number' && typeof actual === 'number'
          ? Math.abs(actual - expected) < 0.01
          : actual === expected
      return { ...a, actual, match }
    })
    return { scenario: s, result, checks }
  })

  const totalChecks   = results.reduce((n, r) => n + r.checks.length, 0)
  const passingChecks = results.reduce((n, r) => n + r.checks.filter((c) => c.match).length, 0)
  const allPass       = totalChecks === passingChecks

  // Run every Gov-Test-Scenario error body through the same mapper the live
  // submission routes use, so the page proves the real mapping, not a copy.
  const hmrcResults = HMRC_SCENARIOS.map((s) => ({
    ...s,
    rawCode:  errorCodeOf(s.responseBody),
    friendly: mapHmrcError(s.responseBody),
  }))
  const buckets = bucketErrors()
  const totalCodes = Object.keys(HMRC_ERROR_MESSAGES).length

  return (
    <div className="min-h-screen bg-[#181818] text-[#F4F5F8] py-[clamp(2rem,5vw,4rem)] px-[clamp(1.5rem,5vw,3rem)]">
      <div className="max-w-[960px] mx-auto">

        <Link href="/" className="inline-block text-[rgba(244,245,248,0.55)] text-[0.78rem] no-underline mb-6 hover:text-[#F4F5F8]">
          ← EasyAcco
        </Link>

        <div className="flex items-center gap-4 mb-3">
          <div className="w-[52px] h-[52px] rounded-xl bg-[rgba(244,245,248,0.06)] border border-[rgba(244,245,248,0.1)] flex items-center justify-center">
            <ShieldCheck size={26} className="text-[#F4F5F8]" />
          </div>
          <div>
            <h1 className="text-[clamp(1.6rem,3.5vw,2.2rem)] font-bold m-0">Engine Validation</h1>
            <p className="text-[rgba(244,245,248,0.55)] text-[0.875rem] m-0 mt-1">
              Five HMRC 2026/27 scenarios worked by hand vs the live engine
            </p>
          </div>
        </div>

        <div className={`rounded-xl border p-6 mb-8 flex items-center gap-4
          ${allPass
            ? 'bg-[rgba(74,222,128,0.06)] border-[rgba(74,222,128,0.25)]'
            : 'bg-[rgba(248,113,113,0.06)] border-[rgba(248,113,113,0.25)]'}`}>
          {allPass
            ? <CheckCircle2 size={28} className="text-[#4ADE80]" />
            : <AlertCircle size={28} className="text-[#F87171]" />}
          <div>
            <div className="font-bold text-[1rem]">
              {allPass ? 'All assertions pass' : `${totalChecks - passingChecks} of ${totalChecks} assertions failing`}
            </div>
            <div className="text-[rgba(244,245,248,0.55)] text-[0.82rem] mt-0.5">
              {passingChecks} / {totalChecks} hand-worked figures match engine output to the penny.
              Computed server-side on every request — no stale snapshots.
            </div>
          </div>
        </div>

        <p className="text-[rgba(244,245,248,0.55)] text-[0.85rem] leading-[1.7] mb-10">
          The five scenarios below were chosen to cover the worst edge cases in UK personal tax:
          the 60% trap, full PA withdrawal, Scottish bands, director salary-plus-dividends optimisation,
          and a three-layer additional-rate mix with dividends.
          Each shows the HMRC calculation worked in plain arithmetic, then the live engine&apos;s output,
          then every numerical assertion side-by-side. If any cell flashes red, the engine has drifted
          from the manual calc — that is a blocking bug.
        </p>

        {results.map(({ scenario: s, result, checks }) => (
          <section key={s.id} className="mb-10 border-b border-[rgba(244,245,248,0.07)] pb-10 last:border-0">

            <h2 className="text-[1.15rem] font-semibold mb-2">{s.title}</h2>
            <p className="text-[rgba(244,245,248,0.55)] text-[0.82rem] leading-[1.65] mb-5 max-w-[620px]">
              {s.why}
            </p>

            <div className="grid md:grid-cols-2 gap-4 mb-5">

              <div className="bg-[#1C1D20] border border-[rgba(244,245,248,0.07)] rounded-lg p-4">
                <div className="text-[rgba(244,245,248,0.42)] text-[0.62rem] uppercase tracking-[0.12em] font-mono mb-3">
                  Manual HMRC calculation
                </div>
                <div className="flex flex-col gap-[6px] font-mono text-[0.8rem]">
                  {s.manual.map((row) => (
                    <div key={row.label} className="flex justify-between gap-4">
                      <span className="text-[rgba(244,245,248,0.7)]">{row.label}</span>
                      <span className="tabular-nums">{fmtVal(row.value)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-[#1C1D20] border border-[rgba(244,245,248,0.07)] rounded-lg p-4">
                <div className="text-[rgba(244,245,248,0.42)] text-[0.62rem] uppercase tracking-[0.12em] font-mono mb-3">
                  EasyAcco engine output
                </div>
                <div className="flex flex-col gap-[6px] font-mono text-[0.8rem]">
                  <Row label="Personal Allowance"     value={fmtVal(result.personalAllowance)} />
                  <Row label="Taxable income"         value={fmtVal(result.taxableIncome)} />
                  <Row label="Income tax"             value={fmtVal(result.incomeTax)} />
                  <Row label="Dividend tax"           value={fmtVal(result.dividendTax)} />
                  <Row label="Class 1 NI"             value={fmtVal(result.niClass1)} />
                  <Row label="Class 4 NI"             value={fmtVal(result.niClass4)} />
                  <Row label="60% trap flag"          value={fmtVal(result.sixtyPercentTrap)} />
                </div>
              </div>
            </div>

            <div className="bg-[rgba(244,245,248,0.02)] border border-[rgba(244,245,248,0.07)] rounded-lg p-4">
              <div className="text-[rgba(244,245,248,0.42)] text-[0.62rem] uppercase tracking-[0.12em] font-mono mb-3">
                Assertions
              </div>
              <table className="w-full font-mono text-[0.78rem]">
                <thead>
                  <tr className="text-[rgba(244,245,248,0.42)] text-left">
                    <th className="font-normal pb-2">Field</th>
                    <th className="font-normal pb-2">Expected</th>
                    <th className="font-normal pb-2">Engine</th>
                    <th className="font-normal pb-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {checks.map((c) => (
                    <tr key={c.path} className="border-t border-[rgba(244,245,248,0.05)]">
                      <td className="py-2 text-[rgba(244,245,248,0.7)]">{c.path}</td>
                      <td className="py-2 tabular-nums">{fmtVal(c.expected)}</td>
                      <td className="py-2 tabular-nums">{fmtVal(c.actual)}</td>
                      <td className="py-2">
                        {c.match
                          ? <span className="text-[#4ADE80] inline-flex items-center gap-1"><CheckCircle2 size={12} /> pass</span>
                          : <span className="text-[#F87171] inline-flex items-center gap-1"><AlertCircle size={12} /> fail</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))}

        <div className="flex items-center gap-4 mb-3 mt-16 pt-12 border-t border-[rgba(244,245,248,0.07)]">
          <div className="w-[52px] h-[52px] rounded-xl bg-[rgba(244,245,248,0.06)] border border-[rgba(244,245,248,0.1)] flex items-center justify-center">
            <Network size={26} className="text-[#F4F5F8]" />
          </div>
          <div>
            <h2 className="text-[clamp(1.4rem,3vw,1.9rem)] font-bold m-0">HMRC error handling</h2>
            <p className="text-[rgba(244,245,248,0.55)] text-[0.875rem] m-0 mt-1">
              Sandbox <code className="font-mono">Gov-Test-Scenario</code> edge cases → the message easyacco shows
            </p>
          </div>
        </div>

        <p className="text-[rgba(244,245,248,0.55)] text-[0.85rem] leading-[1.7] mb-8 mt-6">
          HMRC&rsquo;s sandbox lets you force specific failures with the <code className="font-mono text-[rgba(244,245,248,0.7)]">Gov-Test-Scenario</code> request
          header. Each row below sends a real HMRC error body through{' '}
          <code className="font-mono text-[rgba(244,245,248,0.7)]">mapHmrcError()</code> — the exact mapper the live submission routes use —
          so the friendly message shown is the one a user would actually see. The point: HMRC&rsquo;s coded errors never reach the user raw,
          and never collapse into a generic &ldquo;submission failed&rdquo;.
        </p>

        {hmrcResults.map((r) => (
          <section key={r.govTestScenario} className="mb-6 bg-[#1C1D20] border border-[rgba(244,245,248,0.07)] rounded-lg p-5">
            <div className="flex items-center justify-between gap-4 flex-wrap mb-3">
              <code className="font-mono text-[0.8rem] text-[#F4F5F8] bg-[rgba(244,245,248,0.06)] px-2 py-1 rounded">
                Gov-Test-Scenario: {r.govTestScenario}
              </code>
              <div className="flex items-center gap-2">
                <span className="text-[rgba(244,245,248,0.42)] text-[0.7rem] font-mono uppercase tracking-[0.1em]">{r.surface}</span>
                <span className="text-[#F87171] text-[0.72rem] font-mono">HTTP {r.responseStatus}</span>
              </div>
            </div>
            <p className="text-[rgba(244,245,248,0.55)] text-[0.8rem] leading-[1.6] mb-4 max-w-[680px]">{r.why}</p>
            <div className="flex flex-col gap-[6px] font-mono text-[0.78rem]">
              <div className="flex gap-3">
                <span className="text-[rgba(244,245,248,0.42)] w-[120px] shrink-0">HMRC code</span>
                <span className="text-[#F87171]">{r.rawCode}</span>
              </div>
              <div className="flex gap-3">
                <span className="text-[rgba(244,245,248,0.42)] w-[120px] shrink-0">easyacco shows</span>
                <span className="text-[#F4F5F8] inline-flex items-start gap-1.5">
                  <CheckCircle2 size={13} className="text-[#4ADE80] mt-[3px] shrink-0" />
                  <span>{r.friendly}</span>
                </span>
              </div>
            </div>
          </section>
        ))}

        <div className="bg-[rgba(244,245,248,0.02)] border border-[rgba(244,245,248,0.07)] rounded-lg p-5 mt-8">
          <div className="text-[rgba(244,245,248,0.42)] text-[0.62rem] uppercase tracking-[0.12em] font-mono mb-4">
            Full coverage — {totalCodes} HMRC codes mapped, zero generic fallbacks
          </div>
          <div className="grid md:grid-cols-2 gap-x-8 gap-y-6">
            {buckets.filter((b) => b.entries.length > 0).map((b) => (
              <div key={b.label}>
                <div className="text-[rgba(244,245,248,0.7)] text-[0.72rem] font-semibold mb-2">{b.label}</div>
                <div className="flex flex-col gap-2">
                  {b.entries.map(([code, msg]) => (
                    <div key={code} className="font-mono text-[0.72rem] leading-[1.5]">
                      <span className="text-[#F87171]">{code}</span>
                      <span className="text-[rgba(244,245,248,0.55)] block">{msg}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-[rgba(244,245,248,0.42)] text-[0.72rem] leading-[1.6] mt-12">
          Tax calculations executed on the server using the production engine exported from
          <code className="font-mono text-[rgba(244,245,248,0.7)] px-1">@/lib/tax-engine</code>.
          2026/27 HMRC rates. Class 2 NI is deemed paid above the Small Profits Threshold of £7,105.
          Scotland band ranges use the Holyrood-set thresholds for non-savings, non-dividend income.
          HMRC error messages mapped by <code className="font-mono text-[rgba(244,245,248,0.7)] px-1">@/lib/hmrc/mtd-errors</code>;
          codes sourced from HMRC&rsquo;s published OpenAPI specs.
        </p>

      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-[rgba(244,245,248,0.7)]">{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  )
}
