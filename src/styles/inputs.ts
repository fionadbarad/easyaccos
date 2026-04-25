import { C } from './palette'

/** Monospace form input — used in ledger/tracker contexts where tabular alignment matters. */
export const inputStyleMonospace: React.CSSProperties = {
  width: '100%',
  background: C.gray,
  border: `1px solid ${C.border}`,
  borderRadius: '4px',
  color: C.white,
  padding: '10px 12px',
  fontSize: '0.875rem',
  outline: 'none',
  fontFamily: 'var(--font-geist-mono), monospace',
  fontVariantNumeric: 'tabular-nums',
  transition: 'border-color 0.15s',
}

/** Standard form input — used in settings and backup/restore contexts. */
export const inputStyleBase: React.CSSProperties = {
  width: '100%',
  background: C.deep,
  border: `1px solid ${C.border}`,
  borderRadius: '4px',
  padding: '9px 13px',
  color: C.text,
  fontSize: '0.9rem',
  outline: 'none',
  boxSizing: 'border-box',
}
