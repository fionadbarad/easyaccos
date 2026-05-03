'use client'

// Small input primitives shared across the tax calculator. useDebounce lives
// here too — only the slider uses it today, but it's a utility.

import { useState, useEffect } from 'react'

const LABEL_S = 'block text-[rgba(244,245,248,0.42)] text-[0.72rem] tracking-[0.08em] uppercase mb-[0.4rem]'
const INP_S = 'w-full bg-[#222326] border border-[rgba(244,245,248,0.07)] rounded-[6px] px-[13px] py-[10px] text-[#F4F5F8] text-[0.9rem] outline-none box-border min-h-[44px]'

export function useDebounce<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), ms)
    return () => clearTimeout(id)
  }, [value, ms])
  return debounced
}

export function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: React.ReactNode }) {
  return (
    <div>
      <label className={LABEL_S}>{label}</label>
      {children}
      {hint && <div className="mt-[4px]">{hint}</div>}
    </div>
  )
}

export function NumInput({ value, onChange, min = 0, max = 9_999_999 }: { value: number; onChange: (v: number) => void; min?: number; max?: number }) {
  return (
    <input type="number" min={min} max={max} step={100} value={value || ''}
      onChange={(e) => onChange(Math.max(min, Math.min(max, Number(e.target.value) || 0)))}
      className={INP_S} />
  )
}

export function Toggle({ label, active, onChange }: { label: string; active: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!active)} className={`flex items-center gap-2 px-[14px] py-2 rounded-[6px] cursor-pointer text-[0.8rem] font-medium transition-all duration-150 min-h-[40px] w-full text-left ${active ? 'bg-[rgba(74,222,128,0.08)] border border-[#4ADE80] text-[#4ADE80]' : 'bg-transparent border border-[rgba(244,245,248,0.07)] text-[rgba(244,245,248,0.42)]'}`}>
      <span className={`w-4 h-4 rounded-[3px] shrink-0 flex items-center justify-center text-[10px] text-[#181818] ${active ? 'bg-[#4ADE80] border-[1.5px] border-[#4ADE80]' : 'bg-transparent border-[1.5px] border-[rgba(244,245,248,0.42)]'}`}>
        {active ? '✓' : ''}
      </span>
      {label}
    </button>
  )
}
