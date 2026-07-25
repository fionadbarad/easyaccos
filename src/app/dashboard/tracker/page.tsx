'use client'

import { C } from '@/styles/palette'
import TaxPotCalculator from '@/features/tracker/TaxPotCalculator'
import YearTracker from '@/features/tracker/YearTracker'
import { T } from '@/styles/type'

export default function TrackerPage() {
  return (
    <div className="page-shell is-wide">
      <div style={{ marginBottom: '2rem' }}>
        <div
          style={{
            color: 'rgba(244,245,248,0.18)',
            fontSize: T.micro,
            textTransform: 'uppercase',
            letterSpacing: '0.15em',
            fontFamily: 'var(--font-geist-mono), monospace',
            marginBottom: '6px',
          }}
        >
          financial tools · 2026/27
        </div>
        <h1
          style={{
            color: C.white,
            fontSize: T.h2,
            fontWeight: 600,
            letterSpacing: '-0.04em',
            lineHeight: 1.1,
            margin: '0 0 6px',
          }}
        >
          Tax Tracker
        </h1>
        <p
          style={{
            color: C.muted,
            fontSize: T.body,
            lineHeight: 1.6,
            margin: 0,
            maxWidth: '48ch',
          }}
        >
          Know exactly what to set aside each month — and track your running tax bill across the
          full 2026/27 tax year.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <TaxPotCalculator />
        <YearTracker />
      </div>
    </div>
  )
}
