'use client'

import TaxCalculator from '@/features/tax/TaxCalculator'

export default function TaxPage() {
  return (
    <div className="p-[clamp(1.5rem,4vw,2.5rem)]">
      <div className="max-w-[820px] mb-[1.75rem]">
        <div className="text-[rgba(244,245,248,0.42)] text-[0.62rem] uppercase tracking-[0.12em] mb-[6px] font-mono">
          tax engine · 2026/27
        </div>
        <h1 className="text-[var(--sa-white)] text-[clamp(1.4rem,3vw,1.9rem)] font-semibold tracking-[-0.03em] mb-[0.4rem]">
          Tax Calculator
        </h1>
        <p className="text-[rgba(244,245,248,0.42)] text-[0.84rem] leading-[1.65] max-w-[560px]">
          Five HMRC-accurate scenarios. Hard-coded 2026/27 rates — no API latency.
          Use the <strong className="text-[var(--sa-white)] font-medium">What-If slider</strong> for real-time sensitivity analysis.
        </p>
        <div className="mt-[0.75rem] p-[0.65rem_0.9rem] bg-[rgba(244,245,248,0.04)] border border-[var(--sa-border)] rounded-[4px] text-[0.72rem] text-[rgba(244,245,248,0.42)] font-mono inline-flex gap-[1.5rem]">
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
