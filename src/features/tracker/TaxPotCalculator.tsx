'use client'

// Standalone widget: user enters this month's gross/expenses, picks employment
// mode, sees the monthly tax pot to set aside. All arithmetic flows through
// calculateTax so numbers match the rest of the app.

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { PiggyBank, AlertTriangle, ChevronDown } from 'lucide-react'
import { calculateTax } from '@/lib/tax-engine'
import type { EmploymentType, StudentLoanPlan, TaxRegion } from '@/lib/tax-engine'
import { fmt } from './shared'
import { Label, Select, Row, inputStyle } from './controls'

export default function TaxPotCalculator() {
  const [income, setIncome] = useState('')
  const [expenses, setExpenses] = useState('')
  const [empType, setEmpType] = useState<EmploymentType>('self-employed')
  const [region, setRegion] = useState<TaxRegion>('ruk')
  const [slPlan, setSlPlan] = useState<StudentLoanPlan>('none')
  const [pension, setPension] = useState('')
  const [showOptions, setShowOptions] = useState(false)

  const result = useMemo(() => {
    const monthlyIncome   = parseFloat(income   || '0')
    const monthlyExpenses = parseFloat(expenses || '0')
    const monthlyPension  = parseFloat(pension  || '0')
    if (monthlyIncome <= 0) return null

    return calculateTax({
      grossRevenue: monthlyIncome   * 12,
      allowableExpenses: monthlyExpenses * 12,
      dividendIncome: 0,
      employmentType: empType,
      taxRegion: region,
      studentLoanPlan: slPlan,
      voluntaryClass2NI: false,
      marriageAllowance: false,
      blindPersonsAllowance: false,
      pensionContribution: monthlyPension  * 12,
    })
  }, [income, expenses, empType, region, slPlan, pension])

  const monthlyIncomeTax = result ? Math.round(result.incomeTax    / 12) : 0
  const monthlyNI        = result ? Math.round((result.niClass1 + result.niClass4 + result.niClass2) / 12) : 0
  const monthlySL        = result ? Math.round(result.studentLoanRepayment / 12) : 0
  const monthlyPot       = monthlyIncomeTax + monthlyNI + monthlySL
  const monthlyTakeHome  = result ? Math.round(result.netTakeHome / 12) : 0
  const hasResult        = result !== null

  return (
    <div className="bg-[var(--sa-surface)] border border-[var(--sa-border)] rounded-md overflow-hidden">
      <div className="px-6 py-5 border-b border-[var(--sa-border)]">
        <div className="flex items-center gap-2 mb-[3px]">
          <PiggyBank size={14} className="text-[rgba(244,245,248,0.42)]" />
          <span className="text-[var(--sa-white)] text-[0.9rem] font-semibold tracking-[-0.02em]">Tax Pot Calculator</span>
        </div>
        <div className="text-[rgba(244,245,248,0.42)] text-[0.72rem]">How much to set aside from this month&apos;s earnings</div>
      </div>

      <div className="p-6 grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-8">

        <div className="flex flex-col gap-4">
          <div>
            <Label>This month&apos;s gross income</Label>
            <input
              type="number" min={0} placeholder="e.g. 4500"
              value={income} onChange={e => setIncome(e.target.value)}
              style={inputStyle}
              onFocus={e => (e.target as HTMLInputElement).style.borderColor = 'rgba(244,245,248,0.3)'}
              onBlur={e  => (e.target as HTMLInputElement).style.borderColor = 'var(--sa-border)'}
            />
          </div>
          <div>
            <Label>Allowable expenses this month</Label>
            <input
              type="number" min={0} placeholder="e.g. 800"
              value={expenses} onChange={e => setExpenses(e.target.value)}
              style={inputStyle}
              onFocus={e => (e.target as HTMLInputElement).style.borderColor = 'rgba(244,245,248,0.3)'}
              onBlur={e  => (e.target as HTMLInputElement).style.borderColor = 'var(--sa-border)'}
            />
          </div>

          <button
            onClick={() => setShowOptions(o => !o)}
            className="bg-transparent border-none p-0 cursor-pointer flex items-center gap-[5px] text-[rgba(244,245,248,0.18)] text-[0.72rem] font-mono uppercase tracking-[0.08em] w-fit"
          >
            <ChevronDown size={11} className={`transition-transform duration-200 ${showOptions ? 'rotate-180' : ''}`} />
            {showOptions ? 'Hide' : 'Customise'} (employment, region, student loan, pension)
          </button>

          <AnimatePresence>
            {showOptions && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden flex flex-col gap-[0.85rem]"
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
                    { value: 'plan1',        label: 'Plan 1 - £26,900 threshold' },
                    { value: 'plan2',        label: 'Plan 2 - £29,385 threshold' },
                    { value: 'plan4',        label: 'Plan 4 - £33,795 (Scotland)' },
                    { value: 'plan5',        label: 'Plan 5 - £25,000 threshold' },
                    { value: 'postgraduate', label: 'Postgraduate - £21,000 (6%)' },
                  ]} />
                </div>
                <div>
                  <Label>Monthly pension contribution (SIPP)</Label>
                  <input
                    type="number" min={0} placeholder="e.g. 200"
                    value={pension} onChange={e => setPension(e.target.value)}
                    style={inputStyle}
                    onFocus={e => (e.target as HTMLInputElement).style.borderColor = 'rgba(244,245,248,0.3)'}
                    onBlur={e  => (e.target as HTMLInputElement).style.borderColor = 'var(--sa-border)'}
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
                className="h-full flex items-center justify-center min-h-[180px]">
                <div className="text-center">
                  <div className="text-[rgba(244,245,248,0.18)] text-[0.78rem]">Enter this month&apos;s income</div>
                  <div className="text-[rgba(244,245,248,0.08)] text-[0.65rem] mt-1 font-mono">to calculate your tax pot</div>
                </div>
              </motion.div>
            ) : (
              <motion.div key="result" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <div className="bg-[var(--sa-gray)] rounded-md p-5 mb-4 border border-[var(--sa-border)]">
                  <div className="text-[rgba(244,245,248,0.18)] text-[0.6rem] uppercase tracking-[0.1em] font-semibold mb-1.5 font-mono">
                    Set aside this month
                  </div>
                  <motion.div
                    key={monthlyPot}
                    initial={{ scale: 0.97 }}
                    animate={{ scale: 1 }}
                    className="text-[2.4rem] font-semibold tracking-[-0.04em] leading-none tabular-nums"
                    style={{ color: monthlyPot > 0 ? '#FBBF24' : 'var(--sa-white)' }}
                  >
                    {fmt(monthlyPot)}
                  </motion.div>
                  <div className="text-[rgba(244,245,248,0.42)] text-[0.7rem] mt-1.5">
                    {result?.effectiveTaxRate.toFixed(1)}% effective rate · {fmt(monthlyTakeHome)}/mo take-home
                  </div>
                </div>

                <div className="bg-[var(--sa-black)] border border-[var(--sa-border)] rounded-md px-[1rem] py-0">
                  <Row label="Income Tax"   value={monthlyIncomeTax > 0 ? `${fmt(monthlyIncomeTax)}/mo` : '-'} />
                  {result && result.niClass4 > 0 && <Row label="NI Class 4 (SE)"  value={`${fmt(Math.round(result.niClass4 / 12))}/mo`} />}
                  {result && result.niClass1 > 0 && <Row label="NI Class 1 (PAYE)" value={`${fmt(Math.round(result.niClass1 / 12))}/mo`} />}
                  {result && result.niClass2 > 0 && <Row label="NI Class 2"        value={`${fmt(Math.round(result.niClass2 / 12))}/mo`} />}
                  {result && result.studentLoanRepayment > 0 && <Row label="Student Loan" value={`${fmt(monthlySL)}/mo`} />}
                  <div className="flex justify-between items-center py-[10px]">
                    <span className="text-[var(--sa-white)] text-[0.82rem] font-semibold">Monthly pot total</span>
                    <span className="text-[var(--sa-white)] text-[0.82rem] font-semibold font-mono">{fmt(monthlyPot)}</span>
                  </div>
                </div>

                {result?.sixtyPercentTrap && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-3 px-[12px] py-[10px] bg-[rgba(251,191,36,0.06)] border border-[rgba(251,191,36,0.2)] rounded flex gap-2 items-start">
                    <AlertTriangle size={13} className="text-[#FBBF24] shrink-0 mt-[1px]" />
                    <div className="text-[#FBBF24] text-xs leading-[1.5]">
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
