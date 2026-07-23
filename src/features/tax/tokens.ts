// Style tokens + formatters shared across the tax calculator feature.
// Kept framework-free so logic modules can import without pulling in React.

import { fmtGBP, pct1 } from '@/lib/formatters'
import { C } from '@/styles/palette'

export const fmt = fmtGBP
export const pct = pct1

export const labelStyle: React.CSSProperties = {
  display: 'block',
  color: C.muted,
  fontSize: '0.72rem',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  marginBottom: '0.4rem',
}

export const inp: React.CSSProperties = {
  width: '100%',
  background: C.deep,
  border: `1px solid ${C.border}`,
  borderRadius: '6px',
  padding: '10px 13px',
  color: C.text,
  fontSize: '0.9rem',
  outline: 'none',
  boxSizing: 'border-box',
  minHeight: '44px',
}

export const cardStyle: React.CSSProperties = {
  background: C.card,
  border: `1px solid ${C.border}`,
  borderRadius: '10px',
  padding: '1.5rem',
}

export const selectStyle: React.CSSProperties = {
  ...inp,
  appearance: 'none' as const,
  cursor: 'pointer',
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath d='M3 5l3 3 3-3' stroke='%23F4F5F8' stroke-width='1.5' fill='none'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 12px center',
  paddingRight: '32px',
}

export const toggleStyle = (active: boolean): React.CSSProperties => ({
  padding: '6px 14px',
  borderRadius: '6px',
  cursor: 'pointer',
  fontSize: '0.78rem',
  fontWeight: 600,
  minHeight: '36px',
  background: active ? 'rgba(244,245,248,0.1)' : 'transparent',
  border: `1px solid ${active ? C.white : C.border}`,
  color: active ? C.white : C.muted,
  transition: 'all 0.15s',
})
