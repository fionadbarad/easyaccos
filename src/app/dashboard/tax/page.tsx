'use client'

import { useState } from 'react'
import { calculateTax, type TaxInput, type TaxResult } from '@/lib/tax-logic'

const C = { bg: '#1A2342', deep: '#0F1628', card: '#4A4066', gold: '#C2A368', text: '#E4D3B4', muted: 'rgba(228,211,180,0.55)', border: 'rgba(194,163,104,0.2)', red: 'rgba(255,100,100,0.85)' }

const fmt = (n: number) => `£${Math.round(n).toLocaleString('en-GB')}`
const pct = (n: number) => `${n.toFixed(1)}%`

const inputStyle = { width: '100%', background: C.deep, border: `1px solid ${C.border}`, borderRadius: '4px', padding: '9px 12px', color: C.text, fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' as const }
const labelStyle = { display: 'block', color: C.muted, fontSize: '0.75rem', letterSpacing: '0.07em', textTransform: 'uppercase' as const, marginBottom: '0.4rem' }
const selectStyle = { ...inputStyle, appearance: 'none' as const, cursor: 'pointer' }

function StatRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: `1px solid ${C.border}` }}>
      <span style={{ color: C.muted, fontSize: '0.875rem' }}>{label}</span>
      <span style={{ color: highlight ? C.gold : C.text, fontWeight: highlight ? 700 : 500, fontSize: highlight ? '1rem' : '0.9rem' }}>
        {value}
      </span>
    </div>
  )
}

const INITIAL: TaxInput = { grossIncome: 35000, employmentType: 'self-employed', studentLoanPlan: 'none', voluntaryClass2NI: false }

export default function TaxPage() {
  const [form, setForm] = useState<TaxInput>(INITIAL)
  const result: TaxResult = calculateTax(form)

  function set<K extends keyof TaxInput>(key: K, value: TaxInput[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  const takeHomePct = form.grossIncome > 0 ? (result.netTakeHome / form.grossIncome * 100) : 100

  return (
    <div style={{ padding: 'clamp(1.5rem,4vw,2.5rem)', maxWidth: '860px' }}>
      <h1 style={{ fontFamily: 'var(--font-playfair)', color: C.text, fontSize: 'clamp(1.5rem,3vw,2rem)', fontWeight: 700, marginBottom: '0.3rem' }}>
        Tax Estimator
      </h1>
      <p style={{ color: C.muted, fontSize: '0.875rem', marginBottom: '2rem' }}>2026/27 tax year · HMRC-accurate · Self-employed & employed</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: '1.5rem' }}>

        {/* ── INPUT CARD ── */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '8px', padding: '1.75rem' }}>
          <h2 style={{ color: C.gold, fontFamily: 'var(--font-playfair)', fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.5rem' }}>
            Your Income Details
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <label style={labelStyle}>Gross Annual Income</label>
              <input type="number" min={0} max={999999} value={form.grossIncome}
                onChange={(e) => set('grossIncome', Number(e.target.value))}
                style={inputStyle} />
            </div>

            <div>
              <label style={labelStyle}>Employment Type</label>
              <select value={form.employmentType} onChange={(e) => set('employmentType', e.target.value as TaxInput['employmentType'])} style={selectStyle}>
                <option value="self-employed">Self-employed</option>
                <option value="employed">Employed (PAYE)</option>
                <option value="both">Both</option>
              </select>
            </div>

            <div>
              <label style={labelStyle}>Student Loan Plan</label>
              <select value={form.studentLoanPlan} onChange={(e) => set('studentLoanPlan', e.target.value as TaxInput['studentLoanPlan'])} style={selectStyle}>
                <option value="none">None</option>
                <option value="plan1">Plan 1 (pre-2012)</option>
                <option value="plan2">Plan 2 (post-2012)</option>
                <option value="plan4">Plan 4 (Scotland)</option>
                <option value="plan5">Plan 5 (post-2023)</option>
                <option value="postgraduate">Postgraduate</option>
              </select>
            </div>

            {(form.employmentType === 'self-employed' || form.employmentType === 'both') && (
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                <input type="checkbox" checked={form.voluntaryClass2NI}
                  onChange={(e) => set('voluntaryClass2NI', e.target.checked)}
                  style={{ width: '16px', height: '16px', accentColor: C.gold }} />
                <span style={{ color: C.muted, fontSize: '0.875rem' }}>Voluntary Class 2 NI (£3.65/wk — protects State Pension)</span>
              </label>
            )}
          </div>
        </div>

        {/* ── RESULTS CARD ── */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '8px', padding: '1.75rem' }}>
          <h2 style={{ color: C.gold, fontFamily: 'var(--font-playfair)', fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.5rem' }}>
            Your Tax Breakdown
          </h2>

          {/* Take-home bar */}
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ color: C.muted, fontSize: '0.78rem' }}>Take-home</span>
              <span style={{ color: C.gold, fontWeight: 600, fontSize: '0.85rem' }}>{pct(takeHomePct)}</span>
            </div>
            <div style={{ height: '8px', background: 'rgba(255,255,255,0.08)', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${takeHomePct}%`, background: `linear-gradient(90deg, ${C.gold}, #d4b896)`, borderRadius: '4px', transition: 'width 0.4s ease' }} />
            </div>
          </div>

          <StatRow label="Gross Income"          value={fmt(result.grossIncome)}            />
          <StatRow label="Personal Allowance"    value={fmt(result.personalAllowance)}      />
          <StatRow label="Taxable Income"         value={fmt(result.taxableIncome)}          />
          <StatRow label="Income Tax"             value={fmt(result.incomeTax)}              />
          {result.niClass4 > 0 && <StatRow label="NI Class 4"    value={fmt(result.niClass4)} />}
          {result.niClass2 > 0 && <StatRow label="NI Class 2"    value={fmt(result.niClass2)} />}
          {result.studentLoanRepayment > 0 && <StatRow label="Student Loan"  value={fmt(result.studentLoanRepayment)} />}
          <StatRow label="Total Deductions"       value={fmt(result.totalDeductions)}        />
          <StatRow label="Effective Tax Rate"     value={pct(result.effectiveTaxRate)}       />
          <StatRow label="Net Take-Home"          value={fmt(result.netTakeHome)} highlight  />

          <p style={{ marginTop: '1.25rem', color: C.muted, fontSize: '0.72rem', lineHeight: 1.5 }}>
            * Estimates only. Not financial advice. Consult an accountant for your specific situation.
          </p>
        </div>
      </div>
    </div>
  )
}
