'use client'

import { useState } from 'react'

const C = {
  bg:     '#0B0E1A',
  card:   '#111827',
  gold:   '#FFD700',
  text:   '#E5E7EB',
  muted:  'rgba(229,231,235,0.6)',
  border: 'rgba(255,215,0,0.18)',
}

type Region = 'SFE' | 'SAAS'

function calculateDaily(amount: number, region: Region): string {
  const today = new Date()
  // 2026/27 SFE next installment: Jan 4, 2027 | SAAS: monthly on the 7th
  const nextDrop =
    region === 'SAAS'
      ? new Date(today.getFullYear(), today.getMonth() + 1, 7)
      : new Date(2027, 0, 4)
  const diffMs  = Math.abs(nextDrop.getTime() - today.getTime())
  const diffDays = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)))
  return (amount / diffDays).toFixed(2)
}

export default function StudentBudgeter() {
  const [amount, setAmount] = useState(3000)
  const [region, setRegion] = useState<Region>('SFE')
  const daily = calculateDaily(amount, region)

  return (
    <div style={{
      padding: '1.5rem', background: 'rgba(255,255,255,0.03)',
      borderRadius: '12px', border: `1px solid ${C.border}`,
      backdropFilter: 'blur(12px)',
    }}>
      <h3 style={{
        color: C.gold, fontWeight: 700, textTransform: 'uppercase',
        letterSpacing: '0.1em', fontSize: '0.7rem', margin: '0 0 1rem',
      }}>
        Daily Survival Budget
      </h3>

      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '140px' }}>
          <label style={{ color: C.muted, fontSize: '0.7rem', display: 'block', marginBottom: '4px' }}>
            Balance remaining (£)
          </label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            style={{
              width: '100%', padding: '8px 12px', borderRadius: '6px',
              background: 'rgba(255,255,255,0.04)', border: `1px solid ${C.border}`,
              color: C.text, fontSize: '0.9rem', outline: 'none',
            }}
          />
        </div>
        <div style={{ minWidth: '120px' }}>
          <label style={{ color: C.muted, fontSize: '0.7rem', display: 'block', marginBottom: '4px' }}>
            Finance body
          </label>
          <select
            value={region}
            onChange={(e) => setRegion(e.target.value as Region)}
            style={{
              width: '100%', padding: '8px 12px', borderRadius: '6px',
              background: C.card, border: `1px solid ${C.border}`,
              color: C.text, fontSize: '0.85rem', outline: 'none',
            }}
          >
            <option value="SFE">SFE (England)</option>
            <option value="SAAS">SAAS (Scotland)</option>
          </select>
        </div>
      </div>

      <div style={{
        fontSize: '2.5rem', fontWeight: 900, color: C.text, lineHeight: 1.1,
      }}>
        £{daily}
      </div>
      <p style={{ color: C.muted, fontSize: '0.75rem', marginTop: '4px', fontStyle: 'italic' }}>
        until your next {region} drop.
      </p>
    </div>
  )
}
