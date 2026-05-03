'use client'

import TaxPotCalculator from '@/features/tracker/TaxPotCalculator'
import YearTracker from '@/features/tracker/YearTracker'

export default function TrackerPage() {
  return (
    <div className="p-[clamp(1.5rem,4vw,2.5rem)] max-w-[960px]">

      <div className="mb-[2rem]">
        <div className="text-[rgba(244,245,248,0.18)] text-[0.6rem] uppercase tracking-[0.15em] font-mono mb-[6px]">
          financial tools · 2026/27
        </div>
        <h1 className="text-[#F4F5F8] text-[clamp(1.4rem,3vw,1.85rem)] font-semibold tracking-[-0.04em] leading-[1.1] m-0 mb-[6px]">
          Tax Tracker
        </h1>
        <p className="text-[rgba(244,245,248,0.42)] text-[0.875rem] leading-[1.6] m-0 max-w-[48ch]">
          Know exactly what to set aside each month — and track your running tax bill across the full 2026/27 tax year.
        </p>
      </div>

      <div className="flex flex-col gap-[1.5rem]">
        <TaxPotCalculator />
        <YearTracker />
      </div>
    </div>
  )
}
