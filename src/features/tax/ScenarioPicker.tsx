'use client'

// Jurisdiction toggle (rUK / Scotland) + 5-scenario selector. Purely
// presentational - parent owns state.

import type { TaxRegion } from '@/lib/tax-logic'
import { SCENARIOS, type ScenarioKey } from './scenarios'

export default function ScenarioPicker({
  scenario, setScenario, taxRegion, setTaxRegion,
}: {
  scenario: ScenarioKey
  setScenario: (k: ScenarioKey) => void
  taxRegion: TaxRegion
  setTaxRegion: (r: TaxRegion) => void
}) {
  return (
    <>
      <div className="bg-[var(--sa-surface)] border border-[var(--sa-border)] rounded-[10px] p-6 mb-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <span className="text-[rgba(244,245,248,0.42)] text-[0.78rem] uppercase tracking-[0.08em]">Tax Jurisdiction</span>
          <div className="text-[rgba(244,245,248,0.42)] text-[0.7rem] mt-0.5">
            {taxRegion === 'scotland' ? 'Scottish rates: 19%–48% (6 bands)' : 'Rest of UK rates: 20% / 40% / 45%'}
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setTaxRegion('ruk')} className={`px-[14px] py-[6px] rounded-md cursor-pointer text-[0.78rem] font-semibold min-h-[36px] transition-all duration-150 ${taxRegion === 'ruk' ? 'bg-[rgba(244,245,248,0.1)] border border-[var(--sa-white)] text-[var(--sa-white)]' : 'bg-transparent border border-[var(--sa-border)] text-[rgba(244,245,248,0.42)]'}`}>Rest of UK</button>
          <button onClick={() => setTaxRegion('scotland')} className={`px-[14px] py-[6px] rounded-md cursor-pointer text-[0.78rem] font-semibold min-h-[36px] transition-all duration-150 ${taxRegion === 'scotland' ? 'bg-[rgba(244,245,248,0.1)] border border-[var(--sa-white)] text-[var(--sa-white)]' : 'bg-transparent border border-[var(--sa-border)] text-[rgba(244,245,248,0.42)]'}`}>Scotland</button>
        </div>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(130px,1fr))] gap-2 mb-6">
        {SCENARIOS.map((s) => (
          <button key={s.key} onClick={() => setScenario(s.key)}
            className={`px-2 py-3 rounded-lg cursor-pointer text-center transition-all duration-150 min-h-[44px] ${scenario === s.key ? 'bg-[rgba(244,245,248,0.08)] border border-[var(--sa-white)] text-[var(--sa-white)]' : 'bg-transparent border border-[var(--sa-border)] text-[rgba(244,245,248,0.42)]'}`}>
            <div className="text-[1.2rem] mb-0.5">{s.icon}</div>
            <div className="text-[0.78rem] font-semibold">{s.label}</div>
            <div className="text-[0.65rem] opacity-70 mt-[1px]">{s.desc}</div>
          </button>
        ))}
      </div>
    </>
  )
}
