'use client'

/**
 * The mileage page, as presentation only.
 *
 * Every value it renders and every callback it fires arrives as a prop. There
 * is no storage, no fetching and no arithmetic here beyond choosing a colour,
 * which is what makes the whole surface renderable in a test from a plain
 * object.
 *
 * Tax figures: all rates and thresholds come from bands-2026.ts and are
 * rendered through `pence()` / `pct()`. This file is listed in
 * DRIFT_PRONE_FILES for that reason (CLAUDE.md hard rule 1).
 */

import { Car, Cloud, CloudOff, Plus, TrendingUp } from 'lucide-react'
import { fmtGBP } from '@/lib/formatters'
import {
  AMAP_CAR_FIRST,
  AMAP_CAR_EXCESS,
  AMAP_CAR_THRESHOLD,
  RUK_BASIC_RATE,
  RUK_HIGHER_RATE,
} from '@/lib/tax/bands-2026'
import { formatMiles, pence, pct } from '../mileage-model'
import type { MileageLogic } from '../use-mileage-logic'
import { AmapRatePanel } from './AmapRatePanel'
import { JourneyForm } from './JourneyForm'
import { JourneyTable } from './JourneyTable'

function Stat({
  label,
  value,
  sub,
  accentClass = 'text-sa-white',
}: {
  label: string
  value: string
  sub?: string
  accentClass?: string
}) {
  return (
    <div className="bg-sa-surface border border-sa-border rounded-[6px] px-5 py-4">
      <div className="text-sa-muted text-micro uppercase tracking-[0.08em] mb-[6px] font-mono">
        {label}
      </div>
      <div className={`${accentClass} text-heading font-bold tracking-[-0.03em] font-mono`}>
        {value}
      </div>
      {sub && <div className="text-sa-muted text-micro mt-1">{sub}</div>}
    </div>
  )
}

/**
 * Progress toward the car threshold.
 *
 * The bar's width is the one place an inline style survives the Tailwind pass:
 * it is a computed percentage that changes on every render, and emitting it as
 * a class would mean a new arbitrary-value class per possible width.
 */
function ThresholdBar({
  carMiles,
  thresholdPct,
  atExcessRate,
  yearLabel,
}: {
  carMiles: number
  thresholdPct: number
  atExcessRate: boolean
  yearLabel: string
}) {
  return (
    <div className="bg-sa-surface border border-sa-border rounded-[6px] px-4 py-[0.875rem] mb-5">
      <div className="flex justify-between mb-2">
        <span className="text-sa-muted text-micro tracking-[0.04em] uppercase font-mono">
          Car mileage threshold {yearLabel} ({pence(AMAP_CAR_FIRST)} → {pence(AMAP_CAR_EXCESS)})
        </span>
        <span className="text-sa-white text-micro font-mono">
          {formatMiles(carMiles)} / {AMAP_CAR_THRESHOLD.toLocaleString()} mi
        </span>
      </div>
      <div
        className="h-[6px] bg-sa-gray rounded-[99px] overflow-hidden"
        role="progressbar"
        aria-label={`Car miles used against the ${yearLabel} threshold`}
        aria-valuemin={0}
        aria-valuemax={AMAP_CAR_THRESHOLD}
        aria-valuenow={Math.round(carMiles)}
      >
        <div
          className={`h-full rounded-[99px] transition-[width] duration-400 ease-out ${
            atExcessRate ? 'bg-sa-amber' : 'bg-sa-green'
          }`}
          style={{ width: `${thresholdPct}%` }}
        />
      </div>
      {atExcessRate && (
        <p className="text-sa-amber text-micro mt-[6px]">
          {AMAP_CAR_THRESHOLD.toLocaleString()} mile threshold reached — remaining car journeys
          claim at {pence(AMAP_CAR_EXCESS)}/mile.
        </p>
      )}
    </div>
  )
}

function TaxTip({ totalClaim }: { totalClaim: number }) {
  const atBasic = fmtGBP(totalClaim * RUK_BASIC_RATE)
  const atHigher = fmtGBP(totalClaim * RUK_HIGHER_RATE)
  return (
    <div className="mt-5 bg-sa-surface border border-sa-border rounded-[6px] px-4 py-[0.875rem] flex items-start gap-[10px]">
      <TrendingUp size={14} className="text-sa-green shrink-0 mt-[2px]" />
      <div>
        <p className="text-sa-white text-caption font-medium mt-0 mb-[3px]">
          Tax saving: approx. {atBasic}–{atHigher}
        </p>
        <p className="text-sa-muted text-micro m-0">
          Add {fmtGBP(totalClaim)} to your allowable expenses on your Self Assessment. At{' '}
          {pct(RUK_BASIC_RATE)} basic rate this saves {atBasic}, at {pct(RUK_HIGHER_RATE)} higher
          rate {atHigher}.
        </p>
      </div>
    </div>
  )
}

export function MileageDashboard({
  loading,
  isAuthenticated,
  yearLabel,
  summary,
  previewMilesBefore,
  form,
  setField,
  canSubmit,
  showForm,
  setShowForm,
  ratesOpen,
  setRatesOpen,
  addEntry,
  deleteEntry,
}: MileageLogic) {
  if (loading) {
    return (
      <div className="min-h-screen bg-sa-black flex items-center justify-center">
        <span className="text-sa-muted text-meta font-mono">loading…</span>
      </div>
    )
  }

  const { priced, totalMiles, totalClaim, carMiles, priorYearCount } = summary
  const milesToDrop = AMAP_CAR_THRESHOLD - carMiles

  return (
    <div className="page-shell">
      {/* Header */}
      <div className="flex items-start justify-between mb-7 flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-[10px] mb-1">
            <Car size={16} className="text-sa-white" />
            <h1 className="text-sa-white text-title font-semibold tracking-[-0.03em] m-0">
              Mileage Tracker
            </h1>
          </div>
          <p className="text-sa-muted text-caption m-0">AMAP rates — {yearLabel} tax year</p>
        </div>

        <div className="flex items-center gap-[10px]">
          <div className="flex items-center gap-[5px] text-sa-muted text-micro">
            {isAuthenticated ? (
              <>
                <Cloud size={12} className="text-sa-green" /> synced
              </>
            ) : (
              <>
                <CloudOff size={12} /> guest
              </>
            )}
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-[6px] bg-sa-white text-sa-black border-none rounded-[4px] px-[14px] py-[7px] text-caption font-semibold cursor-pointer"
          >
            <Plus size={12} /> Log Journey
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-3 mb-5">
        <Stat
          label="Total Miles"
          value={`${formatMiles(totalMiles)} mi`}
          sub={priorYearCount > 0 ? `${yearLabel} · ${priorYearCount} earlier` : yearLabel}
        />
        <Stat
          label="Total Claim"
          value={fmtGBP(totalClaim)}
          sub={`${yearLabel} · tax deductible`}
          accentClass="text-sa-green"
        />
        <Stat
          label="Car Miles"
          value={`${formatMiles(carMiles)} mi`}
          sub={`of ${AMAP_CAR_THRESHOLD.toLocaleString()} threshold`}
        />
        <Stat
          label="Rate"
          value={`${pence(summary.atExcessRate ? AMAP_CAR_EXCESS : AMAP_CAR_FIRST)}/mi`}
          sub={
            summary.atExcessRate
              ? 'excess rate active'
              : `${formatMiles(milesToDrop)} mi until drop`
          }
          accentClass={summary.atExcessRate ? 'text-sa-amber' : 'text-sa-white'}
        />
      </div>

      {summary.hasCarEntriesThisYear && (
        <ThresholdBar
          carMiles={carMiles}
          thresholdPct={summary.thresholdPct}
          atExcessRate={summary.atExcessRate}
          yearLabel={yearLabel}
        />
      )}

      <div className="mb-5">
        <AmapRatePanel
          open={ratesOpen}
          onToggle={() => setRatesOpen(!ratesOpen)}
          yearLabel={yearLabel}
        />
      </div>

      {showForm && (
        <JourneyForm
          form={form}
          setField={setField}
          canSubmit={canSubmit}
          previewMilesBefore={previewMilesBefore}
          onSubmit={addEntry}
          onCancel={() => setShowForm(false)}
        />
      )}

      <JourneyTable
        priced={priced}
        totalMiles={totalMiles}
        totalClaim={totalClaim}
        yearLabel={yearLabel}
        onDelete={deleteEntry}
      />

      {totalClaim > 0 && <TaxTip totalClaim={totalClaim} />}
    </div>
  )
}
