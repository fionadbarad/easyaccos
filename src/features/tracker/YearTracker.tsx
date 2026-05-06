'use client'

// Year-round projection: uses actual logged income/expenses to estimate the
// January 2028 SA bill, tracks pot progress, surfaces shortfall + monthly
// savings needed. Aggregation math is in aggregates.ts (unit-tested).

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { TrendingDown, Minus, Calendar, AlertTriangle, CheckCircle } from 'lucide-react'
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

  const projectedTax = useMemo(() => {
    if (projectedIncome <= 0) return null
    return calculateTax({
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
  }, [projectedIncome, projectedExpenses, empType, region, slPlan, monthlyPensionNum])

  const projectedBill   = projectedTax ? Math.round(projectedTax.totalDeductions) : 0
  const savedSoFar      = parseFloat(potSaved || '0')
  const gap             = potShortfall(projectedBill, savedSoFar)
  const monthsRemaining = clamp(12 - monthsElapsed, 0, 12)
  const monthlyNeeded   = monthlyNeededToClose(gap, monthsRemaining)
  const isOnTrack       = gap <= 0

  const loading = txLoading || expLoading

  return (
    <div className="bg-[var(--sa-surface)] border border-[var(--sa-border)] rounded-[6px] overflow-hidden">
      <div className="px-6 py-5 border-b border-[var(--sa-border)] flex items-start justify-between gap-[1rem] flex-wrap">
        <div>
          <div className="flex items-center gap-[8px] mb-[3px]">
            <Calendar size={14} className="text-[rgba(244,245,248,0.42)]" />
            <span className="text-[var(--sa-white)] text-[0.9rem] font-semibold tracking-[-0.02em]">2026/27 Tax Year Tracker</span>
          </div>
          <div className="text-[rgba(244,245,248,0.42)] text-[0.72rem]">Live projection of your January 2028 Self Assessment bill</div>
        </div>
        <button
          onClick={() => setShowSetup(o => !o)}
          className="bg-transparent border border-[var(--sa-border)] rounded-[4px] px-[10px] py-[5px] cursor-pointer text-[rgba(244,245,248,0.42)] text-[0.72rem] font-mono uppercase tracking-[0.08em] whitespace-nowrap transition-all duration-150 ease-in-out"
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(244,245,248,0.3)'; (e.currentTarget as HTMLElement).style.color = 'var(--sa-white)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--sa-border)'; (e.currentTarget as HTMLElement).style.color = 'rgba(244,245,248,0.42)' }}
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
            className="overflow-hidden border-b border-[var(--sa-border)]"
          >
            <div className="px-6 py-5 grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-[1rem]">
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
                  onBlur={e  => (e.target as HTMLInputElement).style.borderColor = 'var(--sa-border)'}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="p-6 flex flex-col gap-[1.5rem]">

        <div>
          <div className="flex justify-between mb-[8px]">
            <span className="text-[rgba(244,245,248,0.18)] text-[0.65rem] font-mono uppercase tracking-[0.08em]">
              Tax year progress — 6 Apr 2026 → 5 Apr 2027
            </span>
            <span className="text-[var(--sa-white)] text-[0.65rem] font-mono font-semibold">
              {Math.round(yearProgress * 100)}% · {daysElapsed}d elapsed
            </span>
          </div>
          <div className="h-[4px] bg-[var(--sa-gray)] rounded-[2px] overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${yearProgress * 100}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
              style={{ height: '100%', background: yearProgress > 0.75 ? '#FBBF24' : 'var(--sa-white)', borderRadius: '2px' }}
            />
          </div>
          <div className="flex justify-between mt-[5px]">
            <span className="text-[rgba(244,245,248,0.18)] text-[0.6rem] font-mono">Apr 2026</span>
            <span className="text-[rgba(244,245,248,0.18)] text-[0.6rem] font-mono">Apr 2027</span>
          </div>
        </div>

        {loading ? (
          <div className="text-[rgba(244,245,248,0.18)] text-[0.78rem] font-mono">Loading transactions…</div>
        ) : (
          <>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(130px,1fr))] gap-[1px] border border-[var(--sa-border)] rounded-[6px] overflow-hidden bg-[var(--sa-border)]">
              {[
                { label: 'Income this year',      value: fmt(yearIncome),            sub: 'from logged transactions' },
                { label: 'Expenses this year',    value: fmt(yearExpenses),          sub: 'from logged expenses' },
                { label: 'Projected annual',      value: fmt(projectedIncome),       sub: `based on ${monthsElapsed.toFixed(1)}mo data` },
                { label: 'Projected net profit',  value: fmt(Math.max(0, projectedIncome - projectedExpenses - monthlyPensionNum * 12)), sub: 'after expenses & pension' },
              ].map(({ label, value, sub }) => (
                <div key={label} className="bg-[var(--sa-surface)] px-[1.1rem] py-[1rem]">
                  <div className="text-[rgba(244,245,248,0.18)] text-[0.58rem] uppercase tracking-[0.08em] font-semibold mb-[6px] font-mono">{label}</div>
                  <div className="text-[var(--sa-white)] text-[1.15rem] font-semibold tracking-[-0.03em] tabular-nums leading-none">{value}</div>
                  <div className="text-[rgba(244,245,248,0.18)] text-[0.6rem] mt-[4px]">{sub}</div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-[1rem]">

              <div className="bg-[var(--sa-black)] border border-[var(--sa-border)] rounded-[6px] px-[1.25rem] py-[1.1rem]">
                <div className="text-[rgba(244,245,248,0.18)] text-[0.6rem] uppercase tracking-[0.1em] font-semibold mb-[1rem] font-mono">Projected tax bill (Jan 2028)</div>
                {projectedTax ? (
                  <>
                    <div className="text-[var(--sa-white)] text-[1.8rem] font-semibold tracking-[-0.04em] leading-none tabular-nums mb-[1rem]">
                      {fmt(projectedBill)}
                    </div>
                    <div className="flex flex-col gap-0">
                      <Row label="Income Tax"       value={fmt(projectedTax.incomeTax)} />
                      {projectedTax.niClass4 > 0 && <Row label="NI Class 4"    value={fmt(projectedTax.niClass4)} />}
                      {projectedTax.niClass1 > 0 && <Row label="NI Class 1"    value={fmt(projectedTax.niClass1)} />}
                      {projectedTax.studentLoanRepayment > 0 && <Row label="Student Loan" value={fmt(projectedTax.studentLoanRepayment)} />}
                      <div className="flex justify-between pt-[8px]">
                        <span className="text-[rgba(244,245,248,0.42)] text-[0.72rem]">Effective rate</span>
                        <span className="text-[var(--sa-white)] text-[0.72rem] font-mono">{projectedTax.effectiveTaxRate.toFixed(1)}%</span>
                      </div>
                    </div>
                    {projectedTax.sixtyPercentTrap && (
                      <div className="mt-[0.75rem] px-[10px] py-[8px] bg-[rgba(251,191,36,0.06)] border border-[rgba(251,191,36,0.2)] rounded-[4px] flex gap-[7px]">
                        <AlertTriangle size={11} className="text-[#FBBF24] shrink-0 mt-[1px]" />
                        <span className="text-[#FBBF24] text-[0.7rem] leading-[1.5]">60% trap zone. Consider a pension contribution.</span>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-[rgba(244,245,248,0.18)] text-[0.78rem] leading-[1.6]">
                    No transactions logged yet.<br />
                    Add income to the Ledger to see your projection.
                  </div>
                )}
              </div>

              <div className="bg-[var(--sa-black)] border border-[var(--sa-border)] rounded-[6px] px-[1.25rem] py-[1.1rem] flex flex-col gap-[1rem]">
                <div className="text-[rgba(244,245,248,0.18)] text-[0.6rem] uppercase tracking-[0.1em] font-semibold font-mono">Your tax pot</div>

                <div>
                  <Label>Amount saved so far</Label>
                  <input
                    type="number" min={0} placeholder="0"
                    value={potSaved} onChange={e => setPotSaved(e.target.value)}
                    style={inputStyle}
                    onFocus={e => (e.target as HTMLInputElement).style.borderColor = 'rgba(244,245,248,0.3)'}
                    onBlur={e  => (e.target as HTMLInputElement).style.borderColor = 'var(--sa-border)'}
                  />
                  <div className="text-[rgba(244,245,248,0.18)] text-[0.65rem] mt-[5px]">Enter what&apos;s currently in your tax savings pot</div>
                </div>

                {projectedTax && (
                  <div>
                    <div className="mb-[10px]">
                      <div className="flex justify-between mb-[6px]">
                        <span className="text-[rgba(244,245,248,0.42)] text-[0.7rem]">Pot filled</span>
                        <span className="text-[var(--sa-white)] text-[0.7rem] font-mono">
                          {Math.min(100, Math.round((savedSoFar / Math.max(projectedBill, 1)) * 100))}%
                        </span>
                      </div>
                      <div className="h-[6px] bg-[var(--sa-gray)] rounded-[3px] overflow-hidden">
                        <motion.div
                          animate={{ width: `${Math.min(100, (savedSoFar / Math.max(projectedBill, 1)) * 100)}%` }}
                          transition={{ duration: 0.4, ease: 'easeOut' }}
                          style={{ height: '100%', background: isOnTrack ? '#4ADE80' : savedSoFar / Math.max(projectedBill, 1) > 0.7 ? '#FBBF24' : '#F87171', borderRadius: '3px' }}
                        />
                      </div>
                    </div>

                    <motion.div
                      key={isOnTrack ? 'good' : 'bad'}
                      initial={{ opacity: 0, scale: 0.97 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className={`px-[14px] py-[12px] rounded-[6px] flex items-start gap-[10px] ${isOnTrack ? 'bg-[rgba(74,222,128,0.06)] border border-[rgba(74,222,128,0.2)]' : 'bg-[rgba(248,113,113,0.06)] border border-[rgba(248,113,113,0.2)]'}`}
                    >
                      {isOnTrack
                        ? <CheckCircle size={14} className="text-[#4ADE80] shrink-0 mt-[1px]" />
                        : gap > 0
                          ? <TrendingDown size={14} className="text-[#F87171] shrink-0 mt-[1px]" />
                          : <Minus size={14} className="text-[rgba(244,245,248,0.42)] shrink-0 mt-[1px]" />
                      }
                      <div>
                        {isOnTrack ? (
                          <>
                            <div className="text-[#4ADE80] text-[0.82rem] font-semibold mb-[2px]">You&apos;re covered</div>
                            <div className="text-[rgba(244,245,248,0.42)] text-[0.72rem] leading-[1.5]">
                              Surplus of {fmt(Math.abs(gap))} — you have more than enough set aside.
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="text-[#F87171] text-[0.82rem] font-semibold mb-[2px]">
                              Shortfall: {fmt(gap)}
                            </div>
                            <div className="text-[rgba(244,245,248,0.42)] text-[0.72rem] leading-[1.5]">
                              {monthsRemaining > 0
                                ? <>Save <strong className="text-[var(--sa-white)]">{fmt(monthlyNeeded)}/month</strong> for the next {Math.round(monthsRemaining)} months to cover your bill.</>
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

            <div className="bg-[var(--sa-gray)] rounded-[6px] px-[1.25rem] py-[1rem] flex items-center justify-between flex-wrap gap-[0.75rem] border border-[var(--sa-border)]">
              <div>
                <div className="text-[rgba(244,245,248,0.18)] text-[0.6rem] uppercase tracking-[0.1em] font-semibold font-mono mb-[3px]">Self Assessment deadline</div>
                <div className="text-[var(--sa-white)] text-[0.9rem] font-semibold tracking-[-0.02em]">31 January 2028</div>
              </div>
              <div className="text-right">
                <div
                  className="text-[1.4rem] font-semibold tracking-[-0.03em] tabular-nums"
                  style={{ color: daysToDeadline < 30 ? '#F87171' : daysToDeadline < 90 ? '#FBBF24' : '#4ADE80' }}
                >
                  {daysToDeadline.toLocaleString('en-GB')}
                </div>
                <div className="text-[rgba(244,245,248,0.42)] text-[0.65rem]">days remaining</div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
