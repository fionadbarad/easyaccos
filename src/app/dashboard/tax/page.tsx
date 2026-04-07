'use client'

import TaxCalculator5 from '@/components/TaxCalculator5'

const C = { text: '#E5E7EB', muted: 'rgba(229,231,235,0.55)', gold: '#FFD700' }

export default function TaxPage() {
  return (
    <div style={{ padding: 'clamp(1.5rem,4vw,2.5rem)' }}>
      <div style={{ maxWidth: '820px', marginBottom: '1.75rem' }}>
        <h1 style={{ fontFamily: 'var(--font-playfair)', color: C.text, fontSize: 'clamp(1.5rem,3vw,2rem)', fontWeight: 700, marginBottom: '0.3rem' }}>
          Tax Calculator 2026/27
        </h1>
        <p style={{ color: C.muted, fontSize: '0.875rem', lineHeight: 1.6 }}>
          Five HMRC-accurate scenarios. All figures hard-coded — no API required.
          Use the <strong style={{ color: C.gold }}>What-If slider</strong> to see tax changes in real-time.
          Click the <strong style={{ color: C.gold }}>🔊 speaker</strong> icon to have Kittax read your results aloud.
        </p>
      </div>
      <TaxCalculator5 />
    </div>
  )
}
