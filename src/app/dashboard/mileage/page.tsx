'use client'

import { useState, useMemo } from 'react'
import {
  Plus, Trash2, Cloud, CloudOff, Car, MapPin,
  TrendingUp, ChevronDown, ChevronUp, Info,
} from 'lucide-react'
import { useUserData } from '@/lib/use-user-data'
import { fmtGBP } from '@/lib/tax-engine'

const C = {
  bg:      '#181818',
  surface: '#1C1D20',
  gray:    '#222326',
  white:   '#F4F5F8',
  muted:   'rgba(244,245,248,0.42)',
  dim:     'rgba(244,245,248,0.18)',
  border:  'rgba(244,245,248,0.07)',
  green:   '#4ADE80',
  red:     '#F87171',
  amber:   '#FBBF24',
}

// HMRC 2026/27 approved mileage rates
const RATE_CAR_FIRST   = 0.45   // First 10,000 miles
const RATE_CAR_EXCESS  = 0.25   // Above 10,000 miles
const RATE_BIKE        = 0.20
const RATE_MOTORCYCLE  = 0.24
const CAR_THRESHOLD    = 10_000

type VehicleType = 'car' | 'motorcycle' | 'bike'

interface MileageEntry {
  id:          string
  date:        string
  description: string
  vehicle:     VehicleType
  miles:       number
  createdAt:   string
}

const SEED: MileageEntry[] = []

const VEHICLE_LABELS: Record<VehicleType, string> = {
  car:         'Car / Van',
  motorcycle:  'Motorcycle',
  bike:        'Bicycle',
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
    <div style={{
      background: C.surface, border: `1px solid ${C.border}`,
      borderRadius: '6px', padding: '1rem 1.25rem',
    }}>
      <div style={{ color: C.muted, fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px', fontFamily: 'var(--font-geist-mono, monospace)' }}>
        {label}
      </div>
      <div style={{ color: accent ?? C.white, fontSize: '1.4rem', fontWeight: 700, letterSpacing: '-0.03em', fontFamily: 'var(--font-geist-mono, monospace)' }}>
        {value}
      </div>
      {sub && <div style={{ color: C.muted, fontSize: '0.68rem', marginTop: '4px' }}>{sub}</div>}
    </div>
  )
}

// ── Rate info panel ───────────────────────────────────────────────────────────
function RatePanel({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: '6px', overflow: 'hidden' }}>
      <button
        onClick={onToggle}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0.75rem 1rem', background: 'none', border: 'none', color: C.white,
          cursor: 'pointer', fontSize: '0.78rem', fontWeight: 500,
        }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
          <Info size={13} style={{ color: C.muted }} />
          HMRC Approved Mileage Rates 2026/27
        </span>
        {open ? <ChevronUp size={13} color={C.muted} /> : <ChevronDown size={13} color={C.muted} />}
      </button>
      {open && (
        <div style={{ padding: '0 1rem 1rem', borderTop: `1px solid ${C.border}` }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem', marginTop: '0.75rem' }}>
            <thead>
              <tr>
                {['Vehicle', 'First 10,000 mi', 'Above 10,000 mi'].map(h => (
                  <th key={h} style={{ textAlign: 'left', color: C.muted, fontWeight: 500, padding: '4px 8px 8px 0', fontSize: '0.68rem', letterSpacing: '0.04em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                ['Car / Van',    '45p per mile', '25p per mile'],
                ['Motorcycle',   '24p per mile', '24p per mile'],
                ['Bicycle',      '20p per mile', '20p per mile'],
              ].map(([v, r1, r2]) => (
                <tr key={v} style={{ borderTop: `1px solid ${C.border}` }}>
                  <td style={{ padding: '6px 8px 6px 0', color: C.white }}>{v}</td>
                  <td style={{ padding: '6px 8px 6px 0', color: C.green, fontFamily: 'var(--font-geist-mono, monospace)' }}>{r1}</td>
                  <td style={{ padding: '6px 8px 6px 0', color: C.muted, fontFamily: 'var(--font-geist-mono, monospace)' }}>{r2}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p style={{ color: C.muted, fontSize: '0.68rem', marginTop: '10px', lineHeight: 1.5 }}>
            Use these HMRC-approved rates instead of claiming actual vehicle costs. The car threshold resets each tax year (6 April). Only business journeys qualify — commuting to a regular workplace does not.
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
    <div style={{
      display: 'grid', gridTemplateColumns: '100px 1fr 90px 70px 80px 36px',
      alignItems: 'center', gap: '8px',
      padding: '10px 12px', borderBottom: `1px solid ${C.border}`,
      fontSize: '0.78rem',
    }}>
      <span style={{ color: C.muted, fontFamily: 'var(--font-geist-mono, monospace)', fontSize: '0.7rem' }}>
        {entry.date}
      </span>
      <span style={{ color: C.white, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {entry.description}
      </span>
      <span style={{ color: C.muted, fontSize: '0.7rem' }}>
        {VEHICLE_LABELS[entry.vehicle]}
      </span>
      <span style={{ color: C.white, textAlign: 'right', fontFamily: 'var(--font-geist-mono, monospace)' }}>
        {formatMiles(entry.miles)} mi
      </span>
      <span style={{ color: C.green, textAlign: 'right', fontFamily: 'var(--font-geist-mono, monospace)', fontWeight: 600 }}>
        {fmtGBP(claimAmount)}
      </span>
      <button onClick={onDelete}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.dim, padding: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = C.red}
        onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = C.dim}>
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

  const [showForm,    setShowForm]    = useState(false)
  const [ratesOpen,   setRatesOpen]   = useState(false)
  const [date,        setDate]        = useState(today())
  const [description, setDescription] = useState('')
  const [vehicle,     setVehicle]     = useState<VehicleType>('car')
  const [miles,       setMiles]       = useState('')

  // Sort entries chronologically
  const sorted = useMemo(() =>
    [...entries].sort((a, b) => a.date.localeCompare(b.date)),
    [entries],
  )

  // Compute per-entry claim amounts (cumulative car miles needed)
  const { enriched, totalMiles, totalClaim, carMiles } = useMemo(() => {
    const acc = sorted.reduce<{
      enriched: Array<{ entry: MileageEntry; claimAmount: number }>
      runningCarMiles: number
      totalMiles: number
      totalClaim: number
    }>(
      (a, e) => {
        const milesBefore = e.vehicle === 'car' ? a.runningCarMiles : 0
        const claim       = calcRate(e.vehicle, milesBefore, e.miles)
        return {
          enriched:        [...a.enriched, { entry: e, claimAmount: claim }],
          runningCarMiles: a.runningCarMiles + (e.vehicle === 'car' ? e.miles : 0),
          totalMiles:      a.totalMiles + e.miles,
          totalClaim:      a.totalClaim + claim,
        }
      },
      { enriched: [], runningCarMiles: 0, totalMiles: 0, totalClaim: 0 },
    )
    return { enriched: acc.enriched, totalMiles: acc.totalMiles, totalClaim: acc.totalClaim, carMiles: acc.runningCarMiles }
  }, [sorted])

  // Progress toward 10k threshold (car only)
  const thresholdPct = Math.min(100, (carMiles / CAR_THRESHOLD) * 100)

  function addEntry() {
    const m = parseFloat(miles)
    if (!description.trim() || isNaN(m) || m <= 0) return
    const entry: MileageEntry = {
      id:          crypto.randomUUID(),
      date,
      description: description.trim(),
      vehicle,
      miles:       m,
      createdAt:   new Date().toISOString(),
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
      <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: C.muted, fontSize: '0.8rem', fontFamily: 'var(--font-geist-mono, monospace)' }}>loading…</span>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, padding: '2rem 1.5rem 4rem', maxWidth: '820px', margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <Car size={18} style={{ color: C.white }} />
            <h1 style={{ color: C.white, fontSize: '1.1rem', fontWeight: 600, letterSpacing: '-0.03em', margin: 0 }}>
              Mileage Tracker
            </h1>
          </div>
          <p style={{ color: C.muted, fontSize: '0.75rem', margin: 0 }}>
            HMRC approved mileage — 2026/27 tax year
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: C.muted, fontSize: '0.68rem' }}>
            {isAuthenticated
              ? <><Cloud size={11} style={{ color: C.green }} /> synced</>
              : <><CloudOff size={11} /> guest</>}
          </div>
          <button
            onClick={() => setShowForm(f => !f)}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              background: C.white, color: C.bg, border: 'none', borderRadius: '4px',
              padding: '7px 14px', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
            }}>
            <Plus size={13} /> Log Journey
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '1.25rem' }}>
        <Stat label="Total Miles" value={`${formatMiles(totalMiles)} mi`} sub={`${entries.length} journeys`} />
        <Stat label="Total Claim" value={fmtGBP(totalClaim)} sub="tax deductible" accent={C.green} />
        <Stat label="Car Miles" value={`${formatMiles(carMiles)} mi`} sub={`of ${CAR_THRESHOLD.toLocaleString()} threshold`} />
        <Stat
          label="Rate"
          value={carMiles >= CAR_THRESHOLD ? '25p/mi' : '45p/mi'}
          sub={carMiles >= CAR_THRESHOLD ? 'excess rate active' : `${formatMiles(CAR_THRESHOLD - carMiles)} mi until drop`}
          accent={carMiles >= CAR_THRESHOLD ? C.amber : C.white}
        />
      </div>

      {/* 10k threshold progress */}
      {entries.some(e => e.vehicle === 'car') && (
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: '6px', padding: '0.875rem 1rem', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ color: C.muted, fontSize: '0.7rem', letterSpacing: '0.04em', textTransform: 'uppercase', fontFamily: 'var(--font-geist-mono, monospace)' }}>
              Car mileage threshold (45p → 25p)
            </span>
            <span style={{ color: C.white, fontSize: '0.7rem', fontFamily: 'var(--font-geist-mono, monospace)' }}>
              {formatMiles(carMiles)} / {CAR_THRESHOLD.toLocaleString()} mi
            </span>
          </div>
          <div style={{ height: '6px', background: C.gray, borderRadius: '99px', overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: '99px', transition: 'width 0.4s ease',
              width: `${thresholdPct}%`,
              background: thresholdPct >= 100 ? C.amber : C.green,
            }} />
          </div>
          {thresholdPct >= 100 && (
            <p style={{ color: C.amber, fontSize: '0.68rem', marginTop: '6px' }}>
              10,000 mile threshold reached — remaining car journeys claim at 25p/mile.
            </p>
          )}
        </div>
      )}

      {/* HMRC rates info */}
      <div style={{ marginBottom: '1.25rem' }}>
        <RatePanel open={ratesOpen} onToggle={() => setRatesOpen(o => !o)} />
      </div>

      {/* Add journey form */}
      {showForm && (
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: '6px', padding: '1.25rem', marginBottom: '1.25rem' }}>
          <h3 style={{ color: C.white, fontSize: '0.85rem', fontWeight: 600, margin: '0 0 1rem' }}>Log Journey</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '12px' }}>

            {/* Date */}
            <div>
              <label style={{ display: 'block', color: C.muted, fontSize: '0.68rem', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Date</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                style={{ width: '100%', background: C.gray, border: `1px solid ${C.border}`, borderRadius: '4px', color: C.white, padding: '7px 10px', fontSize: '0.78rem', boxSizing: 'border-box' }} />
            </div>

            {/* Vehicle */}
            <div>
              <label style={{ display: 'block', color: C.muted, fontSize: '0.68rem', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Vehicle</label>
              <select value={vehicle} onChange={e => setVehicle(e.target.value as VehicleType)}
                style={{ width: '100%', background: C.gray, border: `1px solid ${C.border}`, borderRadius: '4px', color: C.white, padding: '7px 10px', fontSize: '0.78rem', boxSizing: 'border-box' }}>
                <option value="car">Car / Van</option>
                <option value="motorcycle">Motorcycle</option>
                <option value="bike">Bicycle</option>
              </select>
            </div>

            {/* Miles */}
            <div>
              <label style={{ display: 'block', color: C.muted, fontSize: '0.68rem', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Miles</label>
              <input type="number" min="0.1" step="0.1" placeholder="0.0" value={miles} onChange={e => setMiles(e.target.value)}
                style={{ width: '100%', background: C.gray, border: `1px solid ${C.border}`, borderRadius: '4px', color: C.white, padding: '7px 10px', fontSize: '0.78rem', boxSizing: 'border-box' }} />
            </div>
          </div>

          {/* Description */}
          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', color: C.muted, fontSize: '0.68rem', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Business Purpose</label>
            <input type="text" placeholder="e.g. Client meeting — Manchester" value={description} onChange={e => setDescription(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addEntry()}
              style={{ width: '100%', background: C.gray, border: `1px solid ${C.border}`, borderRadius: '4px', color: C.white, padding: '7px 10px', fontSize: '0.78rem', boxSizing: 'border-box' }} />
          </div>

          {/* Preview claim */}
          {miles && parseFloat(miles) > 0 && (
            <div style={{ background: C.gray, borderRadius: '4px', padding: '8px 12px', marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: C.muted, fontSize: '0.72rem' }}>Estimated claim for this journey</span>
              <span style={{ color: C.green, fontFamily: 'var(--font-geist-mono, monospace)', fontWeight: 700 }}>
                {fmtGBP(calcRate(vehicle, vehicle === 'car' ? carMiles : 0, parseFloat(miles) || 0))}
              </span>
            </div>
          )}

          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button onClick={() => setShowForm(false)}
              style={{ background: 'none', border: `1px solid ${C.border}`, borderRadius: '4px', color: C.muted, padding: '7px 14px', fontSize: '0.78rem', cursor: 'pointer' }}>
              Cancel
            </button>
            <button onClick={addEntry}
              disabled={!description.trim() || !miles || parseFloat(miles) <= 0}
              style={{
                background: C.white, color: C.bg, border: 'none', borderRadius: '4px',
                padding: '7px 14px', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
                opacity: (!description.trim() || !miles || parseFloat(miles) <= 0) ? 0.4 : 1,
              }}>
              Add Journey
            </button>
          </div>
        </div>
      )}

      {/* Journey list */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: '6px', overflow: 'hidden' }}>
        {/* Column headers */}
        <div style={{
          display: 'grid', gridTemplateColumns: '100px 1fr 90px 70px 80px 36px',
          gap: '8px', padding: '8px 12px',
          borderBottom: `1px solid ${C.border}`,
          background: C.gray,
        }}>
          {['Date', 'Purpose', 'Vehicle', 'Miles', 'Claim', ''].map((h, i) => (
            <span key={i} style={{ color: C.muted, fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: i >= 3 ? 'right' : 'left' }}>
              {h}
            </span>
          ))}
        </div>

        {enriched.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center' }}>
            <MapPin size={28} style={{ color: C.dim, marginBottom: '12px' }} />
            <p style={{ color: C.muted, fontSize: '0.8rem', margin: 0 }}>No journeys logged yet.</p>
            <p style={{ color: C.dim, fontSize: '0.72rem', marginTop: '4px' }}>Log your first business trip to start tracking your HMRC mileage claim.</p>
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
          <div style={{
            display: 'grid', gridTemplateColumns: '100px 1fr 90px 70px 80px 36px',
            gap: '8px', padding: '10px 12px',
            borderTop: `1px solid ${C.border}`,
            background: C.gray,
          }}>
            <span />
            <span style={{ color: C.muted, fontSize: '0.7rem' }}>Total claim</span>
            <span />
            <span style={{ color: C.white, textAlign: 'right', fontFamily: 'var(--font-geist-mono, monospace)', fontSize: '0.78rem', fontWeight: 600 }}>
              {formatMiles(totalMiles)} mi
            </span>
            <span style={{ color: C.green, textAlign: 'right', fontFamily: 'var(--font-geist-mono, monospace)', fontSize: '0.78rem', fontWeight: 700 }}>
              {fmtGBP(totalClaim)}
            </span>
            <span />
          </div>
        )}
      </div>

      {/* Tax tip */}
      {totalClaim > 0 && (
        <div style={{
          marginTop: '1.25rem', background: C.surface, border: `1px solid ${C.border}`,
          borderRadius: '6px', padding: '0.875rem 1rem',
          display: 'flex', alignItems: 'flex-start', gap: '10px',
        }}>
          <TrendingUp size={14} style={{ color: C.green, flexShrink: 0, marginTop: '2px' }} />
          <div>
            <p style={{ color: C.white, fontSize: '0.75rem', fontWeight: 500, margin: '0 0 3px' }}>
              Tax saving: approx. {fmtGBP(totalClaim * 0.20)}–{fmtGBP(totalClaim * 0.40)}
            </p>
            <p style={{ color: C.muted, fontSize: '0.7rem', margin: 0 }}>
              Add {fmtGBP(totalClaim)} to your allowable expenses on your Self Assessment. At 20% basic rate this saves {fmtGBP(totalClaim * 0.20)}, at 40% higher rate {fmtGBP(totalClaim * 0.40)}.
            </p>
          </div>
        </div>
      )}

    </div>
  )
}
