'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { calculateTax } from '@/lib/tax-engine'
import type { TaxRegion, StudentLoanPlan } from '@/lib/tax-engine'
import { fmtGBP } from '@/lib/formatters'
import {
  SL_PLAN1_THRESH,
  SL_PLAN2_THRESH,
  SL_PLAN4_THRESH,
  SL_PLAN5_THRESH,
  SL_POSTGRAD_THRESH,
  SL_POSTGRAD_RATE,
} from '@/lib/tax/bands-2026'

const REGION_OPTIONS: Record<TaxRegion, string> = {
  ruk: 'England, Wales & Northern Ireland',
  scotland: 'Scotland',
}

const LOAN_OPTIONS: Record<StudentLoanPlan, string> = {
  none: 'None',
  plan1: `Plan 1 — ${fmtGBP(SL_PLAN1_THRESH)}`,
  plan2: `Plan 2 — ${fmtGBP(SL_PLAN2_THRESH)}`,
  plan4: `Plan 4 (Scotland) — ${fmtGBP(SL_PLAN4_THRESH)}`,
  plan5: `Plan 5 — ${fmtGBP(SL_PLAN5_THRESH)}`,
  postgraduate: `Postgraduate — ${fmtGBP(SL_POSTGRAD_THRESH)} (${SL_POSTGRAD_RATE * 100}%)`,
}

const gbp = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
  maximumFractionDigits: 0,
})

// --sa-muted and --sa-white are the legacy aliases of the same values
// text-sa-muted and text-sa-white compile to, so this is a rename, not a
// recolour.
const LABEL_CLASS = 'block text-sa-muted text-caption uppercase tracking-[0.08em] mb-[0.3rem]'

interface ResultRowProps {
  label: string
  value: number
  indent?: boolean
  bold?: boolean
}

function ResultRow({ label, value, indent, bold }: ResultRowProps) {
  if (!value && !bold) return null
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        padding: '6px 0',
        paddingLeft: indent ? 16 : 0,
      }}
    >
      <span className={`text-body ${bold ? 'text-sa-white' : 'text-sa-muted'}`}>{label}</span>
      <span className={`text-sa-white ${bold ? 'text-lead font-bold' : 'text-body font-medium'}`}>
        {gbp.format(value)}
      </span>
    </div>
  )
}

export default function TaxEstimator2026() {
  const [income, setIncome] = useState(45_000)
  const [region, setRegion] = useState<TaxRegion>('ruk')
  const [loan, setLoan] = useState<StudentLoanPlan>('none')

  // Delegate all arithmetic to the canonical engine — no duplicated logic here.
  const result = calculateTax({
    grossRevenue: income,
    allowableExpenses: 0,
    dividendIncome: 0,
    employmentType: 'self-employed',
    taxRegion: region,
    studentLoanPlan: loan,
    voluntaryClass2NI: false,
    marriageAllowance: false,
    blindPersonsAllowance: false,
    pensionContribution: 0,
  })

  return (
    <div className="ui-card" style={{ maxWidth: 540, margin: '0 auto' }}>
      <h2 className="ui-card-title text-title mb-5">Tax Estimator 2026/27</h2>

      <label className={LABEL_CLASS}>Region</label>
      <select
        className="ui-input"
        value={region}
        onChange={(e) => setRegion(e.target.value as TaxRegion)}
        style={{ marginBottom: '1rem', appearance: 'none', cursor: 'pointer' }}
      >
        {(Object.entries(REGION_OPTIONS) as [TaxRegion, string][]).map(([k, label]) => (
          <option key={k} value={k}>
            {label}
          </option>
        ))}
      </select>

      <label className={LABEL_CLASS}>
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

      <label className={LABEL_CLASS}>Student Loan</label>
      <select
        className="ui-input"
        value={loan}
        onChange={(e) => setLoan(e.target.value as StudentLoanPlan)}
        style={{ marginBottom: '1.5rem', appearance: 'none', cursor: 'pointer' }}
      >
        {(Object.entries(LOAN_OPTIONS) as [StudentLoanPlan, string][]).map(([k, label]) => (
          <option key={k} value={k}>
            {label}
          </option>
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
            <ResultRow label="Personal Allowance" value={result.personalAllowance} />
            <ResultRow label="Taxable Income" value={result.taxableIncome} />

            {result.taxBands.map((band) => (
              <ResultRow
                key={band.label}
                label={`${band.label} (${band.rate}%)`}
                value={band.tax}
                indent
              />
            ))}

            <ResultRow label="Total Income Tax" value={result.incomeTax} />
            <ResultRow label="NI Class 4 (6%/2%)" value={result.niClass4} />

            {result.studentLoanRepayment > 0 && (
              <ResultRow label="Student Loan Repayment" value={result.studentLoanRepayment} />
            )}

            <div
              style={{
                borderTop: '1px solid var(--sa-border)',
                marginTop: '0.75rem',
                paddingTop: '1rem',
              }}
            >
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
