'use client'

import { useState, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { TrendingUp, TrendingDown, Minus, PiggyBank, Calendar, AlertTriangle, CheckCircle, ChevronDown } from 'lucide-react'
import { calculateTax } from '@/lib/tax-engine'
import type { EmploymentType, StudentLoanPlan, TaxRegion } from '@/lib/tax-engine'
import { useUserData } from '@/lib/use-user-data'

// ── Design tokens ─────────────────────────────────────────────────────────────
import { C } from '@/styles/palette'
// ── Tax year constants ────────────────────────────────────────────────────────
const TAX_YEAR_START = new Date('2026-04-06')
const TAX_YEAR_END   = new Date('2027-04-05')
const SA_DEADLINE    = new Date('2028-01-31')
const TAX_YEAR_DAYS  = Math.ceil((TAX_YEAR_END.getTime() - TAX_YEAR_START.getTime()) / 86400000)

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(n: number) {
  return '£' + Math.round(Math.abs(n)).toLocaleString('en-GB')
}
function fmtDec(n: number) {
  return '£' + Math.abs(n).toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}
function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n))
}
function inTaxYear(dateStr: string) {
  const d = new Date(dateStr)
  return d >= TAX_YEAR_START && d <= TAX_YEAR_END
}

// ── Shared input style ────────────────────────────────────────────────────────
const inputStyle: React.CSSProperties = {
  width: '100%',
  background: C.gray,
  border: `1px solid ${C.border}`,
  borderRadius: '4px',
  color: C.white,
  padding: '10px 12px',
  fontSize: '0.875rem',
  outline: 'none',
  fontFamily: 'var(--font-geist-mono), monospace',
  fontVariantNumeric: 'tabular-nums',
  transition: 'border-color 0.15s',
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ color: C.dim, fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, marginBottom: '5px', fontFamily: 'var(--font-geist-mono), monospace' }}>
      {children}
    </div>
  )
}

function Select({ value, onChange, options }: {
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <div style={{ position: 'relative' }}>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{ ...inputStyle, appearance: 'none', paddingRight: '32px', cursor: 'pointer' }}
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <ChevronDown size={13} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: C.muted, pointerEvents: 'none' }} />
    </div>
  )
}

// ── Big stat display ──────────────────────────────────────────────────────────
function BigStat({ label, value, color = C.white, sub }: {
  label: string; value: string; color?: string; sub?: string
}) {
  return (
    <div>
      <div style={{ color: C.dim, fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, marginBottom: '4px', fontFamily: 'var(--font-geist-mono), monospace' }}>
        {label}
      </div>
      <motion.div
        key={value}
        initial={{ opacity: 0.4, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        style={{ color, fontSize: '1.65rem', fontWeight: 600, letterSpacing: '-0.04em', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}
      >
        {value}
      </motion.div>
      {sub && <div style={{ color: C.muted, fontSize: '0.7rem', marginTop: '4px' }}>{sub}</div>}
    </div>
  )
}

// ── Breakdown row ─────────────────────────────────────────────────────────────
function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: `1px solid ${C.border}` }}>
      <span style={{ color: C.muted, fontSize: '0.82rem' }}>{label}</span>
      <span style={{ color: highlight ? C.white : C.muted, fontWeight: highlight ? 600 : 400, fontSize: '0.82rem', fontFamily: 'var(--font-geist-mono), monospace', fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </span>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ── SECTION 1: TAX POT CALCULATOR ────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
function TaxPotCalculator() {
  const [income,      setIncome]      = useState('')
  const [expenses,    setExpenses]    = useState('')
  const [empType,     setEmpType]     = useState<EmploymentType>('self-employed')
  const [region,      setRegion]      = useState<TaxRegion>('ruk')
  const [slPlan,      setSlPlan]      = useState<StudentLoanPlan>('none')
  const [pension,     setPension]     = useState('')
  const [showOptions, setShowOptions] = useState(false)

  const result = useMemo(() => {
    const monthlyIncome   = parseFloat(income   || '0')
    const monthlyExpenses = parseFloat(expenses || '0')
    const monthlyPension  = parseFloat(pension  || '0')
    if (monthlyIncome <= 0) return null

    // Annualise, compute tax, return monthly share
    return calculateTax({
      grossRevenue:          monthlyIncome   * 12,
      allowableExpenses:     monthlyExpenses * 12,
      dividendIncome:        0,
      employmentType:        empType,
      taxRegion:             region,
      studentLoanPlan:       slPlan,
      voluntaryClass2NI:     false,
      marriageAllowance:     false,
      blindPersonsAllowance: false,
      pensionContribution:   monthlyPension  * 12,
    })
  }, [income, expenses, empType, region, slPlan, pension])

  const monthlyIncomeTax = result ? Math.round(result.incomeTax    / 12) : 0
  const monthlyNI        = result ? Math.round((result.niClass1 + result.niClass4 + result.niClass2) / 12) : 0
  const monthlySL        = result ? Math.round(result.studentLoanRepayment / 12) : 0
  const monthlyPot       = monthlyIncomeTax + monthlyNI + monthlySL
  const monthlyTakeHome  = result ? Math.round(result.netTakeHome / 12) : 0
  const hasResult        = result !== null

  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: '6px', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '1.25rem 1.5rem', borderBottom: `1px solid ${C.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
          <PiggyBank size={14} style={{ color: C.muted }} />
          <span style={{ color: C.white, fontSize: '0.9rem', fontWeight: 600, letterSpacing: '-0.02em' }}>Tax Pot Calculator</span>
        </div>
        <div style={{ color: C.muted, fontSize: '0.72rem' }}>How much to set aside from this month's earnings</div>
      </div>

      <div style={{ padding: '1.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem' }}>

        {/* ── Inputs ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <Label>This month's gross income</Label>
            <input
              type="number" min={0} placeholder="e.g. 4500"
              value={income} onChange={e => setIncome(e.target.value)}
              style={inputStyle}
              onFocus={e => (e.target as HTMLInputElement).style.borderColor = 'rgba(244,245,248,0.3)'}
              onBlur={e  => (e.target as HTMLInputElement).style.borderColor = C.border}
            />
          </div>
          <div>
            <Label>Allowable expenses this month</Label>
            <input
              type="number" min={0} placeholder="e.g. 800"
              value={expenses} onChange={e => setExpenses(e.target.value)}
              style={inputStyle}
              onFocus={e => (e.target as HTMLInputElement).style.borderColor = 'rgba(244,245,248,0.3)'}
              onBlur={e  => (e.target as HTMLInputElement).style.borderColor = C.border}
            />
          </div>

          {/* Advanced options toggle */}
          <button
            onClick={() => setShowOptions(o => !o)}
            style={{ background: 'none', border: 'none', padding: '0', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', color: C.dim, fontSize: '0.72rem', fontFamily: 'var(--font-geist-mono), monospace', textTransform: 'uppercase', letterSpacing: '0.08em', width: 'fit-content' }}
          >
            <ChevronDown size={11} style={{ transform: showOptions ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
            {showOptions ? 'Hide' : 'Customise'} (employment, region, student loan, pension)
          </button>

          <AnimatePresence>
            {showOptions && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}
              >
                <div>
                  <Label>Employment type</Label>
                  <Select value={empType} onChange={v => setEmpType(v as EmploymentType)} options={[
                    { value: 'self-employed', label: 'Self-Employed' },
                    { value: 'employed',      label: 'Employed (PAYE)' },
                    { value: 'director',      label: 'Director / Ltd Company' },
                  ]} />
                </div>
                <div>
                  <Label>Tax region</Label>
                  <Select value={region} onChange={v => setRegion(v as TaxRegion)} options={[
                    { value: 'ruk',      label: 'England / Wales / N. Ireland' },
                    { value: 'scotland', label: 'Scotland' },
                  ]} />
                </div>
                <div>
                  <Label>Student loan plan</Label>
                  <Select value={slPlan} onChange={v => setSlPlan(v as StudentLoanPlan)} options={[
                    { value: 'none',         label: 'None' },
                    { value: 'plan1',        label: 'Plan 1 — £26,900 threshold' },
                    { value: 'plan2',        label: 'Plan 2 — £29,385 threshold' },
                    { value: 'plan4',        label: 'Plan 4 — £33,795 (Scotland)' },
                    { value: 'plan5',        label: 'Plan 5 — £25,000 threshold' },
                    { value: 'postgraduate', label: 'Postgraduate — £21,000 (6%)' },
                  ]} />
                </div>
                <div>
                  <Label>Monthly pension contribution (SIPP)</Label>
                  <input
                    type="number" min={0} placeholder="e.g. 200"
                    value={pension} onChange={e => setPension(e.target.value)}
                    style={inputStyle}
                    onFocus={e => (e.target as HTMLInputElement).style.borderColor = 'rgba(244,245,248,0.3)'}
                    onBlur={e  => (e.target as HTMLInputElement).style.borderColor = C.border}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Result ── */}
        <div>
          <AnimatePresence mode="wait">
            {!hasResult ? (
              <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '180px' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ color: C.dim, fontSize: '0.78rem' }}>Enter this month's income</div>
                  <div style={{ color: 'rgba(244,245,248,0.08)', fontSize: '0.65rem', marginTop: '4px', fontFamily: 'var(--font-geist-mono), monospace' }}>to calculate your tax pot</div>
                </div>
              </motion.div>
            ) : (
              <motion.div key="result" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                {/* Big number */}
                <div style={{ background: C.gray, borderRadius: '6px', padding: '1.25rem', marginBottom: '1rem', border: `1px solid ${C.border}` }}>
                  <div style={{ color: C.dim, fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, marginBottom: '6px', fontFamily: 'var(--font-geist-mono), monospace' }}>
                    Set aside this month
                  </div>
                  <motion.div
                    key={monthlyPot}
                    initial={{ scale: 0.97 }}
                    animate={{ scale: 1 }}
                    style={{ color: monthlyPot > 0 ? C.amber : C.white, fontSize: '2.4rem', fontWeight: 600, letterSpacing: '-0.04em', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}
                  >
                    {fmt(monthlyPot)}
                  </motion.div>
                  <div style={{ color: C.muted, fontSize: '0.7rem', marginTop: '6px' }}>
                    {result?.effectiveTaxRate.toFixed(1)}% effective rate · {fmt(monthlyTakeHome)}/mo take-home
                  </div>
                </div>

                {/* Breakdown */}
                <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: '6px', padding: '0 1rem' }}>
                  <Row label="Income Tax"   value={monthlyIncomeTax > 0 ? `${fmt(monthlyIncomeTax)}/mo` : '—'} />
                  {result?.niClass4 > 0 && <Row label="NI Class 4 (SE)"  value={`${fmt(Math.round(result.niClass4 / 12))}/mo`} />}
                  {result?.niClass1 > 0 && <Row label="NI Class 1 (PAYE)" value={`${fmt(Math.round(result.niClass1 / 12))}/mo`} />}
                  {result?.niClass2 > 0 && <Row label="NI Class 2"        value={`${fmt(Math.round(result.niClass2 / 12))}/mo`} />}
                  {result?.studentLoanRepayment > 0 && <Row label="Student Loan" value={`${fmt(monthlySL)}/mo`} />}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0' }}>
                    <span style={{ color: C.white, fontSize: '0.82rem', fontWeight: 600 }}>Monthly pot total</span>
                    <span style={{ color: C.white, fontSize: '0.82rem', fontWeight: 600, fontFamily: 'var(--font-geist-mono), monospace' }}>{fmt(monthlyPot)}</span>
                  </div>
                </div>

                {/* 60% trap warning */}
                {result?.sixtyPercentTrap && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ marginTop: '0.75rem', padding: '10px 12px', background: 'rgba(251,191,36,0.06)', border: `1px solid rgba(251,191,36,0.2)`, borderRadius: '4px', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                    <AlertTriangle size={13} style={{ color: C.amber, flexShrink: 0, marginTop: '1px' }} />
                    <div style={{ color: C.amber, fontSize: '0.75rem', lineHeight: 1.5 }}>
                      <strong>60% trap detected.</strong> At this income level your Personal Allowance tapers, creating ~60% effective marginal rate. A pension contribution can eliminate this.
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ── SECTION 2: YEAR-ROUND TAX TRACKER ────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

interface Transaction { id: string; date: string; type: string; amount: number }
interface Expense     { id: string; date: string; amount: number }

function YearTracker() {
  const today = new Date()

  // Days elapsed in tax year
  const daysElapsed = clamp(Math.ceil((today.getTime() - TAX_YEAR_START.getTime()) / 86400000), 0, TAX_YEAR_DAYS)
  const yearProgress = clamp(daysElapsed / TAX_YEAR_DAYS, 0, 1)
  const monthsElapsed = clamp(daysElapsed / 30.44, 0, 12)

  // Days until SA deadline
  const daysToDeadline = Math.max(0, Math.ceil((SA_DEADLINE.getTime() - today.getTime()) / 86400000))

  // ── Load data ──────────────────────────────────────────────────────────────
  const { items: transactions, loading: txLoading } = useUserData<Transaction>('user_transactions', 'ea_transactions', [])
  const { items: expenses,     loading: expLoading  } = useUserData<Expense>('user_expenses', 'ea_expenses', [])

  // ── Settings ───────────────────────────────────────────────────────────────
  const [empType,   setEmpType]   = useState<EmploymentType>('self-employed')
  const [region,    setRegion]    = useState<TaxRegion>('ruk')
  const [slPlan,    setSlPlan]    = useState<StudentLoanPlan>('none')
  const [pension,   setPension]   = useState('')
  const [potSaved,  setPotSaved]  = useState('')
  const [showSetup, setShowSetup] = useState(false)

  // ── Aggregate tax-year figures ─────────────────────────────────────────────
  const yearlyIncome = useMemo(() =>
    transactions.filter(t => t.type === 'income' && inTaxYear(t.date))
      .reduce((s, t) => s + Number(t.amount), 0),
  [transactions])

  const yearlyExpenses = useMemo(() =>
    expenses.filter(e => inTaxYear(e.date))
      .reduce((s, e) => s + Number(e.amount), 0),
  [expenses])

  // ── Project full-year figures ──────────────────────────────────────────────
  const projectedIncome   = monthsElapsed > 0 ? (yearlyIncome   / monthsElapsed) * 12 : 0
  const projectedExpenses = monthsElapsed > 0 ? (yearlyExpenses / monthsElapsed) * 12 : 0
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

  const projectedBill      = projectedTax ? Math.round(projectedTax.totalDeductions) : 0
  const savedSoFar         = parseFloat(potSaved || '0')
  const gap                = projectedBill - savedSoFar
  const monthsRemaining    = clamp(12 - monthsElapsed, 0, 12)
  const monthlyNeeded      = monthsRemaining > 0 ? Math.round(gap / monthsRemaining) : 0
  const isOnTrack          = gap <= 0

  const loading = txLoading || expLoading

  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: '6px', overflow: 'hidden' }}>
      {/* Header */}
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

      {/* Setup panel */}
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

        {/* ── Year progress bar ── */}
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

        {/* ── Income/Expense stats ── */}
        {loading ? (
          <div style={{ color: C.dim, fontSize: '0.78rem', fontFamily: 'var(--font-geist-mono), monospace' }}>Loading transactions…</div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '1px', border: `1px solid ${C.border}`, borderRadius: '6px', overflow: 'hidden', background: C.border }}>
              {[
                { label: 'Income this year',      value: fmt(yearlyIncome),            sub: 'from logged transactions' },
                { label: 'Expenses this year',    value: fmt(yearlyExpenses),           sub: 'from logged expenses' },
                { label: 'Projected annual',      value: fmt(projectedIncome),          sub: `based on ${monthsElapsed.toFixed(1)}mo data` },
                { label: 'Projected net profit',  value: fmt(Math.max(0, projectedIncome - projectedExpenses - monthlyPensionNum * 12)), sub: 'after expenses & pension' },
              ].map(({ label, value, sub }) => (
                <div key={label} style={{ background: C.surface, padding: '1rem 1.1rem' }}>
                  <div style={{ color: C.dim, fontSize: '0.58rem', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, marginBottom: '6px', fontFamily: 'var(--font-geist-mono), monospace' }}>{label}</div>
                  <div style={{ color: C.white, fontSize: '1.15rem', fontWeight: 600, letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>{value}</div>
                  <div style={{ color: C.dim, fontSize: '0.6rem', marginTop: '4px' }}>{sub}</div>
                </div>
              ))}
            </div>

            {/* ── Projected tax bill + gap ── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>

              {/* Projected bill breakdown */}
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

              {/* Pot tracker */}
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
                  <div style={{ color: C.dim, fontSize: '0.65rem', marginTop: '5px' }}>Enter what's currently in your tax savings pot</div>
                </div>

                {projectedTax && (
                  <div>
                    {/* Pot fill bar */}
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

                    {/* Status pill */}
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
                            <div style={{ color: C.green, fontSize: '0.82rem', fontWeight: 600, marginBottom: '2px' }}>You're covered</div>
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

            {/* ── SA deadline countdown ── */}
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

// ─────────────────────────────────────────────────────────────────────────────
// ── PAGE ──────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
export default function TrackerPage() {
  return (
    <div style={{ padding: 'clamp(1.5rem, 4vw, 2.5rem)', maxWidth: '960px' }}>

      {/* Page header */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ color: 'rgba(244,245,248,0.18)', fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.15em', fontFamily: 'var(--font-geist-mono), monospace', marginBottom: '6px' }}>
          financial tools · 2026/27
        </div>
        <h1 style={{ color: C.white, fontSize: 'clamp(1.4rem, 3vw, 1.85rem)', fontWeight: 600, letterSpacing: '-0.04em', lineHeight: 1.1, margin: '0 0 6px' }}>
          Tax Tracker
        </h1>
        <p style={{ color: C.muted, fontSize: '0.875rem', lineHeight: 1.6, margin: 0, maxWidth: '48ch' }}>
          Know exactly what to set aside each month — and track your running tax bill across the full 2026/27 tax year.
        </p>
      </div>

      {/* Sections */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <TaxPotCalculator />
        <YearTracker />
      </div>
    </div>
  )
}
