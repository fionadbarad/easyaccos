'use client'

import { useState, useMemo } from 'react'
import { Plus, Cloud, CloudOff, Car, TrendingUp } from 'lucide-react'
import { useUserData } from '@/lib/use-user-data'
import { fmtGBP } from '@/lib/formatters'
import { C } from '@/styles/palette'
import { computeTotals, formatMiles } from '@/features/mileage/calc'
import { CAR_THRESHOLD, MILEAGE_SEED, type MileageEntry } from '@/features/mileage/types'
import { MileageStat } from '@/features/mileage/MileageStat'
import { RatePanel } from '@/features/mileage/RatePanel'
import { JourneyForm, type JourneyFields } from '@/features/mileage/JourneyForm'
import { JourneyList } from '@/features/mileage/JourneyList'

// ── Main page ─────────────────────────────────────────────────────────────────
export default function MileagePage() {
  const {
    items: entries,
    persist,
    loading,
    isAuthenticated,
  } = useUserData<MileageEntry>('user_mileage', 'easyacco_mileage', MILEAGE_SEED)

  const [showForm, setShowForm] = useState(false)
  const [ratesOpen, setRatesOpen] = useState(false)

  // Sort entries chronologically, then compute per-entry claim amounts.
  const sorted = useMemo(() => [...entries].sort((a, b) => a.date.localeCompare(b.date)), [entries])
  const { enriched, totalMiles, totalClaim, carMiles } = useMemo(
    () => computeTotals(sorted),
    [sorted],
  )

  // Progress toward 10k threshold (car only)
  const thresholdPct = Math.min(100, (carMiles / CAR_THRESHOLD) * 100)

  function addEntry(fields: JourneyFields) {
    const entry: MileageEntry = {
      id: crypto.randomUUID(),
      ...fields,
      createdAt: new Date().toISOString(),
    }
    persist([entry, ...entries])
    setShowForm(false)
  }

  function deleteEntry(id: string) {
    persist(entries.filter((e) => e.id !== id))
  }

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: C.bg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span
          style={{
            color: C.muted,
            fontSize: '0.8rem',
            fontFamily: 'var(--font-geist-mono, monospace)',
          }}
        >
          loading…
        </span>
      </div>
    )
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: C.bg,
        padding: '2rem 1.5rem 4rem',
        maxWidth: '820px',
        margin: '0 auto',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          marginBottom: '1.75rem',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <Car size={18} style={{ color: C.white }} />
            <h1
              style={{
                color: C.white,
                fontSize: '1.1rem',
                fontWeight: 600,
                letterSpacing: '-0.03em',
                margin: 0,
              }}
            >
              Mileage Tracker
            </h1>
          </div>
          <p style={{ color: C.muted, fontSize: '0.75rem', margin: 0 }}>
            HMRC approved mileage — 2026/27 tax year
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              color: C.muted,
              fontSize: '0.68rem',
            }}
          >
            {isAuthenticated ? (
              <>
                <Cloud size={11} style={{ color: C.green }} /> synced
              </>
            ) : (
              <>
                <CloudOff size={11} /> guest
              </>
            )}
          </div>
          <button
            onClick={() => setShowForm((f) => !f)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: C.white,
              color: C.bg,
              border: 'none',
              borderRadius: '4px',
              padding: '7px 14px',
              fontSize: '0.78rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <Plus size={13} /> Log Journey
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: '12px',
          marginBottom: '1.25rem',
        }}
      >
        <MileageStat
          label="Total Miles"
          value={`${formatMiles(totalMiles)} mi`}
          sub={`${entries.length} journeys`}
        />
        <MileageStat
          label="Total Claim"
          value={fmtGBP(totalClaim)}
          sub="tax deductible"
          accent={C.green}
        />
        <MileageStat
          label="Car Miles"
          value={`${formatMiles(carMiles)} mi`}
          sub={`of ${CAR_THRESHOLD.toLocaleString()} threshold`}
        />
        <MileageStat
          label="Rate"
          value={carMiles >= CAR_THRESHOLD ? '25p/mi' : '55p/mi'}
          sub={
            carMiles >= CAR_THRESHOLD
              ? 'excess rate active'
              : `${formatMiles(CAR_THRESHOLD - carMiles)} mi until drop`
          }
          accent={carMiles >= CAR_THRESHOLD ? C.amber : C.white}
        />
      </div>

      {/* 10k threshold progress */}
      {entries.some((e) => e.vehicle === 'car') && (
        <div
          style={{
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: '6px',
            padding: '0.875rem 1rem',
            marginBottom: '1.25rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span
              style={{
                color: C.muted,
                fontSize: '0.7rem',
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                fontFamily: 'var(--font-geist-mono, monospace)',
              }}
            >
              Car mileage threshold (55p → 25p)
            </span>
            <span
              style={{
                color: C.white,
                fontSize: '0.7rem',
                fontFamily: 'var(--font-geist-mono, monospace)',
              }}
            >
              {formatMiles(carMiles)} / {CAR_THRESHOLD.toLocaleString()} mi
            </span>
          </div>
          <div
            style={{ height: '6px', background: C.gray, borderRadius: '99px', overflow: 'hidden' }}
          >
            <div
              style={{
                height: '100%',
                borderRadius: '99px',
                transition: 'width 0.4s ease',
                width: `${thresholdPct}%`,
                background: thresholdPct >= 100 ? C.amber : C.green,
              }}
            />
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
        <RatePanel open={ratesOpen} onToggle={() => setRatesOpen((o) => !o)} />
      </div>

      {/* Add journey form */}
      {showForm && (
        <JourneyForm carMiles={carMiles} onAdd={addEntry} onCancel={() => setShowForm(false)} />
      )}

      {/* Journey list */}
      <JourneyList
        enriched={enriched}
        totalMiles={totalMiles}
        totalClaim={totalClaim}
        onDelete={deleteEntry}
      />

      {/* Tax tip */}
      {totalClaim > 0 && (
        <div
          style={{
            marginTop: '1.25rem',
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: '6px',
            padding: '0.875rem 1rem',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px',
          }}
        >
          <TrendingUp size={14} style={{ color: C.green, flexShrink: 0, marginTop: '2px' }} />
          <div>
            <p style={{ color: C.white, fontSize: '0.75rem', fontWeight: 500, margin: '0 0 3px' }}>
              Tax saving: approx. {fmtGBP(totalClaim * 0.2)}–{fmtGBP(totalClaim * 0.4)}
            </p>
            <p style={{ color: C.muted, fontSize: '0.7rem', margin: 0 }}>
              Add {fmtGBP(totalClaim)} to your allowable expenses on your Self Assessment. At 20%
              basic rate this saves {fmtGBP(totalClaim * 0.2)}, at 40% higher rate{' '}
              {fmtGBP(totalClaim * 0.4)}.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
