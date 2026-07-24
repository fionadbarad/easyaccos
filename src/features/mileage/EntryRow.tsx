import { Trash2 } from 'lucide-react'
import { fmtGBP } from '@/lib/formatters'
import { C } from '@/styles/palette'
import { formatMiles } from './calc'
import { VEHICLE_LABELS, type MileageEntry } from './types'

// Shared grid template so the header, rows, and footer stay column-aligned.
export const MILEAGE_GRID = '100px 1fr 90px 70px 80px 36px'

// ── Entry row ─────────────────────────────────────────────────────────────────
export function EntryRow({
  entry,
  claimAmount,
  onDelete,
}: {
  entry: MileageEntry
  claimAmount: number
  onDelete: () => void
}) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: MILEAGE_GRID,
        alignItems: 'center',
        gap: '8px',
        padding: '10px 12px',
        borderBottom: `1px solid ${C.border}`,
        fontSize: '0.78rem',
      }}
    >
      <span
        style={{
          color: C.muted,
          fontFamily: 'var(--font-geist-mono, monospace)',
          fontSize: '0.7rem',
        }}
      >
        {entry.date}
      </span>
      <span
        style={{
          color: C.white,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {entry.description}
      </span>
      <span style={{ color: C.muted, fontSize: '0.7rem' }}>{VEHICLE_LABELS[entry.vehicle]}</span>
      <span
        style={{
          color: C.white,
          textAlign: 'right',
          fontFamily: 'var(--font-geist-mono, monospace)',
        }}
      >
        {formatMiles(entry.miles)} mi
      </span>
      <span
        style={{
          color: C.green,
          textAlign: 'right',
          fontFamily: 'var(--font-geist-mono, monospace)',
          fontWeight: 600,
        }}
      >
        {fmtGBP(claimAmount)}
      </span>
      <button
        onClick={onDelete}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: C.dim,
          padding: '2px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = C.red)}
        onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = C.dim)}
      >
        <Trash2 size={13} />
      </button>
    </div>
  )
}
