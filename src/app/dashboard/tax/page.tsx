'use client'

import TaxCalculator from '@/features/tax/TaxCalculator'
import { fmtGBP } from '@/lib/formatters'
import {
  PA_BASE,
  RUK_BASIC_RATE,
  RUK_HIGHER_RATE,
  RUK_ADDITIONAL_RATE,
  DIV_ALLOWANCE,
  NI_C4_MAIN,
} from '@/lib/tax/bands-2026'

export default function TaxPage() {
  return (
    <div className="page-shell">
      <div className="max-w-[820px] mb-7">
        <div className="text-sa-muted text-micro uppercase tracking-[0.12em] mb-1.5 font-mono">
          tax engine · 2026/27
        </div>
        <h1 className="text-sa-white text-h2 font-semibold tracking-[-0.03em] mb-[0.4rem]">
          Tax Calculator
        </h1>
        <p className="text-sa-muted text-meta leading-[1.65] max-w-[560px]">
          Five scenarios using 2026/27 rates — resolved locally, no API latency. Estimates only. Use
          the <strong className="text-sa-white font-medium">What-If slider</strong> for real-time
          sensitivity analysis.
        </p>
        {/* Every figure in this strip reads from bands-2026 (CLAUDE.md hard
            rule 1). It used to be six literals, which is exactly the drift this
            page would present to a user as authoritative.

            `${rate * 100}%` rather than pct1(): pct1 renders "20.0%" and this
            strip has always read "20%". Same reasoning as the student loan
            labels in TaxPotCalculator. All four rates multiply cleanly at these
            values, so there is no float artefact to round away. */}
        <div className="mt-3 px-[0.9rem] py-[0.65rem] bg-sa-hover border border-sa-border rounded text-caption text-sa-muted font-mono inline-flex gap-6">
          <span>PA: {fmtGBP(PA_BASE)}</span>
          <span>Basic: {RUK_BASIC_RATE * 100}%</span>
          <span>Higher: {RUK_HIGHER_RATE * 100}%</span>
          <span>Add&apos;l: {RUK_ADDITIONAL_RATE * 100}%</span>
          <span>Div allowance: {fmtGBP(DIV_ALLOWANCE)}</span>
          <span>Class 4 NI: {NI_C4_MAIN * 100}%</span>
        </div>
      </div>
      <TaxCalculator />
    </div>
  )
}
