import Link from 'next/link'
import { fmtGBP } from '@/lib/formatters'
import { NI_CLASS2_SPT } from '@/lib/tax/bands-2026'
import { runScenarios, fmtVal } from '@/features/tax/validation-scenarios'
import { HmrcErrorEvidence } from '@/features/tax/HmrcErrorEvidence'
import { ShieldCheck, AlertCircle, CheckCircle2 } from 'lucide-react'

export const metadata = {
  title: 'Engine Validation — EasyAcco',
  description:
    'Five HMRC 2026/27 scenarios worked by hand alongside EasyAcco engine output — 60% tax trap, PA fully tapered, Scottish starter rate, director optimal mix, and additional rate with dividends.',
}

export default function ValidationPage() {
  // Every figure on this page comes from here. The page does no arithmetic of
  // its own, so what is presented as evidence is exactly what
  // validation-scenarios.test.ts checks.
  const results = runScenarios()

  const totalChecks = results.reduce((n, r) => n + r.assertions.length, 0)
  const passingChecks = results.reduce((n, r) => n + r.assertions.filter((c) => c.pass).length, 0)
  const allPass = totalChecks === passingChecks

  return (
    <div className="min-h-screen bg-sa-black text-sa-white py-[clamp(2rem,5vw,4rem)] px-[clamp(1.5rem,5vw,3rem)]">
      <div className="max-w-[960px] mx-auto">
        <Link
          href="/"
          className="inline-block text-sa-muted text-caption no-underline mb-6 hover:text-sa-white"
        >
          ← EasyAcco
        </Link>

        <div className="flex items-center gap-4 mb-3">
          <div className="w-[52px] h-[52px] rounded-xl bg-sa-hover border border-sa-border flex items-center justify-center">
            <ShieldCheck size={24} className="text-sa-white" />
          </div>
          <div>
            <h1 className="text-h2 font-bold m-0">Engine Validation</h1>
            <p className="text-sa-muted text-body m-0 mt-1">
              Five HMRC 2026/27 scenarios worked by hand vs the live engine
            </p>
          </div>
        </div>

        <div
          className={`rounded-xl border p-6 mb-8 flex items-center gap-4
          ${
            allPass ? 'bg-sa-green-tint border-sa-green-line' : 'bg-sa-red-tint border-sa-red-line'
          }`}
        >
          {allPass ? (
            <CheckCircle2 size={24} className="text-sa-green" />
          ) : (
            <AlertCircle size={24} className="text-sa-red" />
          )}
          <div>
            <div className="font-bold text-lead">
              {allPass
                ? 'All assertions pass'
                : `${totalChecks - passingChecks} of ${totalChecks} assertions failing`}
            </div>
            <div className="text-sa-muted text-meta mt-0.5">
              {passingChecks} / {totalChecks} hand-worked figures match engine output to the penny.
              Computed server-side on every request — no stale snapshots.
            </div>
          </div>
        </div>

        <p className="text-sa-muted text-body leading-[1.7] mb-10">
          The five scenarios below were chosen to cover the worst edge cases in UK personal tax: the
          60% trap, full PA withdrawal, Scottish bands, director salary-plus-dividends optimisation,
          and a three-layer additional-rate mix with dividends. Each shows the HMRC calculation
          worked in plain arithmetic, then the live engine&apos;s output, then every numerical
          assertion side-by-side. If any cell flashes red, the engine has drifted from the manual
          calc — that is a blocking bug.
        </p>

        {results.map(({ scenario: s, result, assertions }) => (
          <section key={s.id} className="mb-10 border-b border-sa-border pb-10 last:border-0">
            <h2 className="text-title font-semibold mb-2">{s.title}</h2>
            <p className="text-sa-muted text-meta leading-[1.65] mb-5 max-w-[620px]">{s.why}</p>

            <div className="grid md:grid-cols-2 gap-4 mb-5">
              <div className="bg-sa-surface border border-sa-border rounded-lg p-4">
                <div className="text-sa-muted text-micro uppercase tracking-[0.12em] font-mono mb-3">
                  Manual HMRC calculation
                </div>
                <div className="flex flex-col gap-[6px] font-mono text-meta">
                  {s.manual.map((row) => (
                    <Row key={row.label} label={row.label} value={fmtVal(row.value)} />
                  ))}
                </div>
              </div>

              <div className="bg-sa-surface border border-sa-border rounded-lg p-4">
                <div className="text-sa-muted text-micro uppercase tracking-[0.12em] font-mono mb-3">
                  EasyAcco engine output
                </div>
                <div className="flex flex-col gap-[6px] font-mono text-meta">
                  <Row label="Personal Allowance" value={fmtVal(result.personalAllowance)} />
                  <Row label="Taxable income" value={fmtVal(result.taxableIncome)} />
                  <Row label="Income tax" value={fmtVal(result.incomeTax)} />
                  <Row label="Dividend tax" value={fmtVal(result.dividendTax)} />
                  <Row label="Class 1 NI" value={fmtVal(result.niClass1)} />
                  <Row label="Class 4 NI" value={fmtVal(result.niClass4)} />
                  <Row label="60% trap flag" value={fmtVal(result.sixtyPercentTrap)} />
                </div>
              </div>
            </div>

            <div className="bg-sa-tint border border-sa-border rounded-lg p-4">
              <div className="text-sa-muted text-micro uppercase tracking-[0.12em] font-mono mb-3">
                Assertions
              </div>
              {/* The four assertion columns are wider than a phone screen —
                  scroll the table itself rather than the whole page. */}
              <div className="overflow-x-auto">
                <table className="w-full min-w-[420px] font-mono text-caption">
                  <thead>
                    <tr className="text-sa-muted text-left">
                      <th className="font-normal pb-2">Field</th>
                      <th className="font-normal pb-2">Expected</th>
                      <th className="font-normal pb-2">Engine</th>
                      <th className="font-normal pb-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {assertions.map((c) => (
                      <tr key={c.path} className="border-t border-sa-border">
                        <td className="py-2 text-sa-muted">{c.path}</td>
                        <td className="py-2 tabular-nums">{fmtVal(c.expected)}</td>
                        <td className="py-2 tabular-nums">{fmtVal(c.actual)}</td>
                        <td className="py-2">
                          {c.pass ? (
                            <span className="text-sa-green inline-flex items-center gap-1">
                              <CheckCircle2 size={12} /> pass
                            </span>
                          ) : (
                            <span className="text-sa-red inline-flex items-center gap-1">
                              <AlertCircle size={12} /> fail
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        ))}

        <HmrcErrorEvidence />

        <p className="text-sa-muted text-caption leading-[1.6] mt-12">
          Tax calculations executed on the server using the production engine exported from
          <code className="font-mono text-sa-muted px-1">@/lib/tax-engine</code>. 2026/27 HMRC
          rates. Class 2 NI is deemed paid above the Small Profits Threshold of{' '}
          {fmtGBP(NI_CLASS2_SPT)}. Scotland band ranges use the Holyrood-set thresholds for
          non-savings, non-dividend income. HMRC error messages mapped by{' '}
          <code className="font-mono text-sa-muted">@/lib/hmrc/mtd-errors</code>; codes sourced from
          HMRC&rsquo;s published OpenAPI specs.
        </p>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-sa-muted">{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  )
}
