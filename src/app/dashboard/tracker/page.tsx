'use client'

import TaxPotCalculator from '@/features/tracker/TaxPotCalculator'
import YearTracker from '@/features/tracker/YearTracker'

export default function TrackerPage() {
  return (
    <div className="page-shell is-wide">
      <div className="mb-8">
        {/* The eyebrow's one-off rgba(244,245,248,0.18) is exactly the `sa-line`
            step — same value, now named. */}
        <div className="text-sa-line text-micro uppercase tracking-[0.15em] font-mono mb-[6px]">
          financial tools · 2026/27
        </div>
        <h1 className="text-sa-white text-h2 font-semibold tracking-[-0.04em] leading-[1.1] mt-0 mb-[6px]">
          Tax Tracker
        </h1>
        <p className="text-sa-muted text-body leading-[1.6] m-0 max-w-[48ch]">
          Know exactly what to set aside each month — and track your running tax bill across the
          full 2026/27 tax year.
        </p>
      </div>

      <div className="flex flex-col gap-6">
        <TaxPotCalculator />
        <YearTracker />
      </div>
    </div>
  )
}
