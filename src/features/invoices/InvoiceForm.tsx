'use client'

import { motion } from 'framer-motion'
import type { InvoiceFormState } from '@/lib/hooks/useInvoices'

import { C } from '@/styles/palette'
import { T } from '@/styles/type'
const inputS: React.CSSProperties = {
  width: '100%',
  background: C.gray,
  border: `1px solid ${C.border}`,
  borderRadius: '4px',
  padding: '9px 11px',
  color: C.white,
  fontSize: T.meta,
  outline: 'none',
  boxSizing: 'border-box',
}

const labelS: React.CSSProperties = {
  display: 'block',
  color: C.dim,
  fontSize: T.micro,
  textTransform: 'uppercase',
  letterSpacing: '0.09em',
  marginBottom: '4px',
  fontWeight: 600,
  fontFamily: 'var(--font-geist-mono), monospace',
}

export function InvoiceForm({
  form,
  setForm,
  nextNumber,
  onSubmit,
  onCancel,
}: {
  form: InvoiceFormState
  setForm: React.Dispatch<React.SetStateAction<InvoiceFormState>>
  nextNumber: string
  onSubmit: (e: React.FormEvent) => void
  onCancel: () => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      style={{ marginBottom: '1.25rem' }}
    >
      <form
        onSubmit={onSubmit}
        style={{
          background: C.surface,
          border: `1px solid ${C.border}`,
          borderRadius: '6px',
          padding: '1.25rem',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: '0.85rem',
          alignItems: 'end',
        }}
      >
        <div>
          <label style={labelS}>Client name</label>
          <input
            value={form.client}
            onChange={(e) => setForm((f) => ({ ...f, client: e.target.value }))}
            placeholder="Acme Ltd"
            style={{ ...inputS, fontFamily: 'inherit' }}
            required
          />
        </div>
        <div>
          <label style={labelS}>Invoice #</label>
          <input
            value={form.number}
            onChange={(e) => setForm((f) => ({ ...f, number: e.target.value }))}
            placeholder={nextNumber}
            style={inputS}
          />
        </div>
        <div style={{ gridColumn: 'span 2' }}>
          <label style={labelS}>Description / services</label>
          <input
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="Web development — April 2026"
            style={{ ...inputS, fontFamily: 'inherit' }}
          />
        </div>
        <div>
          <label style={labelS}>Invoice date</label>
          <input
            type="date"
            value={form.date}
            onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
            style={inputS}
          />
        </div>
        <div>
          <label style={labelS}>Due date</label>
          <input
            type="date"
            value={form.dueDate}
            onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
            style={inputS}
          />
        </div>
        <div>
          <label style={labelS}>Net amount (£)</label>
          <input
            type="number"
            min={0}
            step={0.01}
            value={form.amount}
            onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
            placeholder="0.00"
            style={inputS}
            required
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={labelS}>VAT</label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={form.vat}
              onChange={(e) => setForm((f) => ({ ...f, vat: e.target.checked }))}
              style={{ width: '14px', height: '14px', accentColor: C.white, cursor: 'pointer' }}
            />
            <span style={{ color: C.muted, fontSize: T.meta }}>Add 20% VAT</span>
          </label>
        </div>
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          <button
            type="submit"
            style={{
              flex: 1,
              background: C.white,
              color: '#181818',
              border: 'none',
              borderRadius: '4px',
              padding: '9px',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: T.meta,
              minHeight: '40px',
              letterSpacing: '-0.01em',
            }}
          >
            Create
          </button>
          <button
            type="button"
            onClick={onCancel}
            style={{
              background: 'transparent',
              color: C.muted,
              border: `1px solid ${C.border}`,
              borderRadius: '4px',
              padding: '9px 12px',
              cursor: 'pointer',
              fontSize: T.meta,
              minHeight: '40px',
            }}
          >
            Cancel
          </button>
        </div>
      </form>
    </motion.div>
  )
}
