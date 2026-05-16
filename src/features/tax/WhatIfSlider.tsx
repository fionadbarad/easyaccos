'use client'

// Debounced income slider. Commits upstream on a 100ms settle so typing in the
// input form doesn't fight with slider drags. 60% trap band highlighted inline.

import { useState, useRef, useEffect } from 'react'
import { C } from '@/styles/palette'
import { cardStyle, fmt } from './tokens'
import { useDebounce } from './primitives'

export default function WhatIfSlider({ income, onChange }: { income: number; onChange: (v: number) => void }) {
  const [local, setLocal] = useState(income)
  const debounced = useDebounce(local, 100)
  const prevDebounced = useRef(debounced)

  useEffect(() => {
    if (debounced !== prevDebounced.current) {
      prevDebounced.current = debounced
      onChange(debounced)
    }
  }, [debounced, onChange])

  const [prevIncome, setPrevIncome] = useState(income)
  if (income !== prevIncome) {
    setPrevIncome(income)
    setLocal(income)
  }

  return (
    <div style={{ ...cardStyle, marginBottom: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <span style={{ color: C.muted, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          What-If Income Slider
        </span>
        <span style={{ color: C.white, fontWeight: 700, fontSize: '1.1rem' }}>{fmt(local)}</span>
      </div>
      <input
        type="range" min={0} max={250_000} step={500} value={local}
        onChange={(e) => setLocal(Number(e.target.value))}
        style={{ width: '100%', accentColor: C.white, cursor: 'pointer', height: '6px' }}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', color: C.muted, fontSize: '0.7rem', marginTop: '4px' }}>
        <span>£0</span><span>£50k</span><span>£100k</span><span>£150k</span><span>£200k+</span>
      </div>
      {local > 100_000 && local < 125_140 && (
        <div style={{ marginTop: '0.75rem', padding: '0.6rem 0.9rem', background: 'rgba(251,146,60,0.1)', border: '1px solid rgba(251,146,60,0.4)', borderRadius: '6px', color: '#FB923C', fontSize: '0.78rem' }}>
          60% Tax Trap active — every £2 over £100k costs £1 of Personal Allowance
        </div>
      )}
    </div>
  )
}
