'use client'

// Debounced income slider. Commits upstream on a 100ms settle so typing in the
// input form doesn't fight with slider drags. 60% trap band highlighted inline.

import { useState, useRef, useEffect } from 'react'
import { CARD_CLASS, fmt } from './tokens'
import { useDebounce } from './primitives'

export default function WhatIfSlider({
  income,
  onChange,
}: {
  income: number
  onChange: (v: number) => void
}) {
  const [local, setLocal] = useState(income)
  const [isInteracting, setIsInteracting] = useState(false)
  const debounced = useDebounce(local, 100)
  const prevDebounced = useRef(debounced)

  useEffect(() => {
    if (debounced !== prevDebounced.current) {
      prevDebounced.current = debounced
      onChange(debounced)
    }
  }, [debounced, onChange])

  const sliderValue = isInteracting ? local : income

  return (
    <div className={`${CARD_CLASS} mb-6`}>
      <div className="flex justify-between items-center mb-3">
        <span className="text-sa-muted text-caption uppercase tracking-[0.08em]">
          What-If Income Slider
        </span>
        <span className="text-sa-white font-bold text-title">{fmt(sliderValue)}</span>
      </div>
      <input
        type="range"
        min={0}
        max={250_000}
        step={500}
        value={sliderValue}
        onPointerDown={() => {
          setIsInteracting(true)
          setLocal(income)
        }}
        onPointerUp={() => setIsInteracting(false)}
        onBlur={() => setIsInteracting(false)}
        onChange={(e) => setLocal(Number(e.target.value))}
        className="w-full h-1.5 accent-sa-white cursor-pointer"
      />
      <div className="flex justify-between text-sa-muted text-micro mt-1">
        <span>£0</span>
        <span>£50k</span>
        <span>£100k</span>
        <span>£150k</span>
        <span>£200k+</span>
      </div>
      {sliderValue > 100_000 && sliderValue < 125_140 && (
        /* The orange here is NOT a palette colour — #FB923C sits between
           sa-amber and sa-red and has no token. Carried across verbatim as
           arbitrary values rather than snapped to sa-amber, because that would
           change the rendered colour, and this pass is a mapping rather than a
           redesign. Worth a token, or folding into sa-amber, separately. */
        <div className="mt-3 px-[0.9rem] py-[0.6rem] bg-[rgba(251,146,60,0.1)] border border-[rgba(251,146,60,0.4)] rounded-md text-[#FB923C] text-caption">
          60% Tax Trap active — every £2 over £100k costs £1 of Personal Allowance
        </div>
      )}
    </div>
  )
}
