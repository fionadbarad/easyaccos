'use client'

import TaxCalculator from '@/features/tax/TaxCalculator'

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
          Five scenarios using 2026/27 rates — hard-coded, no API latency. Estimates only. Use the{' '}
          <strong className="text-sa-white font-medium">What-If slider</strong> for real-time
          sensitivity analysis.
        </p>
        <div className="mt-3 px-[0.9rem] py-[0.65rem] bg-sa-hover border border-sa-border rounded text-caption text-sa-muted font-mono inline-flex gap-6">
          <span>PA: £12,570</span>
          <span>Basic: 20%</span>
          <span>Higher: 40%</span>
          <span>Add&apos;l: 45%</span>
          <span>Div allowance: £500</span>
          <span>Class 4 NI: 6%</span>
        </div>
      </div>
      <TaxCalculator />
    </div>
  )
}
