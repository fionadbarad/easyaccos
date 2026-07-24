'use client'

import { useState } from 'react'
import { fmtGBP } from '@/lib/formatters'
import { C } from '@/styles/palette'
import { calcRate, today } from './calc'
import type { VehicleType } from './types'

export interface JourneyFields {
  date: string
  description: string
  vehicle: VehicleType
  miles: number
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  color: C.muted,
  fontSize: '0.68rem',
  marginBottom: '4px',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
}

const fieldStyle: React.CSSProperties = {
  width: '100%',
  background: C.gray,
  border: `1px solid ${C.border}`,
  borderRadius: '4px',
  color: C.white,
  padding: '7px 10px',
  fontSize: '0.78rem',
  boxSizing: 'border-box',
}

// ── Add journey form ──────────────────────────────────────────────────────────
export function JourneyForm({
  carMiles,
  onAdd,
  onCancel,
}: {
  carMiles: number
  onAdd: (fields: JourneyFields) => void
  onCancel: () => void
}) {
  const [date, setDate] = useState(today())
  const [description, setDescription] = useState('')
  const [vehicle, setVehicle] = useState<VehicleType>('car')
  const [miles, setMiles] = useState('')

  const parsedMiles = parseFloat(miles)
  const canSubmit = description.trim().length > 0 && !!miles && parsedMiles > 0

  function submit() {
    if (!canSubmit || isNaN(parsedMiles)) return
    onAdd({ date, description: description.trim(), vehicle, miles: parsedMiles })
    setDescription('')
    setMiles('')
    setDate(today())
  }

  return (
    <div
      style={{
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: '6px',
        padding: '1.25rem',
        marginBottom: '1.25rem',
      }}
    >
      <h3 style={{ color: C.white, fontSize: '0.85rem', fontWeight: 600, margin: '0 0 1rem' }}>
        Log Journey
      </h3>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: '12px',
          marginBottom: '12px',
        }}
      >
        {/* Date */}
        <div>
          <label style={labelStyle}>Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            style={fieldStyle}
          />
        </div>

        {/* Vehicle */}
        <div>
          <label style={labelStyle}>Vehicle</label>
          <select
            value={vehicle}
            onChange={(e) => setVehicle(e.target.value as VehicleType)}
            style={fieldStyle}
          >
            <option value="car">Car / Van</option>
            <option value="motorcycle">Motorcycle</option>
            <option value="bike">Bicycle</option>
          </select>
        </div>

        {/* Miles */}
        <div>
          <label style={labelStyle}>Miles</label>
          <input
            type="number"
            min="0.1"
            step="0.1"
            placeholder="0.0"
            value={miles}
            onChange={(e) => setMiles(e.target.value)}
            style={fieldStyle}
          />
        </div>
      </div>

      {/* Description */}
      <div style={{ marginBottom: '12px' }}>
        <label style={labelStyle}>Business Purpose</label>
        <input
          type="text"
          placeholder="e.g. Client meeting — Manchester"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          style={fieldStyle}
        />
      </div>

      {/* Preview claim */}
      {miles && parsedMiles > 0 && (
        <div
          style={{
            background: C.gray,
            borderRadius: '4px',
            padding: '8px 12px',
            marginBottom: '12px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span style={{ color: C.muted, fontSize: '0.72rem' }}>
            Estimated claim for this journey
          </span>
          <span
            style={{
              color: C.green,
              fontFamily: 'var(--font-geist-mono, monospace)',
              fontWeight: 700,
            }}
          >
            {fmtGBP(calcRate(vehicle, vehicle === 'car' ? carMiles : 0, parsedMiles || 0))}
          </span>
        </div>
      )}

      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
        <button
          onClick={onCancel}
          style={{
            background: 'none',
            border: `1px solid ${C.border}`,
            borderRadius: '4px',
            color: C.muted,
            padding: '7px 14px',
            fontSize: '0.78rem',
            cursor: 'pointer',
          }}
        >
          Cancel
        </button>
        <button
          onClick={submit}
          disabled={!canSubmit}
          style={{
            background: C.white,
            color: C.bg,
            border: 'none',
            borderRadius: '4px',
            padding: '7px 14px',
            fontSize: '0.78rem',
            fontWeight: 600,
            cursor: 'pointer',
            opacity: canSubmit ? 1 : 0.4,
          }}
        >
          Add Journey
        </button>
      </div>
    </div>
  )
}
