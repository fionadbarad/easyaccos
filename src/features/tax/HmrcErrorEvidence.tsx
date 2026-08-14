/**
 * The second half of /validation: proof that HMRC's coded errors are mapped to
 * something a person can act on.
 *
 * A separate component from the tax-scenario half because it is separate
 * evidence — that one is about the engine's arithmetic, this one is about the
 * submission surface's error handling. They share a page, not a subject.
 *
 * Every row runs a real HMRC sandbox error body through mapHmrcError(), the
 * same mapper the live submission routes call, so what is shown is what a user
 * would actually see rather than a re-description of it.
 */

import { CheckCircle2, Network } from 'lucide-react'
import { HMRC_ERROR_MESSAGES, mapHmrcError } from '@/lib/hmrc/mtd-errors'
import { bucketErrors, errorCodeOf, HMRC_SCENARIOS } from './validation-scenarios'

export function HmrcErrorEvidence() {
  const results = HMRC_SCENARIOS.map((s) => ({
    ...s,
    rawCode: errorCodeOf(s.responseBody),
    friendly: mapHmrcError(s.responseBody),
  }))
  const buckets = bucketErrors()
  const totalCodes = Object.keys(HMRC_ERROR_MESSAGES).length

  return (
    <>
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
        <code className="font-mono text-sa-muted">Gov-Test-Scenario</code> request header. Each row
        below sends a real HMRC error body through{' '}
        <code className="font-mono text-sa-muted">mapHmrcError()</code> — the exact mapper the live
        submission routes use — so the friendly message shown is the one a user would actually see.
        The point: HMRC&rsquo;s coded errors never reach the user raw, and never collapse into a
        generic &ldquo;submission failed&rdquo;.
      </p>

      {results.map((r) => (
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
    </>
  )
}
