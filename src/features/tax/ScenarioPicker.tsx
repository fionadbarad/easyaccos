'use client'

// Jurisdiction toggle (rUK / Scotland) + 5-scenario selector. Purely
// presentational — parent owns state.

import type { TaxRegion } from '@/lib/tax-logic'
import { CARD_CLASS, toggleClass } from './tokens'
import { SCENARIOS, type ScenarioKey } from './scenarios'

/** Both branches spelled out in full so Tailwind can see every class. */
function scenarioButtonClass(selected: boolean): string {
  return `px-2 py-3 rounded-[8px] cursor-pointer text-center transition-all duration-150 min-h-[44px] border ${
    selected
      ? 'bg-[rgba(244,245,248,0.08)] border-sa-white text-sa-white'
      : 'bg-transparent border-sa-border text-sa-muted'
  }`
}

export default function ScenarioPicker({
  scenario,
  setScenario,
  taxRegion,
  setTaxRegion,
}: {
  scenario: ScenarioKey
  setScenario: (k: ScenarioKey) => void
  taxRegion: TaxRegion
  setTaxRegion: (r: TaxRegion) => void
}) {
  return (
    <>
      <div className={`${CARD_CLASS} mb-6 flex items-center justify-between flex-wrap gap-3`}>
        <div>
          <span className="text-sa-muted text-caption uppercase tracking-[0.08em]">
            Tax Jurisdiction
          </span>
          <div className="text-sa-muted text-micro mt-[2px]">
            {taxRegion === 'scotland'
              ? 'Scottish rates: 19%–48% (6 bands)'
              : 'Rest of UK rates: 20% / 40% / 45%'}
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setTaxRegion('ruk')} className={toggleClass(taxRegion === 'ruk')}>
            Rest of UK
          </button>
          <button
            onClick={() => setTaxRegion('scotland')}
            className={toggleClass(taxRegion === 'scotland')}
          >
            Scotland
          </button>
        </div>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(130px,1fr))] gap-2 mb-6">
        {SCENARIOS.map((s) => (
          <button
            key={s.key}
            onClick={() => setScenario(s.key)}
            aria-pressed={scenario === s.key}
            className={scenarioButtonClass(scenario === s.key)}
          >
            <div className="text-title mb-[2px]">{s.icon}</div>
            <div className="text-caption font-semibold">{s.label}</div>
            <div className="text-micro opacity-70 mt-px">{s.desc}</div>
          </button>
        ))}
      </div>
    </>
  )
}
