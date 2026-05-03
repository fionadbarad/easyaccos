'use client'

// Presentational primitives shared between TaxPotCalculator and YearTracker.
// These were inlined in the 661-line page file.

import { ChevronDown } from 'lucide-react'
import { motion } from 'framer-motion'

export const inputStyle: React.CSSProperties = {
  width: '100%',
  background: '#222326',
  border: '1px solid rgba(244,245,248,0.07)',
  borderRadius: '4px',
  color: '#F4F5F8',
  padding: '10px 12px',
  fontSize: '0.875rem',
  outline: 'none',
  fontFamily: 'var(--font-geist-mono), monospace',
  fontVariantNumeric: 'tabular-nums',
  transition: 'border-color 0.15s',
}

export function Label({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[rgba(244,245,248,0.18)] text-[0.62rem] uppercase tracking-[0.1em] font-semibold mb-[5px] font-mono">
      {children}
    </div>
  )
}

export function Select({ value, onChange, options }: {
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full bg-[#222326] border border-[rgba(244,245,248,0.07)] rounded-[4px] text-[#F4F5F8] px-3 py-[10px] text-[0.875rem] outline-none font-mono tabular-nums transition-[border-color] duration-150 appearance-none pr-8 cursor-pointer"
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <ChevronDown size={13} className="absolute right-[10px] top-1/2 -translate-y-1/2 text-[rgba(244,245,248,0.42)] pointer-events-none" />
    </div>
  )
}

export function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex justify-between items-center py-[7px] border-b border-[rgba(244,245,248,0.07)]">
      <span className="text-[rgba(244,245,248,0.42)] text-[0.82rem]">{label}</span>
      <span className={`text-[0.82rem] font-mono tabular-nums ${highlight ? 'text-[#F4F5F8] font-semibold' : 'text-[rgba(244,245,248,0.42)] font-normal'}`}>
        {value}
      </span>
    </div>
  )
}

export function BigStat({ label, value, color = '#F4F5F8', sub }: {
  label: string; value: string; color?: string; sub?: string
}) {
  return (
    <div>
      <div className="text-[rgba(244,245,248,0.18)] text-[0.6rem] uppercase tracking-[0.1em] font-semibold mb-[4px] font-mono">
        {label}
      </div>
      <motion.div
        key={value}
        initial={{ opacity: 0.4, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="text-[1.65rem] font-semibold tracking-[-0.04em] leading-none tabular-nums"
        style={{ color }}
      >
        {value}
      </motion.div>
      {sub && <div className="text-[rgba(244,245,248,0.42)] text-[0.7rem] mt-[4px]">{sub}</div>}
    </div>
  )
}
