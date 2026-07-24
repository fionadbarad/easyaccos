'use client'

import { useState } from 'react'
import { FileText } from 'lucide-react'
import { fmtDecAbs as fmtDp } from '@/lib/formatters'
import { C } from '@/styles/palette'
import { ISLine } from './ISLine'
import type { PnLFigures } from './calc'

export interface CogsFields {
  date: string
  description: string
  amount: number
}

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

export function IncomeStatement({
  figures,
  tax,
  taxProvision,
  profitAfterTax,
  onAddCogs,
}: {
  figures: PnLFigures
  tax: { incomeTax: number; nationalInsurance: number }
  taxProvision: number
  profitAfterTax: number
  onAddCogs: (fields: CogsFields) => void
}) {
  const { totalRevenue, costOfSales, grossProfit, opEx, ebitda, cogsItems, opExItems } = figures

  const [cogsForm, setCogsForm] = useState({ date: today(), description: '', amount: '' })

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const amt = parseFloat(cogsForm.amount)
    if (!amt || !cogsForm.description.trim()) return
    onAddCogs({ date: cogsForm.date, description: cogsForm.description.trim(), amount: amt })
    setCogsForm({ date: today(), description: '', amount: '' })
  }

  return (
    <div
      style={{
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: '6px',
        padding: '1.75rem',
        maxWidth: '580px',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.65rem',
          marginBottom: '1.5rem',
        }}
      >
        <FileText size={16} style={{ color: C.muted }} strokeWidth={1.5} />
        <div>
          <h2
            style={{
              color: C.white,
              fontSize: '0.95rem',
              fontWeight: 600,
              letterSpacing: '-0.02em',
              margin: 0,
            }}
          >
            Income Statement (P&amp;L)
          </h2>
          <p
            style={{
              color: C.muted,
              fontSize: '0.68rem',
              margin: 0,
              fontFamily: 'var(--font-geist-mono), monospace',
            }}
          >
            Period ending 5 April 2027 · 2026/27 Fiscal Year
          </p>
        </div>
      </div>

      <ISLine label="REVENUE" bold />
      <ISLine label="Client Income / Sales" value={totalRevenue} indent={1} />
      <ISLine label="Total Revenue" value={totalRevenue} bold highlight />
      <ISLine separator />

      <ISLine label="COST OF SALES" bold />
      {cogsItems.length === 0 ? (
        <ISLine label="Direct Materials / Subcontractors" value={costOfSales} indent={1} negative />
      ) : (
        cogsItems
          .slice(0, 6)
          .map((t) => (
            <ISLine key={t.id} label={t.description} value={t.amount} indent={1} negative />
          ))
      )}
      {cogsItems.length > 6 && <ISLine label={`+ ${cogsItems.length - 6} more items`} indent={1} />}
      <ISLine label="Total Cost of Sales" value={costOfSales} bold negative />

      <form
        onSubmit={submit}
        style={{
          display: 'grid',
          gridTemplateColumns: 'auto 1fr 110px auto',
          gap: '6px',
          alignItems: 'center',
          margin: '10px 0 4px',
          paddingLeft: '16px',
        }}
      >
        <input
          type="date"
          value={cogsForm.date}
          onChange={(e) => setCogsForm((f) => ({ ...f, date: e.target.value }))}
          style={{
            background: C.gray,
            border: `1px solid ${C.border}`,
            borderRadius: '3px',
            padding: '6px 8px',
            color: C.white,
            fontSize: '0.72rem',
            fontFamily: 'var(--font-geist-mono), monospace',
            outline: 'none',
          }}
        />
        <input
          type="text"
          value={cogsForm.description}
          placeholder="e.g. Raw materials — steel"
          onChange={(e) => setCogsForm((f) => ({ ...f, description: e.target.value }))}
          style={{
            background: C.gray,
            border: `1px solid ${C.border}`,
            borderRadius: '3px',
            padding: '6px 8px',
            color: C.white,
            fontSize: '0.75rem',
            outline: 'none',
          }}
        />
        <input
          type="number"
          min={0}
          step={0.01}
          value={cogsForm.amount}
          placeholder="0.00"
          onChange={(e) => setCogsForm((f) => ({ ...f, amount: e.target.value }))}
          style={{
            background: C.gray,
            border: `1px solid ${C.border}`,
            borderRadius: '3px',
            padding: '6px 8px',
            color: C.white,
            fontSize: '0.75rem',
            textAlign: 'right',
            fontFamily: 'var(--font-geist-mono), monospace',
            outline: 'none',
          }}
        />
        <button
          type="submit"
          style={{
            background: C.white,
            color: C.bg,
            border: 'none',
            borderRadius: '3px',
            padding: '6px 12px',
            fontSize: '0.72rem',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          + COGS
        </button>
      </form>
      <ISLine separator />

      <ISLine label="GROSS PROFIT" value={grossProfit} bold highlight />
      <ISLine
        label={`Gross Margin: ${totalRevenue > 0 ? ((grossProfit / totalRevenue) * 100).toFixed(1) : 0}%`}
        indent={1}
      />
      <ISLine separator />

      <ISLine label="OPERATING EXPENSES" bold />
      {opExItems.slice(0, 6).map((t) => (
        <ISLine key={t.id} label={t.description} value={t.amount} indent={1} negative />
      ))}
      {opExItems.length > 6 && <ISLine label={`+ ${opExItems.length - 6} more items`} indent={1} />}
      <ISLine label="Total OpEx" value={opEx} bold negative />
      <ISLine separator />

      <ISLine label="NET PROFIT (EBITDA)" value={ebitda} bold highlight />
      <ISLine separator />

      <ISLine label="TAX PROVISION" bold />
      <ISLine label="Income Tax (2026/27)" value={tax.incomeTax} indent={1} negative />
      <ISLine
        label="National Insurance (Class 4)"
        value={tax.nationalInsurance}
        indent={1}
        negative
      />
      <ISLine label="Total Tax Provision" value={taxProvision} bold negative />
      <ISLine separator />

      <div
        style={{
          background: 'rgba(244,245,248,0.04)',
          border: `1px solid ${C.border}`,
          borderRadius: '4px',
          padding: '0.9rem 1rem',
          marginTop: '0.25rem',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span
            style={{
              color: C.white,
              fontWeight: 600,
              fontSize: '0.85rem',
              letterSpacing: '-0.01em',
            }}
          >
            NET PROFIT AFTER TAX
          </span>
          <span
            style={{
              color: profitAfterTax >= 0 ? C.white : C.red,
              fontWeight: 600,
              fontSize: '1rem',
              fontFamily: 'var(--font-geist-mono), monospace',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {fmtDp(profitAfterTax)}
          </span>
        </div>
        <div
          style={{
            color: C.muted,
            fontSize: '0.65rem',
            marginTop: '4px',
            fontFamily: 'var(--font-geist-mono), monospace',
          }}
        >
          2026/27 HMRC compliant · tax calculations run client-side
        </div>
      </div>
    </div>
  )
}
