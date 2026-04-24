'use client'

// Standalone widget: user enters this month's gross/expenses, picks employment
// mode, sees the monthly tax pot to set aside. All arithmetic flows through
// calculateTax so numbers match the rest of the app.

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { PiggyBank, AlertTriangle, ChevronDown } from 'lucide-react'
import { C } from '@/styles/palette'
import { calculateTax } from '@/lib/tax-engine'
import type { EmploymentType, StudentLoanPlan, TaxRegion } from '@/lib/tax-engine'
import { fmt } from './shared'
import { Label, Select, Row, inputStyle } from './controls'

export default function TaxPotCalculator() {
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
      <div style={{ padding: '1.25rem 1.5rem', borderBottom: `1px solid ${C.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
          <PiggyBank size={14} style={{ color: C.muted }} />
          <span style={{ color: C.white, fontSize: '0.9rem', fontWeight: 600, letterSpacing: '-0.02em' }}>Tax Pot Calculator</span>
        </div>
        <div style={{ color: C.muted, fontSize: '0.72rem' }}>How much to set aside from this month&apos;s earnings</div>
      </div>

      <div style={{ padding: '1.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem' }}>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <Label>This month&apos;s gross income</Label>
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

        <div>
          <AnimatePresence mode="wait">
            {!hasResult ? (
              <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '180px' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ color: C.dim, fontSize: '0.78rem' }}>Enter this month&apos;s income</div>
                  <div style={{ color: 'rgba(244,245,248,0.08)', fontSize: '0.65rem', marginTop: '4px', fontFamily: 'var(--font-geist-mono), monospace' }}>to calculate your tax pot</div>
                </div>
              </motion.div>
            ) : (
              <motion.div key="result" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
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

                <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: '6px', padding: '0 1rem' }}>
                  <Row label="Income Tax"   value={monthlyIncomeTax > 0 ? `${fmt(monthlyIncomeTax)}/mo` : '—'} />
                  {result && result.niClass4 > 0 && <Row label="NI Class 4 (SE)"  value={`${fmt(Math.round(result.niClass4 / 12))}/mo`} />}
                  {result && result.niClass1 > 0 && <Row label="NI Class 1 (PAYE)" value={`${fmt(Math.round(result.niClass1 / 12))}/mo`} />}
                  {result && result.niClass2 > 0 && <Row label="NI Class 2"        value={`${fmt(Math.round(result.niClass2 / 12))}/mo`} />}
                  {result && result.studentLoanRepayment > 0 && <Row label="Student Loan" value={`${fmt(monthlySL)}/mo`} />}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0' }}>
                    <span style={{ color: C.white, fontSize: '0.82rem', fontWeight: 600 }}>Monthly pot total</span>
                    <span style={{ color: C.white, fontSize: '0.82rem', fontWeight: 600, fontFamily: 'var(--font-geist-mono), monospace' }}>{fmt(monthlyPot)}</span>
                  </div>
                </div>

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
