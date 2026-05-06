'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { calculateTax } from '@/lib/tax-logic'
import type { TaxRegion, StudentLoanPlan } from '@/lib/tax-logic'

const REGION_OPTIONS: Record<TaxRegion, string> = {
  ruk: 'England, Wales & Northern Ireland',
  scotland: 'Scotland',
}

const LOAN_OPTIONS: Record<StudentLoanPlan, string> = {
  none: 'None',
  plan1: 'Plan 1 — £26,900',
  plan2: 'Plan 2 — £29,385',
  plan4: 'Plan 4 (Scotland) — £33,795',
  plan5: 'Plan 5 — £25,000',
  postgraduate: 'Postgraduate — £21,000 (6%)',
}

const gbp = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
  maximumFractionDigits: 0,
})

interface ResultRowProps {
  label: string
  value: number
  indent?: boolean
  bold?: boolean
}

function ResultRow({ label, value, indent, bold }: ResultRowProps) {
  if (!value && !bold) return null
  return (
    <div className={`flex justify-between py-[6px] ${indent ? 'pl-[16px]' : ''}`}>
      <span className={`text-sm ${bold ? 'text-[var(--sa-white)]' : 'text-[var(--sa-muted)]'}`}>
        {label}
      </span>
      <span className={`text-[var(--sa-white)] ${bold ? 'text-[1.05rem] font-bold' : 'text-sm font-medium'}`}>
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
    <div className="ui-card max-w-[540px] mx-auto">
      <h2 className="ui-card-title text-[1.1rem] mb-5">
        Tax Estimator 2026/27
      </h2>

      <label className="block text-[var(--sa-muted)] text-[0.72rem] uppercase tracking-[0.08em] mb-[0.3rem]">Region</label>
      <select
        className="ui-input mb-4 cursor-pointer appearance-none"
        value={region}
        onChange={(e) => setRegion(e.target.value as TaxRegion)}
      >
        {(Object.entries(REGION_OPTIONS) as [TaxRegion, string][]).map(([k, label]) => (
          <option key={k} value={k}>{label}</option>
        ))}
      </select>

      <label className="block text-[var(--sa-muted)] text-[0.72rem] uppercase tracking-[0.08em] mb-[0.3rem]">
        Annual Income —{' '}
        <strong className="text-[var(--sa-white)] font-semibold">{gbp.format(income)}</strong>
      </label>
      <input
        type="range"
        min={0}
        max={150_000}
        step={500}
        value={income}
        aria-label="Annual income slider"
        onChange={(e) => setIncome(Number(e.target.value))}
        className="w-full mb-2 accent-[var(--sa-white)]"
      />
      <input
        type="number"
        className="ui-input mb-4"
        value={income}
        min={0}
        aria-label="Annual income"
        onChange={(e) => setIncome(Math.max(0, Number(e.target.value)))}
      />

      <label className="block text-[var(--sa-muted)] text-[0.72rem] uppercase tracking-[0.08em] mb-[0.3rem]">Student Loan</label>
      <select
        className="ui-input mb-6 cursor-pointer appearance-none"
        value={loan}
        onChange={(e) => setLoan(e.target.value as StudentLoanPlan)}
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
          <div className="border-t border-[var(--sa-border)] pt-[1rem]">
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

            <div className="border-t border-[var(--sa-border)] mt-3 pt-[1rem]">
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
