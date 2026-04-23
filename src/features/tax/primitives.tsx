'use client'

// Small input primitives shared across the tax calculator. useDebounce lives
// here too — only the slider uses it today, but it's a utility.

import { useState, useEffect } from 'react'
import { C } from '@/styles/palette'
import { labelStyle, inp } from './tokens'

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
      <label style={labelStyle}>{label}</label>
      {children}
      {hint && <div style={{ marginTop: '4px' }}>{hint}</div>}
    </div>
  )
}

export function NumInput({ value, onChange, min = 0, max = 9_999_999 }: { value: number; onChange: (v: number) => void; min?: number; max?: number }) {
  return (
    <input type="number" min={min} max={max} step={100} value={value || ''}
      onChange={(e) => onChange(Math.max(min, Math.min(max, Number(e.target.value) || 0)))}
      style={inp} />
  )
}

export function Toggle({ label, active, onChange }: { label: string; active: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!active)} style={{
      display: 'flex', alignItems: 'center', gap: '8px',
      padding: '8px 14px', borderRadius: '6px', cursor: 'pointer',
      background: active ? 'rgba(74,222,128,0.08)' : 'transparent',
      border: `1px solid ${active ? C.green : C.border}`,
      color: active ? C.green : C.muted,
      fontSize: '0.8rem', fontWeight: 500, transition: 'all 0.15s',
      minHeight: '40px', width: '100%', textAlign: 'left',
    }}>
      <span style={{
        width: '16px', height: '16px', borderRadius: '3px', flexShrink: 0,
        background: active ? C.green : 'transparent',
        border: `1.5px solid ${active ? C.green : C.muted}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '10px', color: '#181818',
      }}>{active ? '✓' : ''}</span>
      {label}
    </button>
  )
}
