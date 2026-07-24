import { fmtDecAbs as fmtDp } from '@/lib/formatters'
import { C } from '@/styles/palette'

// A single row in the income statement — label + optional right-aligned figure,
// with variants for headings (bold), section separators, highlighted totals,
// and parenthesised negatives.
export function ISLine({
  label = '',
  value,
  indent = 0,
  bold = false,
  separator = false,
  highlight = false,
  negative = false,
}: {
  label?: string
  value?: number
  indent?: number
  bold?: boolean
  separator?: boolean
  highlight?: boolean
  negative?: boolean
}) {
  if (separator) return <div style={{ borderTop: `1px solid ${C.border}`, margin: '5px 0' }} />
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: `${bold ? 9 : 6}px 0`,
        paddingLeft: `${indent * 16}px`,
        background: highlight ? 'rgba(244,245,248,0.03)' : 'transparent',
        borderRadius: highlight ? '3px' : 0,
      }}
    >
      <span
        style={{
          color: bold ? C.white : C.muted,
          fontSize: bold ? '0.82rem' : '0.78rem',
          fontWeight: bold ? 600 : 400,
        }}
      >
        {label}
      </span>
      {value !== undefined && (
        <span
          style={{
            color: highlight ? C.white : negative ? C.red : bold ? C.white : C.muted,
            fontWeight: bold ? 600 : 400,
            fontSize: bold ? '0.9rem' : '0.82rem',
            fontFamily: 'var(--font-geist-mono), monospace',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {negative && value > 0 ? '(' : ''}
          {fmtDp(value)}
          {negative && value > 0 ? ')' : ''}
        </span>
      )}
    </div>
  )
}
