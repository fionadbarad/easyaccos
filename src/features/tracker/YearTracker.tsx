'use client'

// Year-round projection: uses actual logged income/expenses to estimate the
// January 2028 SA bill, tracks pot progress, surfaces shortfall + monthly
// savings needed. Aggregation math is in aggregates.ts (unit-tested).

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { TrendingDown, Minus, Calendar, AlertTriangle, CheckCircle } from 'lucide-react'
import { C } from '@/styles/palette'
import { calculateTax } from '@/lib/tax-engine'
import type { EmploymentType, StudentLoanPlan, TaxRegion } from '@/lib/tax-engine'
import { useUserData } from '@/lib/use-user-data'
import { fmt, clamp, SA_DEADLINE } from './shared'
import {
  daysElapsedAt, yearProgressAt, monthsElapsedAt, daysToDeadlineAt,
  yearlyIncome, yearlyExpenses, projectAnnual,
  potShortfall, monthlyNeededToClose,
  type TypedTx, type DatedAmount,
} from './aggregates'
import { Label, Select, Row, inputStyle } from './controls'

interface Transaction extends TypedTx { id: string }
interface Expense     extends DatedAmount { id: string }

export default function YearTracker() {
  const today = new Date()

  const daysElapsed   = daysElapsedAt(today)
  const yearProgress  = yearProgressAt(today)
  const monthsElapsed = monthsElapsedAt(today)
  const daysToDeadline = daysToDeadlineAt(SA_DEADLINE, today)

  const { items: transactions, loading: txLoading } = useUserData<Transaction>('user_transactions', 'ea_transactions', [])
  const { items: expenses,     loading: expLoading } = useUserData<Expense>('user_expenses', 'ea_expenses', [])

  const [empType,   setEmpType]   = useState<EmploymentType>('self-employed')
  const [region,    setRegion]    = useState<TaxRegion>('ruk')
  const [slPlan,    setSlPlan]    = useState<StudentLoanPlan>('none')
  const [pension,   setPension]   = useState('')
  const [potSaved,  setPotSaved]  = useState('')
  const [showSetup, setShowSetup] = useState(false)

  const yearIncome   = useMemo(() => yearlyIncome(transactions),   [transactions])
  const yearExpenses = useMemo(() => yearlyExpenses(expenses),     [expenses])

  const projectedIncome   = projectAnnual(yearIncome,   monthsElapsed)
  const projectedExpenses = projectAnnual(yearExpenses, monthsElapsed)
  const monthlyPensionNum = parseFloat(pension || '0')

  const projectedTax = projectedIncome <= 0
    ? null
    : calculateTax({
      grossRevenue:          projectedIncome,
      allowableExpenses:     projectedExpenses,
      dividendIncome:        0,
      employmentType:        empType,
      taxRegion:             region,
      studentLoanPlan:       slPlan,
      voluntaryClass2NI:     false,
      marriageAllowance:     false,
      blindPersonsAllowance: false,
      pensionContribution:   monthlyPensionNum * 12,
    })

  const projectedBill   = projectedTax ? Math.round(projectedTax.totalDeductions) : 0
  const savedSoFar      = parseFloat(potSaved || '0')
  const gap             = potShortfall(projectedBill, savedSoFar)
  const monthsRemaining = clamp(12 - monthsElapsed, 0, 12)
  const monthlyNeeded   = monthlyNeededToClose(gap, monthsRemaining)
  const isOnTrack       = gap <= 0

  const loading = txLoading || expLoading

  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: '6px', overflow: 'hidden' }}>
      <div style={{ padding: '1.25rem 1.5rem', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
            <Calendar size={14} style={{ color: C.muted }} />
            <span style={{ color: C.white, fontSize: '0.9rem', fontWeight: 600, letterSpacing: '-0.02em' }}>2026/27 Tax Year Tracker</span>
          </div>
          <div style={{ color: C.muted, fontSize: '0.72rem' }}>Live projection of your January 2028 Self Assessment bill</div>
        </div>
        <button
          onClick={() => setShowSetup(o => !o)}
          style={{ background: 'none', border: `1px solid ${C.border}`, borderRadius: '4px', padding: '5px 10px', cursor: 'pointer', color: C.muted, fontSize: '0.72rem', fontFamily: 'var(--font-geist-mono), monospace', textTransform: 'uppercase', letterSpacing: '0.08em', whiteSpace: 'nowrap', transition: 'border-color 0.15s, color 0.15s' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(244,245,248,0.3)'; (e.currentTarget as HTMLElement).style.color = C.white }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = C.border; (e.currentTarget as HTMLElement).style.color = C.muted }}
        >
          Setup
        </button>
      </div>

      <AnimatePresence>
        {showSetup && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ overflow: 'hidden', borderBottom: `1px solid ${C.border}` }}
          >
            <div style={{ padding: '1.25rem 1.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
              <div>
                <Label>Employment type</Label>
                <Select value={empType} onChange={v => setEmpType(v as EmploymentType)} options={[
                  { value: 'self-employed', label: 'Self-Employed' },
                  { value: 'employed',      label: 'Employed (PAYE)' },
                  { value: 'director',      label: 'Director' },
                ]} />
              </div>
              <div>
                <Label>Tax region</Label>
                <Select value={region} onChange={v => setRegion(v as TaxRegion)} options={[
                  { value: 'ruk',      label: 'England / Wales / NI' },
                  { value: 'scotland', label: 'Scotland' },
                ]} />
              </div>
              <div>
                <Label>Student loan plan</Label>
                <Select value={slPlan} onChange={v => setSlPlan(v as StudentLoanPlan)} options={[
                  { value: 'none',         label: 'None' },
                  { value: 'plan1',        label: 'Plan 1' },
                  { value: 'plan2',        label: 'Plan 2' },
                  { value: 'plan4',        label: 'Plan 4 (Scotland)' },
                  { value: 'plan5',        label: 'Plan 5' },
                  { value: 'postgraduate', label: 'Postgraduate' },
                ]} />
              </div>
              <div>
                <Label>Monthly pension (SIPP)</Label>
                <input
                  type="number" min={0} placeholder="0"
                  value={pension} onChange={e => setPension(e.target.value)}
                  style={inputStyle}
                  onFocus={e => (e.target as HTMLInputElement).style.borderColor = 'rgba(244,245,248,0.3)'}
                  onBlur={e  => (e.target as HTMLInputElement).style.borderColor = C.border}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ color: C.dim, fontSize: '0.65rem', fontFamily: 'var(--font-geist-mono), monospace', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Tax year progress — 6 Apr 2026 → 5 Apr 2027
            </span>
            <span style={{ color: C.white, fontSize: '0.65rem', fontFamily: 'var(--font-geist-mono), monospace', fontWeight: 600 }}>
              {Math.round(yearProgress * 100)}% · {daysElapsed}d elapsed
            </span>
          </div>
          <div style={{ height: '4px', background: C.gray, borderRadius: '2px', overflow: 'hidden' }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${yearProgress * 100}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
              style={{ height: '100%', background: yearProgress > 0.75 ? C.amber : C.white, borderRadius: '2px' }}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '5px' }}>
            <span style={{ color: C.dim, fontSize: '0.6rem', fontFamily: 'var(--font-geist-mono), monospace' }}>Apr 2026</span>
            <span style={{ color: C.dim, fontSize: '0.6rem', fontFamily: 'var(--font-geist-mono), monospace' }}>Apr 2027</span>
          </div>
        </div>

        {loading ? (
          <div style={{ color: C.dim, fontSize: '0.78rem', fontFamily: 'var(--font-geist-mono), monospace' }}>Loading transactions…</div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '1px', border: `1px solid ${C.border}`, borderRadius: '6px', overflow: 'hidden', background: C.border }}>
              {[
                { label: 'Income this year',      value: fmt(yearIncome),            sub: 'from logged transactions' },
                { label: 'Expenses this year',    value: fmt(yearExpenses),          sub: 'from logged expenses' },
                { label: 'Projected annual',      value: fmt(projectedIncome),       sub: `based on ${monthsElapsed.toFixed(1)}mo data` },
                { label: 'Projected net profit',  value: fmt(Math.max(0, projectedIncome - projectedExpenses - monthlyPensionNum * 12)), sub: 'after expenses & pension' },
              ].map(({ label, value, sub }) => (
                <div key={label} style={{ background: C.surface, padding: '1rem 1.1rem' }}>
                  <div style={{ color: C.dim, fontSize: '0.58rem', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, marginBottom: '6px', fontFamily: 'var(--font-geist-mono), monospace' }}>{label}</div>
                  <div style={{ color: C.white, fontSize: '1.15rem', fontWeight: 600, letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>{value}</div>
                  <div style={{ color: C.dim, fontSize: '0.6rem', marginTop: '4px' }}>{sub}</div>
                </div>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>

              <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: '6px', padding: '1.1rem 1.25rem' }}>
                <div style={{ color: C.dim, fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, marginBottom: '1rem', fontFamily: 'var(--font-geist-mono), monospace' }}>Projected tax bill (Jan 2028)</div>
                {projectedTax ? (
                  <>
                    <div style={{ color: C.white, fontSize: '1.8rem', fontWeight: 600, letterSpacing: '-0.04em', lineHeight: 1, fontVariantNumeric: 'tabular-nums', marginBottom: '1rem' }}>
                      {fmt(projectedBill)}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                      <Row label="Income Tax"       value={fmt(projectedTax.incomeTax)} />
                      {projectedTax.niClass4 > 0 && <Row label="NI Class 4"    value={fmt(projectedTax.niClass4)} />}
                      {projectedTax.niClass1 > 0 && <Row label="NI Class 1"    value={fmt(projectedTax.niClass1)} />}
                      {projectedTax.studentLoanRepayment > 0 && <Row label="Student Loan" value={fmt(projectedTax.studentLoanRepayment)} />}
                      <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '8px' }}>
                        <span style={{ color: C.muted, fontSize: '0.72rem' }}>Effective rate</span>
                        <span style={{ color: C.white, fontSize: '0.72rem', fontFamily: 'var(--font-geist-mono), monospace' }}>{projectedTax.effectiveTaxRate.toFixed(1)}%</span>
                      </div>
                    </div>
                    {projectedTax.sixtyPercentTrap && (
                      <div style={{ marginTop: '0.75rem', padding: '8px 10px', background: 'rgba(251,191,36,0.06)', border: `1px solid rgba(251,191,36,0.2)`, borderRadius: '4px', display: 'flex', gap: '7px' }}>
                        <AlertTriangle size={11} style={{ color: C.amber, flexShrink: 0, marginTop: '1px' }} />
                        <span style={{ color: C.amber, fontSize: '0.7rem', lineHeight: 1.5 }}>60% trap zone. Consider a pension contribution.</span>
                      </div>
                    )}
                  </>
                ) : (
                  <div style={{ color: C.dim, fontSize: '0.78rem', lineHeight: 1.6 }}>
                    No transactions logged yet.<br />
                    Add income to the Ledger to see your projection.
                  </div>
                )}
              </div>

              <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: '6px', padding: '1.1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ color: C.dim, fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, fontFamily: 'var(--font-geist-mono), monospace' }}>Your tax pot</div>

                <div>
                  <Label>Amount saved so far</Label>
                  <input
                    type="number" min={0} placeholder="0"
                    value={potSaved} onChange={e => setPotSaved(e.target.value)}
                    style={inputStyle}
                    onFocus={e => (e.target as HTMLInputElement).style.borderColor = 'rgba(244,245,248,0.3)'}
                    onBlur={e  => (e.target as HTMLInputElement).style.borderColor = C.border}
                  />
                  <div style={{ color: C.dim, fontSize: '0.65rem', marginTop: '5px' }}>Enter what&apos;s currently in your tax savings pot</div>
                </div>

                {projectedTax && (
                  <div>
                    <div style={{ marginBottom: '10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <span style={{ color: C.muted, fontSize: '0.7rem' }}>Pot filled</span>
                        <span style={{ color: C.white, fontSize: '0.7rem', fontFamily: 'var(--font-geist-mono), monospace' }}>
                          {Math.min(100, Math.round((savedSoFar / Math.max(projectedBill, 1)) * 100))}%
                        </span>
                      </div>
                      <div style={{ height: '6px', background: C.gray, borderRadius: '3px', overflow: 'hidden' }}>
                        <motion.div
                          animate={{ width: `${Math.min(100, (savedSoFar / Math.max(projectedBill, 1)) * 100)}%` }}
                          transition={{ duration: 0.4, ease: 'easeOut' }}
                          style={{ height: '100%', background: isOnTrack ? C.green : savedSoFar / Math.max(projectedBill, 1) > 0.7 ? C.amber : C.red, borderRadius: '3px' }}
                        />
                      </div>
                    </div>

                    <motion.div
                      key={isOnTrack ? 'good' : 'bad'}
                      initial={{ opacity: 0, scale: 0.97 }}
                      animate={{ opacity: 1, scale: 1 }}
                      style={{
                        padding: '12px 14px', borderRadius: '6px',
                        background: isOnTrack ? 'rgba(74,222,128,0.06)' : 'rgba(248,113,113,0.06)',
                        border: `1px solid ${isOnTrack ? 'rgba(74,222,128,0.2)' : 'rgba(248,113,113,0.2)'}`,
                        display: 'flex', alignItems: 'flex-start', gap: '10px',
                      }}
                    >
                      {isOnTrack
                        ? <CheckCircle size={14} style={{ color: C.green, flexShrink: 0, marginTop: '1px' }} />
                        : gap > 0
                          ? <TrendingDown size={14} style={{ color: C.red, flexShrink: 0, marginTop: '1px' }} />
                          : <Minus size={14} style={{ color: C.muted, flexShrink: 0, marginTop: '1px' }} />
                      }
                      <div>
                        {isOnTrack ? (
                          <>
                            <div style={{ color: C.green, fontSize: '0.82rem', fontWeight: 600, marginBottom: '2px' }}>You&apos;re covered</div>
                            <div style={{ color: C.muted, fontSize: '0.72rem', lineHeight: 1.5 }}>
                              Surplus of {fmt(Math.abs(gap))} — you have more than enough set aside.
                            </div>
                          </>
                        ) : (
                          <>
                            <div style={{ color: C.red, fontSize: '0.82rem', fontWeight: 600, marginBottom: '2px' }}>
                              Shortfall: {fmt(gap)}
                            </div>
                            <div style={{ color: C.muted, fontSize: '0.72rem', lineHeight: 1.5 }}>
                              {monthsRemaining > 0
                                ? <>Save <strong style={{ color: C.white }}>{fmt(monthlyNeeded)}/month</strong> for the next {Math.round(monthsRemaining)} months to cover your bill.</>
                                : 'Tax year has ended — ensure funds are ready for January 2028.'
                              }
                            </div>
                          </>
                        )}
                      </div>
                    </motion.div>
                  </div>
                )}
              </div>
            </div>

            <div style={{ background: C.gray, borderRadius: '6px', padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', border: `1px solid ${C.border}` }}>
              <div>
                <div style={{ color: C.dim, fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, fontFamily: 'var(--font-geist-mono), monospace', marginBottom: '3px' }}>Self Assessment deadline</div>
                <div style={{ color: C.white, fontSize: '0.9rem', fontWeight: 600, letterSpacing: '-0.02em' }}>31 January 2028</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ color: daysToDeadline < 30 ? C.red : daysToDeadline < 90 ? C.amber : C.green, fontSize: '1.4rem', fontWeight: 600, letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums' }}>
                  {daysToDeadline.toLocaleString('en-GB')}
                </div>
                <div style={{ color: C.muted, fontSize: '0.65rem' }}>days remaining</div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
