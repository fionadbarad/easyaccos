import { MapPin } from 'lucide-react'
import { fmtGBP } from '@/lib/formatters'
import { C } from '@/styles/palette'
import { EntryRow, MILEAGE_GRID } from './EntryRow'
import { formatMiles } from './calc'
import type { MileageEntry } from './types'

// ── Journey list: header, rows, empty state, and total footer ─────────────────
export function JourneyList({
  enriched,
  totalMiles,
  totalClaim,
  onDelete,
}: {
  enriched: Array<{ entry: MileageEntry; claimAmount: number }>
  totalMiles: number
  totalClaim: number
  onDelete: (id: string) => void
}) {
  return (
    <div
      style={{
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: '6px',
        overflow: 'hidden',
      }}
    >
      {/* Column headers */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: MILEAGE_GRID,
          gap: '8px',
          padding: '8px 12px',
          borderBottom: `1px solid ${C.border}`,
          background: C.gray,
        }}
      >
        {['Date', 'Purpose', 'Vehicle', 'Miles', 'Claim', ''].map((h, i) => (
          <span
            key={i}
            style={{
              color: C.muted,
              fontSize: '0.65rem',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              textAlign: i >= 3 ? 'right' : 'left',
            }}
          >
            {h}
          </span>
        ))}
      </div>

      {enriched.length === 0 ? (
        <div style={{ padding: '3rem', textAlign: 'center' }}>
          <MapPin size={28} style={{ color: C.dim, marginBottom: '12px' }} />
          <p style={{ color: C.muted, fontSize: '0.8rem', margin: 0 }}>No journeys logged yet.</p>
          <p style={{ color: C.dim, fontSize: '0.72rem', marginTop: '4px' }}>
            Log your first business trip to start tracking your HMRC mileage claim.
          </p>
        </div>
      ) : (
        enriched.map(({ entry, claimAmount }) => (
          <EntryRow
            key={entry.id}
            entry={entry}
            claimAmount={claimAmount}
            onDelete={() => onDelete(entry.id)}
          />
        ))
      )}

      {/* Total footer */}
      {enriched.length > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: MILEAGE_GRID,
            gap: '8px',
            padding: '10px 12px',
            borderTop: `1px solid ${C.border}`,
            background: C.gray,
          }}
        >
          <span />
          <span style={{ color: C.muted, fontSize: '0.7rem' }}>Total claim</span>
          <span />
          <span
            style={{
              color: C.white,
              textAlign: 'right',
              fontFamily: 'var(--font-geist-mono, monospace)',
              fontSize: '0.78rem',
              fontWeight: 600,
            }}
          >
            {formatMiles(totalMiles)} mi
          </span>
          <span
            style={{
              color: C.green,
              textAlign: 'right',
              fontFamily: 'var(--font-geist-mono, monospace)',
              fontSize: '0.78rem',
              fontWeight: 700,
            }}
          >
            {fmtGBP(totalClaim)}
          </span>
          <span />
        </div>
      )}
    </div>
  )
}
