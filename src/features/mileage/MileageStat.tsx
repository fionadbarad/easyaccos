import { C } from '@/styles/palette'

// ── Stat card ─────────────────────────────────────────────────────────────────
export function MileageStat({
  label,
  value,
  sub,
  accent,
}: {
  label: string
  value: string
  sub?: string
  accent?: string
}) {
  return (
    <div
      style={{
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: '6px',
        padding: '1rem 1.25rem',
      }}
    >
      <div
        style={{
          color: C.muted,
          fontSize: '0.68rem',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          marginBottom: '6px',
          fontFamily: 'var(--font-geist-mono, monospace)',
        }}
      >
        {label}
      </div>
      <div
        style={{
          color: accent ?? C.white,
          fontSize: '1.4rem',
          fontWeight: 700,
          letterSpacing: '-0.03em',
          fontFamily: 'var(--font-geist-mono, monospace)',
        }}
      >
        {value}
      </div>
      {sub && <div style={{ color: C.muted, fontSize: '0.68rem', marginTop: '4px' }}>{sub}</div>}
    </div>
  )
}
