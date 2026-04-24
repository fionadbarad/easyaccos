import Link from 'next/link'
import { calculateTax, type TaxInput, type TaxResult } from '@/services/tax'
import { fmtGBP } from '@/lib/formatters'
import { ShieldCheck, AlertCircle, CheckCircle2 } from 'lucide-react'

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
      { label: 'Higher rate: (125,140 − 50,270) × 40%',      value: 29_948 },
      { label: 'Income tax',                                 value: 37_488 },
    ],
    assertions: [
      { path: 'personalAllowance',   expected: 0 },
      { path: 'incomeTax',           expected: 37_488 },
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
      'Dividend allowance is £500 (2026/27, down from £1,000). First £37,700 of taxable dividends hits 8.75%, the rest 33.75%. ' +
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
      { label: 'Basic band dividends: 37,700 × 8.75%',       value: 3_298.75 },
      { label: 'Higher band dividends: 11,800 × 33.75%',     value: 3_982.50 },
      { label: 'Dividend tax',                               value: 7_281.25 },
    ],
    assertions: [
      { path: 'niClass1',            expected: 0,       note: 'Salary at PT → zero Class 1' },
      { path: 'dividendTax',         expected: 7_281.25 },
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
      { label: 'Higher rate: 74,870 × 40%',                  value: 29_948 },
      { label: 'Additional rate: (160,000 − 112,570) × 45%', value: 21_343.50 },
      { label: 'Income tax',                                 value: 58_831.50 },
      { label: 'Dividend allowance',                         value: 500 },
      { label: 'Dividend tax (additional): 9,500 × 39.35%',  value: 3_738.25 },
    ],
    assertions: [
      { path: 'personalAllowance',   expected: 0 },
      { path: 'incomeTax',           expected: 58_831.50 },
      { path: 'dividendTax',         expected: 3_738.25 },
    ],
  },
]

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
          Each shows the HMRC calculation worked in plain arithmetic, then the live engine's output,
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

        <p className="text-[rgba(244,245,248,0.42)] text-[0.72rem] leading-[1.6] mt-8">
          All calculations executed on the server using the production engine exported from
          <code className="font-mono text-[rgba(244,245,248,0.7)] px-1">@/services/tax</code>.
          2026/27 HMRC rates. Class 2 NI is deemed paid above the Small Profits Threshold of £7,105.
          Scotland band ranges use the Holyrood-set thresholds for non-savings, non-dividend income.
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
