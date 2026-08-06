'use client'

/**
 * The journey list. Pure: it is handed already-priced entries and renders them.
 *
 * The claim column shows each journey priced against ITS OWN tax year's
 * threshold, while the footer totals only the reported year — that asymmetry is
 * deliberate and is why the footer names the year.
 */

import { MapPin, Trash2 } from 'lucide-react'
import { fmtGBP } from '@/lib/formatters'
import { VEHICLE_LABELS, formatMiles, type PricedEntry } from '../mileage-model'

/** One grid definition for header, rows and footer, so the columns cannot drift. */
const COLS = 'grid grid-cols-[100px_1fr_90px_70px_80px_36px] gap-2'

const HEADERS = ['Date', 'Purpose', 'Vehicle', 'Miles', 'Claim', ''] as const

function EntryRow({ entry, claimAmount, onDelete }: PricedEntry & { onDelete: () => void }) {
  return (
    <div className={`${COLS} items-center px-3 py-[10px] border-b border-sa-border text-caption`}>
      <span className="text-sa-muted font-mono text-micro">{entry.date}</span>
      <span className="text-sa-white overflow-hidden text-ellipsis whitespace-nowrap">
        {entry.description}
      </span>
      <span className="text-sa-muted text-micro">{VEHICLE_LABELS[entry.vehicle]}</span>
      <span className="text-sa-white text-right font-mono">{formatMiles(entry.miles)} mi</span>
      <span className="text-sa-green text-right font-mono font-semibold">
        {fmtGBP(claimAmount)}
      </span>
      <button
        onClick={onDelete}
        // Icon-only control: without a name a screen reader announces only
        // "button", and every row in the table sounds identical. Naming the
        // journey also makes the destructive action unambiguous (WCAG 4.1.2).
        aria-label={`Delete journey: ${entry.description}, ${formatMiles(entry.miles)} miles on ${entry.date}`}
        className="bg-transparent border-none cursor-pointer text-sa-dim p-[2px] flex items-center justify-center transition-colors duration-100 hover:text-sa-red"
      >
        <Trash2 size={12} />
      </button>
    </div>
  )
}

export function JourneyTable({
  priced,
  totalMiles,
  totalClaim,
  yearLabel,
  onDelete,
}: {
  priced: readonly PricedEntry[]
  totalMiles: number
  totalClaim: number
  yearLabel: string
  onDelete: (id: string) => void
}) {
  return (
    <div className="bg-sa-surface border border-sa-border rounded-[6px] overflow-hidden">
      <div className={`${COLS} px-3 py-2 border-b border-sa-border bg-sa-gray`}>
        {HEADERS.map((h, i) => (
          <span
            key={h || `spacer-${i}`}
            className={`text-sa-muted text-micro uppercase tracking-[0.08em] ${i >= 3 ? 'text-right' : 'text-left'}`}
          >
            {h}
          </span>
        ))}
      </div>

      {priced.length === 0 ? (
        <div className="p-12 text-center">
          <MapPin size={24} className="text-sa-dim mb-3 inline-block" />
          <p className="text-sa-muted text-meta m-0">No journeys logged yet.</p>
          <p className="text-sa-dim text-caption mt-1">
            Log your first business trip to start tracking your HMRC mileage claim.
          </p>
        </div>
      ) : (
        priced.map(({ entry, claimAmount }) => (
          <EntryRow
            key={entry.id}
            entry={entry}
            claimAmount={claimAmount}
            onDelete={() => onDelete(entry.id)}
          />
        ))
      )}

      {priced.length > 0 && (
        <div className={`${COLS} px-3 py-[10px] border-t border-sa-border bg-sa-gray`}>
          <span />
          <span className="text-sa-muted text-micro">Total claim · {yearLabel}</span>
          <span />
          <span className="text-sa-white text-right font-mono text-caption font-semibold">
            {formatMiles(totalMiles)} mi
          </span>
          <span className="text-sa-green text-right font-mono text-caption font-bold">
            {fmtGBP(totalClaim)}
          </span>
          <span />
        </div>
      )}
    </div>
  )
}
