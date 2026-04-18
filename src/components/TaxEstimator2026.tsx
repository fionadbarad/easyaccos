'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { calculateTax } from '@/lib/tax-logic'
import type { TaxRegion, StudentLoanPlan } from '@/lib/tax-logic'

const REGION_OPTIONS: Record<TaxRegion, string> = {
  ruk:      'England, Wales & Northern Ireland',
  scotland: 'Scotland',
}

const LOAN_OPTIONS: Record<StudentLoanPlan, string> = {
  none:         'None',
  plan1:        'Plan 1 — £26,900',
  plan2:        'Plan 2 — £29,385',
  plan4:        'Plan 4 (Scotland) — £33,795',
  plan5:        'Plan 5 — £25,000',
  postgraduate: 'Postgraduate — £21,000 (6%)',
}

const gbp = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
  maximumFractionDigits: 0,
})

const labelStyle: React.CSSProperties = {
  display: 'block',
  color: 'var(--sa-muted)',
  fontSize: '0.72rem',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  marginBottom: '0.3rem',
}

interface ResultRowProps {
  label:   string
  value:   number
  indent?: boolean
  bold?:   boolean
}

function ResultRow({ label, value, indent, bold }: ResultRowProps) {
  if (!value && !bold) return null
  return (
    <div style={{
      display:        'flex',
      justifyContent: 'space-between',
      padding:        '6px 0',
      paddingLeft:    indent ? 16 : 0,
    }}>
      <span style={{ color: bold ? 'var(--sa-white)' : 'var(--sa-muted)', fontSize: '0.875rem' }}>
        {label}
      </span>
      <span style={{ color: 'var(--sa-white)', fontSize: bold ? '1.05rem' : '0.875rem', fontWeight: bold ? 700 : 500 }}>
        {gbp.format(value)}
      </span>
    </div>
  )
}

export default function TaxEstimator2026() {
  const [income, setIncome] = useState(45_000)
  const [region, setRegion] = useState<TaxRegion>('ruk')
  const [loan,   setLoan]   = useState<StudentLoanPlan>('none')

  // Delegate all arithmetic to the canonical engine — no duplicated logic here.
  const result = calculateTax({
    grossRevenue:          income,
    allowableExpenses:     0,
    dividendIncome:        0,
    employmentType:        'self-employed',
    taxRegion:             region,
    studentLoanPlan:       loan,
    voluntaryClass2NI:     false,
    marriageAllowance:     false,
    blindPersonsAllowance: false,
    pensionContribution:   0,
  })

  return (
    <div className="ui-card" style={{ maxWidth: 540, margin: '0 auto' }}>
      <h2 className="ui-card-title" style={{ fontSize: '1.1rem', marginBottom: '1.25rem' }}>
        Tax Estimator 2026/27
      </h2>

      <label style={labelStyle}>Region</label>
      <select
        className="ui-input"
        value={region}
        onChange={(e) => setRegion(e.target.value as TaxRegion)}
        style={{ marginBottom: '1rem', appearance: 'none', cursor: 'pointer' }}
      >
        {(Object.entries(REGION_OPTIONS) as [TaxRegion, string][]).map(([k, label]) => (
          <option key={k} value={k}>{label}</option>
        ))}
      </select>

      <label style={labelStyle}>
        Annual Income —{' '}
        <strong style={{ color: 'var(--sa-white)', fontWeight: 600 }}>{gbp.format(income)}</strong>
      </label>
      <input
        type="range"
        min={0}
        max={150_000}
        step={500}
        value={income}
        aria-label="Annual income slider"
        onChange={(e) => setIncome(Number(e.target.value))}
        style={{ width: '100%', accentColor: 'var(--sa-white)', marginBottom: '0.5rem' }}
      />
      <input
        type="number"
        className="ui-input"
        value={income}
        min={0}
        aria-label="Annual income"
        onChange={(e) => setIncome(Math.max(0, Number(e.target.value)))}
        style={{ marginBottom: '1rem' }}
      />

      <label style={labelStyle}>Student Loan</label>
      <select
        className="ui-input"
        value={loan}
        onChange={(e) => setLoan(e.target.value as StudentLoanPlan)}
        style={{ marginBottom: '1.5rem', appearance: 'none', cursor: 'pointer' }}
      >
        {(Object.entries(LOAN_OPTIONS) as [StudentLoanPlan, string][]).map(([k, label]) => (
          <option key={k} value={k}>{label}</option>
        ))}
      </select>

      <AnimatePresence mode="wait">
        <motion.div
          key={region}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
        >
          <div style={{ borderTop: '1px solid var(--sa-border)', paddingTop: '1rem' }}>
            <ResultRow label="Personal Allowance"   value={result.personalAllowance} />
            <ResultRow label="Taxable Income"        value={result.taxableIncome} />

            {result.taxBands.map((band) => (
              <ResultRow
                key={band.label}
                label={`${band.label} (${band.rate}%)`}
                value={band.tax}
                indent
              />
            ))}

            <ResultRow label="Total Income Tax"          value={result.incomeTax} />
            <ResultRow label="NI Class 4 (6%/2%)"        value={result.niClass4} />

            {result.studentLoanRepayment > 0 && (
              <ResultRow label="Student Loan Repayment"  value={result.studentLoanRepayment} />
            )}

            <div style={{ borderTop: '1px solid var(--sa-border)', marginTop: '0.75rem', paddingTop: '1rem' }}>
              <ResultRow
                label={`Net Take-Home (${result.effectiveTaxRate.toFixed(1)}% effective rate)`}
                value={result.netTakeHome}
                bold
              />
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
