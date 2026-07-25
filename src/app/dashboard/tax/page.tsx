'use client'

import TaxCalculator from '@/features/tax/TaxCalculator'

import { C } from '@/styles/palette'
import { T } from '@/styles/type'
export default function TaxPage() {
  return (
    <div className="page-shell">
      <div style={{ maxWidth: '820px', marginBottom: '1.75rem' }}>
        <div
          style={{
            color: C.muted,
            fontSize: T.micro,
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
            marginBottom: '6px',
            fontFamily: 'var(--font-geist-mono), monospace',
          }}
        >
          tax engine · 2026/27
        </div>
        <h1
          style={{
            color: C.white,
            fontSize: T.h2,
            fontWeight: 600,
            letterSpacing: '-0.03em',
            marginBottom: '0.4rem',
          }}
        >
          Tax Calculator
        </h1>
        <p style={{ color: C.muted, fontSize: T.meta, lineHeight: 1.65, maxWidth: '560px' }}>
          Five scenarios using 2026/27 rates — hard-coded, no API latency. Estimates only. Use the{' '}
          <strong style={{ color: C.white, fontWeight: 500 }}>What-If slider</strong> for real-time
          sensitivity analysis.
        </p>
        <div
          style={{
            marginTop: '0.75rem',
            padding: '0.65rem 0.9rem',
            background: 'rgba(244,245,248,0.04)',
            border: `1px solid ${C.border}`,
            borderRadius: '4px',
            fontSize: T.caption,
            color: C.muted,
            fontFamily: 'var(--font-geist-mono), monospace',
            display: 'inline-flex',
            gap: '1.5rem',
          }}
        >
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
