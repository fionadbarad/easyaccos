import type { Metadata } from 'next'
import TaxCalculator5 from '@/components/TaxCalculator5'

export const metadata: Metadata = {
  title: 'Tax Calculator 2026/27',
  description: 'Free HMRC-accurate UK tax calculator for 2026/27. Estimate income tax, National Insurance, dividends, and student loan repayments across 5 scenarios. No sign-up needed.',
  openGraph: {
    title: 'Tax Calculator 2026/27 | EasyAcco',
    description: 'Free HMRC-accurate UK tax calculator. Income tax, NI, dividends, and student loans for 2026/27.',
    url: 'https://www.easyacco.uk/dashboard/tax',
  },
}

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
        <div style={{
          marginTop: '0.75rem',
          display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
          padding: '6px 14px',
          background: 'rgba(234,179,8,0.06)',
          border: '1px solid rgba(234,179,8,0.2)',
          borderRadius: '6px',
          color: 'rgba(229,231,235,0.55)',
          fontSize: '0.75rem',
          lineHeight: 1.5,
        }}>
          <span style={{ color: '#EAB308', fontSize: '0.8rem' }}>⚠</span>
          For illustration only — not financial or tax advice. Always verify with HMRC or a qualified accountant.
        </div>
      </div>
      <TaxCalculator5 />
    </div>
  )
}
