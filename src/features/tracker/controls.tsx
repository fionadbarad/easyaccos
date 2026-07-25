'use client'

// Presentational primitives shared between TaxPotCalculator and YearTracker.
// These were inlined in the 661-line page file.

import { ChevronDown } from 'lucide-react'
import { motion } from 'framer-motion'
import { C } from '@/styles/palette'
import { T } from '@/styles/type'

export const inputStyle: React.CSSProperties = {
  width: '100%',
  background: C.gray,
  border: `1px solid ${C.border}`,
  borderRadius: '4px',
  color: C.white,
  padding: '10px 12px',
  fontSize: T.body,
  outline: 'none',
  fontFamily: 'var(--font-geist-mono), monospace',
  fontVariantNumeric: 'tabular-nums',
  transition: 'border-color 0.15s',
}

export function Label({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        color: C.dim,
        fontSize: T.micro,
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        fontWeight: 600,
        marginBottom: '5px',
        fontFamily: 'var(--font-geist-mono), monospace',
      }}
    >
      {children}
    </div>
  )
}

export function Select({
  value,
  onChange,
  options,
}: {
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <div style={{ position: 'relative' }}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ ...inputStyle, appearance: 'none', paddingRight: '32px', cursor: 'pointer' }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown
        size={12}
        style={{
          position: 'absolute',
          right: '10px',
          top: '50%',
          transform: 'translateY(-50%)',
          color: C.muted,
          pointerEvents: 'none',
        }}
      />
    </div>
  )
}

export function Row({
  label,
  value,
  highlight,
}: {
  label: string
  value: string
  highlight?: boolean
}) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '7px 0',
        borderBottom: `1px solid ${C.border}`,
      }}
    >
      <span style={{ color: C.muted, fontSize: T.meta }}>{label}</span>
      <span
        style={{
          color: highlight ? C.white : C.muted,
          fontWeight: highlight ? 600 : 400,
          fontSize: T.meta,
          fontFamily: 'var(--font-geist-mono), monospace',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {value}
      </span>
    </div>
  )
}

export function BigStat({
  label,
  value,
  color = C.white,
  sub,
}: {
  label: string
  value: string
  color?: string
  sub?: string
}) {
  return (
    <div>
      <div
        style={{
          color: C.dim,
          fontSize: T.micro,
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          fontWeight: 600,
          marginBottom: '4px',
          fontFamily: 'var(--font-geist-mono), monospace',
        }}
      >
        {label}
      </div>
      <motion.div
        key={value}
        initial={{ opacity: 0.4, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        style={{
          color,
          fontSize: T.display,
          fontWeight: 600,
          letterSpacing: '-0.04em',
          lineHeight: 1,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {value}
      </motion.div>
      {sub && <div style={{ color: C.muted, fontSize: T.micro, marginTop: '4px' }}>{sub}</div>}
    </div>
  )
}
