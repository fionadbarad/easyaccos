'use client'

/**
 * The HMRC rate table, as a disclosure panel.
 *
 * Every figure here is read from bands-2026.ts and rendered through `pence()`.
 * Nothing is written as prose: the car rate has already moved once, and the
 * copy and the calculation must not be two separate places to remember
 * (CLAUDE.md hard rule 1).
 */

import { ChevronDown, ChevronUp, Info } from 'lucide-react'
import {
  AMAP_CAR_FIRST,
  AMAP_CAR_EXCESS,
  AMAP_MOTORCYCLE,
  AMAP_BICYCLE,
  AMAP_CAR_THRESHOLD,
} from '@/lib/tax/bands-2026'
import { VEHICLE_LABELS, pence } from '../mileage-model'

const CELL = 'py-[6px] pr-2 pl-0'
const HEAD = 'text-left text-sa-muted font-medium pt-1 pr-2 pb-2 pl-0 text-micro tracking-[0.04em]'

export function AmapRatePanel({
  open,
  onToggle,
  yearLabel,
}: {
  open: boolean
  onToggle: () => void
  yearLabel: string
}) {
  const threshold = AMAP_CAR_THRESHOLD.toLocaleString()

  const rows: Array<[string, string, string]> = [
    [VEHICLE_LABELS.car, `${pence(AMAP_CAR_FIRST)} per mile`, `${pence(AMAP_CAR_EXCESS)} per mile`],
    [
      VEHICLE_LABELS.motorcycle,
      `${pence(AMAP_MOTORCYCLE)} per mile`,
      `${pence(AMAP_MOTORCYCLE)} per mile`,
    ],
    [VEHICLE_LABELS.bike, `${pence(AMAP_BICYCLE)} per mile`, `${pence(AMAP_BICYCLE)} per mile`],
  ]

  return (
    <div className="bg-sa-surface border border-sa-border rounded-[6px] overflow-hidden">
      <button
        onClick={onToggle}
        aria-expanded={open}
        className="w-full flex items-center justify-between px-4 py-3 bg-transparent border-none text-sa-white cursor-pointer text-caption font-medium"
      >
        <span className="flex items-center gap-[7px]">
          <Info size={12} className="text-sa-muted" />
          Approved Mileage Allowance Payments (AMAP) {yearLabel}
        </span>
        {open ? (
          <ChevronUp size={12} className="text-sa-muted" />
        ) : (
          <ChevronDown size={12} className="text-sa-muted" />
        )}
      </button>

      {open && (
        <div className="px-4 pt-0 pb-4 border-t border-sa-border">
          <table className="w-full border-collapse text-caption mt-3">
            <thead>
              <tr>
                {['Vehicle', `First ${threshold} mi`, `Above ${threshold} mi`].map((h) => (
                  <th key={h} scope="col" className={HEAD}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(([vehicle, first, excess]) => (
                <tr key={vehicle} className="border-t border-sa-border">
                  <td className={`${CELL} text-sa-white`}>{vehicle}</td>
                  <td className={`${CELL} text-sa-green font-mono`}>{first}</td>
                  <td className={`${CELL} text-sa-muted font-mono`}>{excess}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-sa-muted text-micro mt-[10px] leading-[1.5]">
            Use these HMRC-published AMAP rates instead of claiming actual vehicle costs. The car
            threshold resets each tax year (6 April). Only business journeys qualify — commuting to
            a regular workplace does not.
          </p>
        </div>
      )}
    </div>
  )
}
