'use client'

// Jurisdiction toggle (rUK / Scotland) + 5-scenario selector. Purely
// presentational — parent owns state.

import { C } from '@/styles/palette'
import type { TaxRegion } from '@/lib/tax-logic'
import { cardStyle, toggleStyle } from './tokens'
import { SCENARIOS, type ScenarioKey } from './scenarios'

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
      <div
        style={{
          ...cardStyle,
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem',
        }}
      >
        <div>
          <span
            style={{
              color: C.muted,
              fontSize: '0.78rem',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
            }}
          >
            Tax Jurisdiction
          </span>
          <div style={{ color: C.muted, fontSize: '0.7rem', marginTop: '2px' }}>
            {taxRegion === 'scotland'
              ? 'Scottish rates: 19%–48% (6 bands)'
              : 'Rest of UK rates: 20% / 40% / 45%'}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={() => setTaxRegion('ruk')} style={toggleStyle(taxRegion === 'ruk')}>
            Rest of UK
          </button>
          <button
            onClick={() => setTaxRegion('scotland')}
            style={toggleStyle(taxRegion === 'scotland')}
          >
            Scotland
          </button>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))',
          gap: '0.5rem',
          marginBottom: '1.5rem',
        }}
      >
        {SCENARIOS.map((s) => (
          <button
            key={s.key}
            onClick={() => setScenario(s.key)}
            style={{
              padding: '0.75rem 0.5rem',
              borderRadius: '8px',
              cursor: 'pointer',
              background: scenario === s.key ? 'rgba(244,245,248,0.08)' : 'transparent',
              border: `1px solid ${scenario === s.key ? C.white : C.border}`,
              color: scenario === s.key ? C.white : C.muted,
              textAlign: 'center',
              transition: 'all 0.15s',
              minHeight: '44px',
            }}
          >
            <div style={{ fontSize: '1.2rem', marginBottom: '2px' }}>{s.icon}</div>
            <div style={{ fontSize: '0.78rem', fontWeight: 600 }}>{s.label}</div>
            <div style={{ fontSize: '0.65rem', opacity: 0.7, marginTop: '1px' }}>{s.desc}</div>
          </button>
        ))}
      </div>
    </>
  )
}
