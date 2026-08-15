import Link from 'next/link'
import { fmtGBP } from '@/lib/formatters'
import { NI_CLASS2_SPT } from '@/lib/tax/bands-2026'
import { ShieldCheck, AlertCircle, CheckCircle2, Network } from 'lucide-react'
import { fmtVal, runScenarios, tallyScenarios } from '@/features/tax/validation-scenarios'
import { bucketErrors, runHmrcScenarios, totalErrorCodes } from '@/features/tax/hmrc-error-evidence'

export const metadata = {
  title: 'Engine Validation — EasyAcco',
  description:
    'Five HMRC 2026/27 scenarios worked by hand alongside EasyAcco engine output — 60% tax trap, PA fully tapered, Scottish starter rate, director optimal mix, and additional rate with dividends.',
}

// The scenarios, their assertions and the HMRC error mapping all live in
// src/features/tax/ so CI can assert them. This page renders that output and
// does no arithmetic of its own — if a figure here is wrong, the test that
// owns it fails first. See validation-scenarios.ts and hmrc-error-evidence.ts.
export default function ValidationPage() {
  const results = runScenarios()
  const { total: totalChecks, passing: passingChecks, allPass } = tallyScenarios(results)

  // Every Gov-Test-Scenario error body run through the same mapper the live
  // submission routes use, so the page proves the real mapping, not a copy.
  const hmrcResults = runHmrcScenarios()
  const buckets = bucketErrors()
  const totalCodes = totalErrorCodes()

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

        {results.map(({ scenario: s, result, checks }) => (
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
                    <div key={row.label} className="flex justify-between gap-4">
                      <span className="text-sa-muted">{row.label}</span>
                      <span className="tabular-nums">{fmtVal(row.value)}</span>
                    </div>
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
                    {checks.map((c) => (
                      <tr key={c.path} className="border-t border-sa-border">
                        <td className="py-2 text-sa-muted">{c.path}</td>
                        <td className="py-2 tabular-nums">{fmtVal(c.expected)}</td>
                        <td className="py-2 tabular-nums">{fmtVal(c.actual)}</td>
                        <td className="py-2">
                          {c.match ? (
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

        <div className="flex items-center gap-4 mb-3 mt-16 pt-12 border-t border-sa-border">
          <div className="w-[52px] h-[52px] rounded-xl bg-sa-hover border border-sa-border flex items-center justify-center">
            <Network size={24} className="text-sa-white" />
          </div>
          <div>
            <h2 className="text-h2 font-bold m-0">HMRC error handling</h2>
            <p className="text-sa-muted text-body m-0 mt-1">
              Sandbox <code className="font-mono">Gov-Test-Scenario</code> edge cases → the message
              easyacco shows
            </p>
          </div>
        </div>

        <p className="text-sa-muted text-body leading-[1.7] mb-8 mt-6">
          HMRC&rsquo;s sandbox lets you force specific failures with the{' '}
          <code className="font-mono text-sa-muted">Gov-Test-Scenario</code> request header. Each
          row below sends a real HMRC error body through{' '}
          <code className="font-mono text-sa-muted">mapHmrcError()</code> — the exact mapper the
          live submission routes use — so the friendly message shown is the one a user would
          actually see. The point: HMRC&rsquo;s coded errors never reach the user raw, and never
          collapse into a generic &ldquo;submission failed&rdquo;.
        </p>

        {hmrcResults.map((r) => (
          <section
            key={r.govTestScenario}
            className="mb-6 bg-sa-surface border border-sa-border rounded-lg p-5"
          >
            <div className="flex items-center justify-between gap-4 flex-wrap mb-3">
              <code className="font-mono text-meta text-sa-white bg-sa-hover px-2 py-1 rounded">
                Gov-Test-Scenario: {r.govTestScenario}
              </code>
              <div className="flex items-center gap-2">
                <span className="text-sa-muted text-micro font-mono uppercase tracking-[0.1em]">
                  {r.surface}
                </span>
                <span className="text-sa-red text-caption font-mono">HTTP {r.responseStatus}</span>
              </div>
            </div>
            <p className="text-sa-muted text-meta leading-[1.6] mb-4 max-w-[680px]">{r.why}</p>
            <div className="flex flex-col gap-[6px] font-mono text-caption">
              <div className="flex flex-wrap gap-x-3 gap-y-1">
                <span className="text-sa-muted w-[120px] shrink-0">HMRC code</span>
                <span className="text-sa-red">{r.rawCode}</span>
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-1">
                <span className="text-sa-muted w-[120px] shrink-0">easyacco shows</span>
                <span className="text-sa-white inline-flex items-start gap-1.5">
                  <CheckCircle2 size={12} className="text-sa-green mt-[3px] shrink-0" />
                  <span>{r.friendly}</span>
                </span>
              </div>
            </div>
          </section>
        ))}

        <div className="bg-sa-tint border border-sa-border rounded-lg p-5 mt-8">
          <div className="text-sa-muted text-micro uppercase tracking-[0.12em] font-mono mb-4">
            Full coverage — {totalCodes} HMRC codes mapped, zero generic fallbacks
          </div>
          <div className="grid md:grid-cols-2 gap-x-8 gap-y-6">
            {buckets
              .filter((b) => b.entries.length > 0)
              .map((b) => (
                <div key={b.label}>
                  <div className="text-sa-muted text-caption font-semibold mb-2">{b.label}</div>
                  <div className="flex flex-col gap-2">
                    {b.entries.map(([code, msg]) => (
                      <div key={code} className="font-mono text-caption leading-[1.5]">
                        <span className="text-sa-red">{code}</span>
                        <span className="text-sa-muted block">{msg}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        </div>

        <p className="text-sa-muted text-caption leading-[1.6] mt-12">
          Tax calculations executed on the server using the production engine exported from
          <code className="font-mono text-sa-muted px-1">@/lib/tax-engine</code>. 2026/27 HMRC
          rates. Class 2 NI is deemed paid above the Small Profits Threshold of{' '}
          {fmtGBP(NI_CLASS2_SPT)}. Scotland band ranges use the Holyrood-set thresholds for
          non-savings, non-dividend income. HMRC error messages mapped by{' '}
          <code className="font-mono text-sa-muted px-1">@/lib/hmrc/mtd-errors</code>; codes sourced
          from HMRC&rsquo;s published OpenAPI specs.
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
