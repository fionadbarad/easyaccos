'use client'

/**
 * The add-journey form. Controlled entirely from props — it holds no state, so
 * every field and the live claim preview can be driven from a test without a
 * storage layer behind it.
 */

import { fmtGBP } from '@/lib/formatters'
import { calcMileageClaim, type VehicleType } from '@/lib/tax/mileage'
import { VEHICLE_LABELS } from '../mileage-model'
import type { MileageForm } from '../use-mileage-logic'

const FIELD =
  'w-full bg-sa-gray border border-sa-border rounded-[4px] text-sa-white px-[10px] py-[7px] text-caption box-border'
const LABEL = 'block text-sa-muted text-micro mb-1 uppercase tracking-[0.06em]'

export function JourneyForm({
  form,
  setField,
  canSubmit,
  previewMilesBefore,
  onSubmit,
  onCancel,
}: {
  form: MileageForm
  setField: <K extends keyof MileageForm>(key: K, value: MileageForm[K]) => void
  canSubmit: boolean
  previewMilesBefore: number
  onSubmit: () => void
  onCancel: () => void
}) {
  const miles = parseFloat(form.miles)
  const showPreview = !Number.isNaN(miles) && miles > 0

  return (
    <div className="bg-sa-surface border border-sa-border rounded-[6px] p-5 mb-5">
      <h3 className="text-sa-white text-body font-semibold mt-0 mb-4">Log Journey</h3>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-3 mb-3">
        <div>
          <label className={LABEL} htmlFor="mileage-date">
            Date
          </label>
          <input
            id="mileage-date"
            type="date"
            value={form.date}
            onChange={(e) => setField('date', e.target.value)}
            className={FIELD}
          />
        </div>

        <div>
          <label className={LABEL} htmlFor="mileage-vehicle">
            Vehicle
          </label>
          <select
            id="mileage-vehicle"
            value={form.vehicle}
            onChange={(e) => setField('vehicle', e.target.value as VehicleType)}
            className={FIELD}
          >
            {(Object.keys(VEHICLE_LABELS) as VehicleType[]).map((v) => (
              <option key={v} value={v}>
                {VEHICLE_LABELS[v]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={LABEL} htmlFor="mileage-miles">
            Miles
          </label>
          <input
            id="mileage-miles"
            type="number"
            min="0.1"
            step="0.1"
            placeholder="0.0"
            value={form.miles}
            onChange={(e) => setField('miles', e.target.value)}
            className={FIELD}
          />
        </div>
      </div>

      <div className="mb-3">
        <label className={LABEL} htmlFor="mileage-purpose">
          Business Purpose
        </label>
        <input
          id="mileage-purpose"
          type="text"
          placeholder="e.g. Client meeting — Manchester"
          value={form.description}
          onChange={(e) => setField('description', e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onSubmit()}
          className={FIELD}
        />
      </div>

      {showPreview && (
        <div className="bg-sa-gray rounded-[4px] px-3 py-2 mb-3 flex justify-between items-center">
          <span className="text-sa-muted text-caption">Estimated claim for this journey</span>
          <span className="text-sa-green font-mono font-bold">
            {fmtGBP(calcMileageClaim(form.vehicle, previewMilesBefore, miles))}
          </span>
        </div>
      )}

      <div className="flex gap-2 justify-end">
        <button
          onClick={onCancel}
          className="bg-transparent border border-sa-border rounded-[4px] text-sa-muted px-[14px] py-[7px] text-caption cursor-pointer"
        >
          Cancel
        </button>
        <button
          onClick={onSubmit}
          disabled={!canSubmit}
          className="bg-sa-white text-sa-black border-none rounded-[4px] px-[14px] py-[7px] text-caption font-semibold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Add Journey
        </button>
      </div>
    </div>
  )
}
