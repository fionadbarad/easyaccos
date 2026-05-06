'use client'

// Debounced income slider. Commits upstream on a 100ms settle so typing in the
// input form doesn't fight with slider drags. 60% trap band highlighted inline.

import { useState, useRef, useEffect } from 'react'
import { fmt } from './tokens'
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

  useEffect(() => { setLocal(income) }, [income])

  return (
    <div className="bg-[var(--sa-surface)] border border-[var(--sa-border)] rounded-[10px] p-6 mb-6">
      <div className="flex justify-between items-center mb-3">
        <span className="text-[rgba(244,245,248,0.42)] text-[0.78rem] uppercase tracking-[0.08em]">
          What-If Income Slider
        </span>
        <span className="text-[var(--sa-white)] font-bold text-[1.1rem]">{fmt(local)}</span>
      </div>
      <input
        type="range" min={0} max={250_000} step={500} value={local}
        onChange={(e) => setLocal(Number(e.target.value))}
        className="w-full accent-[var(--sa-white)] cursor-pointer h-[6px]"
      />
      <div className="flex justify-between text-[rgba(244,245,248,0.42)] text-[0.7rem] mt-1">
        <span>£0</span><span>£50k</span><span>£100k</span><span>£150k</span><span>£200k+</span>
      </div>
      {local > 100_000 && local < 125_140 && (
        <div className="mt-3 px-[0.9rem] py-[0.6rem] bg-[rgba(251,146,60,0.1)] border border-[rgba(251,146,60,0.4)] rounded-md text-[#FB923C] text-[0.78rem]">
          60% Tax Trap active - every £2 over £100k costs £1 of Personal Allowance
        </div>
      )}
    </div>
  )
}
