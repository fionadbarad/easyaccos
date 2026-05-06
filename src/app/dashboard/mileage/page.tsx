'use client'

import { useState, useMemo } from 'react'
import {
  Plus, Trash2, Cloud, CloudOff, Car, MapPin, Calendar,
  TrendingUp, ChevronDown, ChevronUp, Info,
} from 'lucide-react'
import { useUserData } from '@/lib/use-user-data'
import { fmtGBP } from '@/lib/tax-engine'

// HMRC 2026/27 approved mileage rates
const RATE_CAR_FIRST = 0.45   // First 10,000 miles
const RATE_CAR_EXCESS = 0.25   // Above 10,000 miles
const RATE_BIKE = 0.20
const RATE_MOTORCYCLE = 0.24
const CAR_THRESHOLD = 10_000

type VehicleType = 'car' | 'motorcycle' | 'bike'

interface MileageEntry {
  id: string
  date: string
  description: string
  vehicle: VehicleType
  miles: number
  createdAt: string
}

const SEED: MileageEntry[] = []

const VEHICLE_LABELS: Record<VehicleType, string> = {
  car: 'Car / Van',
  motorcycle: 'Motorcycle',
  bike: 'Bicycle',
}

function calcRate(vehicle: VehicleType, milesBefore: number, miles: number): number {
  if (vehicle === 'bike')       return miles * RATE_BIKE
  if (vehicle === 'motorcycle') return miles * RATE_MOTORCYCLE
  // Car: split at 10,000 threshold
  const firstBand  = Math.max(0, Math.min(miles, Math.max(0, CAR_THRESHOLD - milesBefore)))
  const excessBand = miles - firstBand
  return firstBand * RATE_CAR_FIRST + excessBand * RATE_CAR_EXCESS
}

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

function formatMiles(m: number): string {
  return m.toLocaleString('en-GB', { maximumFractionDigits: 1 })
}

// ── Stat card ─────────────────────────────────────────────────────────────────
function Stat({ label, value, sub, accent }: {
  label: string; value: string; sub?: string; accent?: string
}) {
  return (
    <div className="bg-[var(--sa-surface)] border border-[var(--sa-border)] rounded-md p-[1rem_1.25rem]">
      <div className="text-[rgba(244,245,248,0.42)] text-[0.68rem] uppercase tracking-[0.08em] mb-1.5 font-mono">
        {label}
      </div>
      <div
        className="text-[1.4rem] font-bold tracking-[-0.03em] font-mono"
        style={{ color: accent ?? 'var(--sa-white)' }}
      >
        {value}
      </div>
      {sub && <div className="text-[rgba(244,245,248,0.42)] text-[0.68rem] mt-1">{sub}</div>}
    </div>
  )
}

// ── Rate info panel ───────────────────────────────────────────────────────────
function RatePanel({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  return (
    <div className="bg-[var(--sa-surface)] border border-[var(--sa-border)] rounded-md overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-[0.75rem_1rem] bg-transparent border-none text-[var(--sa-white)] cursor-pointer text-[0.78rem] font-medium">
        <span className="flex items-center gap-[7px]">
          <Info size={13} className="text-[rgba(244,245,248,0.42)]" />
          HMRC Approved Mileage Rates 2026/27
        </span>
        {open ? <ChevronUp size={13} color="rgba(244,245,248,0.42)" /> : <ChevronDown size={13} color="rgba(244,245,248,0.42)" />}
      </button>
      {open && (
        <div className="p-[0_1rem_1rem] border-t border-[var(--sa-border)]">
          <table className="w-full border-collapse text-[0.78rem] mt-3">
            <thead>
              <tr>
                {['Vehicle', 'First 10,000 mi', 'Above 10,000 mi'].map(h => (
                  <th key={h} className="text-left text-[rgba(244,245,248,0.42)] font-medium p-[4px_8px_8px_0] text-[0.68rem] tracking-[0.04em]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                ['Car / Van',    '45p per mile', '25p per mile'],
                ['Motorcycle',   '24p per mile', '24p per mile'],
                ['Bicycle',      '20p per mile', '20p per mile'],
              ].map(([v, r1, r2]) => (
                <tr key={v} className="border-t border-[var(--sa-border)]">
                  <td className="p-[6px_8px_6px_0] text-[var(--sa-white)]">{v}</td>
                  <td className="p-[6px_8px_6px_0] text-[#4ADE80] font-mono">{r1}</td>
                  <td className="p-[6px_8px_6px_0] text-[rgba(244,245,248,0.42)] font-mono">{r2}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-[rgba(244,245,248,0.42)] text-[0.68rem] mt-[10px] leading-[1.5]">
            Use these HMRC-approved rates instead of claiming actual vehicle costs. The car threshold resets each tax year (6 April). Only business journeys qualify - commuting to a regular workplace does not.
          </p>
        </div>
      )}
    </div>
  )
}

// ── Entry row ─────────────────────────────────────────────────────────────────
function EntryRow({ entry, claimAmount, onDelete }: {
  entry: MileageEntry; claimAmount: number; onDelete: () => void
}) {
  return (
    <div className="grid gap-2 p-[10px_12px] border-b border-[var(--sa-border)] text-[0.78rem]"
      style={{ gridTemplateColumns: '100px 1fr 90px 70px 80px 36px' }}>
      <span className="text-[rgba(244,245,248,0.42)] font-mono text-[0.7rem]">
        {entry.date}
      </span>
      <span className="text-[var(--sa-white)] overflow-hidden text-ellipsis whitespace-nowrap">
        {entry.description}
      </span>
      <span className="text-[rgba(244,245,248,0.42)] text-[0.7rem]">
        {VEHICLE_LABELS[entry.vehicle]}
      </span>
      <span className="text-[var(--sa-white)] text-right font-mono">
        {formatMiles(entry.miles)} mi
      </span>
      <span className="text-[#4ADE80] text-right font-mono font-semibold">
        {fmtGBP(claimAmount)}
      </span>
      <button onClick={onDelete}
        className="bg-transparent border-none cursor-pointer text-[rgba(244,245,248,0.18)] p-[2px] flex items-center justify-center"
        onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#F87171'}
        onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'rgba(244,245,248,0.18)'}>
        <Trash2 size={13} />
      </button>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function MileagePage() {
  const { items: entries, persist, loading, isAuthenticated } = useUserData<MileageEntry>(
    'user_mileage', 'easyacco_mileage', SEED,
  )

  const [showForm, setShowForm] = useState(false)
  const [ratesOpen, setRatesOpen] = useState(false)
  const [date, setDate] = useState(today())
  const [description, setDescription] = useState('')
  const [vehicle, setVehicle] = useState<VehicleType>('car')
  const [miles, setMiles] = useState('')

  // Sort entries chronologically
  const sorted = useMemo(() =>
    [...entries].sort((a, b) => a.date.localeCompare(b.date)),
    [entries],
  )

  // Compute per-entry claim amounts (cumulative car miles needed)
  const { enriched, totalMiles, totalClaim, carMiles } = useMemo(() => {
    let runningCarMiles = 0
    let totalMilesAcc  = 0
    let totalClaimAcc  = 0

    const enriched = sorted.map(e => {
      const milesBefore = e.vehicle === 'car' ? runningCarMiles : 0
      const claim       = calcRate(e.vehicle, milesBefore, e.miles)
      if (e.vehicle === 'car') runningCarMiles += e.miles
      totalMilesAcc += e.miles
      totalClaimAcc += claim
      return { entry: e, claimAmount: claim }
    })

    return { enriched, totalMiles: totalMilesAcc, totalClaim: totalClaimAcc, carMiles: runningCarMiles }
  }, [sorted])

  // Progress toward 10k threshold (car only)
  const thresholdPct = Math.min(100, (carMiles / CAR_THRESHOLD) * 100)

  function addEntry() {
    const m = parseFloat(miles)
    if (!description.trim() || isNaN(m) || m <= 0) return
    const entry: MileageEntry = {
      id: crypto.randomUUID(),
      date,
      description: description.trim(),
      vehicle,
      miles: m,
      createdAt: new Date().toISOString(),
    }
    persist([entry, ...entries])
    setDescription('')
    setMiles('')
    setDate(today())
    setShowForm(false)
  }

  function deleteEntry(id: string) {
    persist(entries.filter(e => e.id !== id))
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--sa-black)] flex items-center justify-center">
        <span className="text-[rgba(244,245,248,0.42)] text-[0.8rem] font-mono">loading…</span>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--sa-black)] p-[2rem_1.5rem_4rem] max-w-[820px] mx-auto">

      {/* Header */}
      <div className="flex items-start justify-between mb-7 flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <Car size={18} className="text-[var(--sa-white)]" />
            <h1 className="text-[var(--sa-white)] text-[1.1rem] font-semibold tracking-[-0.03em] m-0">
              Mileage Tracker
            </h1>
          </div>
          <p className="text-[rgba(244,245,248,0.42)] text-xs m-0">
            HMRC approved mileage - 2026/27 tax year
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-[5px] text-[rgba(244,245,248,0.42)] text-[0.68rem]">
            {isAuthenticated
              ? <><Cloud size={11} className="text-[#4ADE80]" /> synced</>
              : <><CloudOff size={11} /> guest</>}
          </div>
          <button
            onClick={() => setShowForm(f => !f)}
            className="flex items-center gap-1.5 bg-[var(--sa-white)] text-[var(--sa-black)] border-none rounded p-[7px_14px] text-[0.78rem] font-semibold cursor-pointer">
            <Plus size={13} /> Log Journey
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid gap-3 mb-5" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
        <Stat label="Total Miles" value={`${formatMiles(totalMiles)} mi`} sub={`${entries.length} journeys`} />
        <Stat label="Total Claim" value={fmtGBP(totalClaim)} sub="tax deductible" accent="#4ADE80" />
        <Stat label="Car Miles" value={`${formatMiles(carMiles)} mi`} sub={`of ${CAR_THRESHOLD.toLocaleString()} threshold`} />
        <Stat
          label="Rate"
          value={carMiles >= CAR_THRESHOLD ? '25p/mi' : '45p/mi'}
          sub={carMiles >= CAR_THRESHOLD ? 'excess rate active' : `${formatMiles(CAR_THRESHOLD - carMiles)} mi until drop`}
          accent={carMiles >= CAR_THRESHOLD ? '#FBBF24' : 'var(--sa-white)'}
        />
      </div>

      {/* 10k threshold progress */}
      {entries.some(e => e.vehicle === 'car') && (
        <div className="bg-[var(--sa-surface)] border border-[var(--sa-border)] rounded-md p-[0.875rem_1rem] mb-5">
          <div className="flex justify-between mb-2">
            <span className="text-[rgba(244,245,248,0.42)] text-[0.7rem] tracking-[0.04em] uppercase font-mono">
              Car mileage threshold (45p → 25p)
            </span>
            <span className="text-[var(--sa-white)] text-[0.7rem] font-mono">
              {formatMiles(carMiles)} / {CAR_THRESHOLD.toLocaleString()} mi
            </span>
          </div>
          <div className="h-[6px] bg-[var(--sa-gray)] rounded-[99px] overflow-hidden">
            <div
              className="h-full rounded-[99px] transition-[width] duration-[400ms] ease-[ease]"
              style={{
                width: `${thresholdPct}%`,
                background: thresholdPct >= 100 ? '#FBBF24' : '#4ADE80',
              }}
            />
          </div>
          {thresholdPct >= 100 && (
            <p className="text-[#FBBF24] text-[0.68rem] mt-1.5">
              10,000 mile threshold reached - remaining car journeys claim at 25p/mile.
            </p>
          )}
        </div>
      )}

      {/* HMRC rates info */}
      <div className="mb-5">
        <RatePanel open={ratesOpen} onToggle={() => setRatesOpen(o => !o)} />
      </div>

      {/* Add journey form */}
      {showForm && (
        <div className="bg-[var(--sa-surface)] border border-[var(--sa-border)] rounded-md p-5 mb-5">
          <h3 className="text-[var(--sa-white)] text-[0.85rem] font-semibold m-[0_0_1rem]">Log Journey</h3>
          <div className="grid gap-3 mb-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>

            {/* Date */}
            <div>
              <label className="block text-[rgba(244,245,248,0.42)] text-[0.68rem] mb-1 uppercase tracking-[0.06em]">Date</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                className="w-full bg-[var(--sa-gray)] border border-[var(--sa-border)] rounded text-[var(--sa-white)] p-[7px_10px] text-[0.78rem]" />
            </div>

            {/* Vehicle */}
            <div>
              <label className="block text-[rgba(244,245,248,0.42)] text-[0.68rem] mb-1 uppercase tracking-[0.06em]">Vehicle</label>
              <select value={vehicle} onChange={e => setVehicle(e.target.value as VehicleType)}
                className="w-full bg-[var(--sa-gray)] border border-[var(--sa-border)] rounded text-[var(--sa-white)] p-[7px_10px] text-[0.78rem]">
                <option value="car">Car / Van</option>
                <option value="motorcycle">Motorcycle</option>
                <option value="bike">Bicycle</option>
              </select>
            </div>

            {/* Miles */}
            <div>
              <label className="block text-[rgba(244,245,248,0.42)] text-[0.68rem] mb-1 uppercase tracking-[0.06em]">Miles</label>
              <input type="number" min="0.1" step="0.1" placeholder="0.0" value={miles} onChange={e => setMiles(e.target.value)}
                className="w-full bg-[var(--sa-gray)] border border-[var(--sa-border)] rounded text-[var(--sa-white)] p-[7px_10px] text-[0.78rem]" />
            </div>
          </div>

          {/* Description */}
          <div className="mb-3">
            <label className="block text-[rgba(244,245,248,0.42)] text-[0.68rem] mb-1 uppercase tracking-[0.06em]">Business Purpose</label>
            <input type="text" placeholder="e.g. Client meeting - Manchester" value={description} onChange={e => setDescription(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addEntry()}
              className="w-full bg-[var(--sa-gray)] border border-[var(--sa-border)] rounded text-[var(--sa-white)] p-[7px_10px] text-[0.78rem]" />
          </div>

          {/* Preview claim */}
          {miles && parseFloat(miles) > 0 && (
            <div className="bg-[var(--sa-gray)] rounded p-[8px_12px] mb-3 flex justify-between items-center">
              <span className="text-[rgba(244,245,248,0.42)] text-[0.72rem]">Estimated claim for this journey</span>
              <span className="text-[#4ADE80] font-mono font-bold">
                {fmtGBP(calcRate(vehicle, vehicle === 'car' ? carMiles : 0, parseFloat(miles) || 0))}
              </span>
            </div>
          )}

          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowForm(false)}
              className="bg-transparent border border-[var(--sa-border)] rounded text-[rgba(244,245,248,0.42)] p-[7px_14px] text-[0.78rem] cursor-pointer">
              Cancel
            </button>
            <button onClick={addEntry}
              disabled={!description.trim() || !miles || parseFloat(miles) <= 0}
              className="bg-[var(--sa-white)] text-[var(--sa-black)] border-none rounded p-[7px_14px] text-[0.78rem] font-semibold cursor-pointer disabled:opacity-40">
              Add Journey
            </button>
          </div>
        </div>
      )}

      {/* Journey list */}
      <div className="bg-[var(--sa-surface)] border border-[var(--sa-border)] rounded-md overflow-hidden">
        {/* Column headers */}
        <div
          className="grid gap-2 p-[8px_12px] border-b border-[var(--sa-border)] bg-[var(--sa-gray)]"
          style={{ gridTemplateColumns: '100px 1fr 90px 70px 80px 36px' }}>
          {['Date', 'Purpose', 'Vehicle', 'Miles', 'Claim', ''].map((h, i) => (
            <span key={i} className={`text-[rgba(244,245,248,0.42)] text-[0.65rem] uppercase tracking-[0.08em] ${i >= 3 ? 'text-right' : 'text-left'}`}>
              {h}
            </span>
          ))}
        </div>

        {enriched.length === 0 ? (
          <div className="p-[3rem] text-center">
            <MapPin size={28} className="text-[rgba(244,245,248,0.18)] mb-3" />
            <p className="text-[rgba(244,245,248,0.42)] text-[0.8rem] m-0">No journeys logged yet.</p>
            <p className="text-[rgba(244,245,248,0.18)] text-[0.72rem] mt-1">Log your first business trip to start tracking your HMRC mileage claim.</p>
          </div>
        ) : (
          enriched.map(({ entry, claimAmount }) => (
            <EntryRow
              key={entry.id}
              entry={entry}
              claimAmount={claimAmount}
              onDelete={() => deleteEntry(entry.id)}
            />
          ))
        )}

        {/* Total footer */}
        {enriched.length > 0 && (
          <div
            className="grid gap-2 p-[10px_12px] border-t border-[var(--sa-border)] bg-[var(--sa-gray)]"
            style={{ gridTemplateColumns: '100px 1fr 90px 70px 80px 36px' }}>
            <span />
            <span className="text-[rgba(244,245,248,0.42)] text-[0.7rem]">Total claim</span>
            <span />
            <span className="text-[var(--sa-white)] text-right font-mono text-[0.78rem] font-semibold">
              {formatMiles(totalMiles)} mi
            </span>
            <span className="text-[#4ADE80] text-right font-mono text-[0.78rem] font-bold">
              {fmtGBP(totalClaim)}
            </span>
            <span />
          </div>
        )}
      </div>

      {/* Tax tip */}
      {totalClaim > 0 && (
        <div className="mt-5 bg-[var(--sa-surface)] border border-[var(--sa-border)] rounded-md p-[0.875rem_1rem] flex items-start gap-2.5">
          <TrendingUp size={14} className="text-[#4ADE80] shrink-0 mt-0.5" />
          <div>
            <p className="text-[var(--sa-white)] text-xs font-medium m-[0_0_3px]">
              Tax saving: approx. {fmtGBP(totalClaim * 0.20)}–{fmtGBP(totalClaim * 0.40)}
            </p>
            <p className="text-[rgba(244,245,248,0.42)] text-[0.7rem] m-0">
              Add {fmtGBP(totalClaim)} to your allowable expenses on your Self Assessment. At 20% basic rate this saves {fmtGBP(totalClaim * 0.20)}, at 40% higher rate {fmtGBP(totalClaim * 0.40)}.
            </p>
          </div>
        </div>
      )}

    </div>
  )
}
