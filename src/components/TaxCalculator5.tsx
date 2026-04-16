'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, ChevronUp, AlertTriangle, Info, Lightbulb, TrendingDown } from 'lucide-react'
import {
  calculateTax, STUDENT_LOAN_LABELS,
  type TaxInput, type TaxResult, type EmploymentType, type StudentLoanPlan, type TaxRegion,
} from '@/lib/tax-logic'
import {
  TB, fmtGBP, round2,
  calcScenario3, calcScenario4,
  type ScenarioResult, type S3Input, type S4Input,
} from '@/lib/TaxBible2026'

// ─── Palette ─────────────────────────────────────────────────────────────────
const C = {
  bg:     '#0B0E1A', deep:  '#050A14', card:  '#0F1420',
  gold:   '#FFD700', soft:  '#C2A368', text:  '#E5E7EB',
  muted:  'rgba(229,231,235,0.55)', border: 'rgba(255,215,0,0.18)',
  red:    '#FF6B6B', green: '#4ADE80', blue:  '#60A5FA',
}

// ─── Debounce hook ───────────────────────────────────────────────────────────
function useDebounce<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), ms)
    return () => clearTimeout(id)
  }, [value, ms])
  return debounced
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = fmtGBP
const pct = (n: number) => n.toFixed(1) + '%'

const labelStyle: React.CSSProperties = {
  display: 'block', color: C.muted, fontSize: '0.72rem',
  letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.4rem',
}
const inp: React.CSSProperties = {
  width: '100%', background: C.deep, border: `1px solid ${C.border}`,
  borderRadius: '6px', padding: '10px 13px', color: C.text,
  fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box',
  minHeight: '44px',
}
const cardStyle: React.CSSProperties = {
  background: C.card, border: `1px solid ${C.border}`,
  borderRadius: '10px', padding: '1.5rem',
}
const selectStyle: React.CSSProperties = {
  ...inp, appearance: 'none' as const, cursor: 'pointer',
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath d='M3 5l3 3 3-3' stroke='%23C2A368' stroke-width='1.5' fill='none'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center',
  paddingRight: '32px',
}
const toggleStyle = (active: boolean): React.CSSProperties => ({
  padding: '6px 14px', borderRadius: '6px', cursor: 'pointer',
  fontSize: '0.78rem', fontWeight: 600, minHeight: '36px',
  background: active ? 'rgba(255,215,0,0.12)' : 'transparent',
  border: `1px solid ${active ? C.gold : C.border}`,
  color: active ? C.gold : C.muted,
  transition: 'all 0.15s',
})

// ─── Reusable components ─────────────────────────────────────────────────────
function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: React.ReactNode }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      {children}
      {hint && <div style={{ marginTop: '4px' }}>{hint}</div>}
    </div>
  )
}

function NumInput({ value, onChange, min = 0, max = 9_999_999 }: { value: number; onChange: (v: number) => void; min?: number; max?: number }) {
  return (
    <input type="number" min={min} max={max} step={100} value={value || ''}
      onChange={(e) => onChange(Math.max(min, Math.min(max, Number(e.target.value) || 0)))}
      style={inp} />
  )
}

function Toggle({ label, active, onChange }: { label: string; active: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!active)} style={{
      display: 'flex', alignItems: 'center', gap: '8px',
      padding: '8px 14px', borderRadius: '6px', cursor: 'pointer',
      background: active ? 'rgba(74,222,128,0.08)' : 'transparent',
      border: `1px solid ${active ? C.green : C.border}`,
      color: active ? C.green : C.muted,
      fontSize: '0.8rem', fontWeight: 500, transition: 'all 0.15s',
      minHeight: '40px', width: '100%', textAlign: 'left',
    }}>
      <span style={{
        width: '16px', height: '16px', borderRadius: '3px', flexShrink: 0,
        background: active ? C.green : 'transparent',
        border: `1.5px solid ${active ? C.green : C.muted}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '10px', color: '#0B0E1A',
      }}>{active ? '✓' : ''}</span>
      {label}
    </button>
  )
}

// ─── What-If Slider ──────────────────────────────────────────────────────────
function WhatIfSlider({ income, onChange }: { income: number; onChange: (v: number) => void }) {
  const [local, setLocal] = useState(income)
  const debounced = useDebounce(local, 100)
  const prevDebounced = useRef(debounced)

  useEffect(() => {
    if (debounced !== prevDebounced.current) {
      prevDebounced.current = debounced
      onChange(debounced)
    }
  }, [debounced, onChange])

  useEffect(() => { setLocal(income) }, [income])

  return (
    <div style={{ ...cardStyle, marginBottom: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <span style={{ color: C.soft, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          What-If Income Slider
        </span>
        <span style={{ color: C.gold, fontWeight: 700, fontSize: '1.1rem' }}>{fmt(local)}</span>
      </div>
      <input
        type="range" min={0} max={250_000} step={500} value={local}
        onChange={(e) => setLocal(Number(e.target.value))}
        style={{ width: '100%', accentColor: C.gold, cursor: 'pointer', height: '6px' }}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', color: C.muted, fontSize: '0.7rem', marginTop: '4px' }}>
        <span>£0</span><span>£50k</span><span>£100k</span><span>£150k</span><span>£200k+</span>
      </div>
      {local > 100_000 && local < 125_140 && (
        <div style={{ marginTop: '0.75rem', padding: '0.6rem 0.9rem', background: 'rgba(251,146,60,0.1)', border: '1px solid rgba(251,146,60,0.4)', borderRadius: '6px', color: '#FB923C', fontSize: '0.78rem' }}>
          60% Tax Trap active — every £2 over £100k costs £1 of Personal Allowance
        </div>
      )}
    </div>
  )
}

// ─── Result Display (Full Engine) ────────────────────────────────────────────
function FullResultPanel({ result, showMonthly, setShowMonthly }: {
  result: TaxResult; showMonthly: boolean; setShowMonthly: (v: boolean) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [tipsOpen, setTipsOpen] = useState(false)
  const m = result.monthly

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      {/* 60% trap warning */}
      {result.sixtyPercentTrap && (
        <div style={{ background: 'rgba(251,146,60,0.08)', border: '1px solid rgba(251,146,60,0.4)', borderRadius: '8px', padding: '0.85rem 1.1rem', marginBottom: '1.25rem', display: 'flex', gap: '0.6rem' }}>
          <AlertTriangle size={16} style={{ color: '#FB923C', flexShrink: 0, marginTop: '2px' }} />
          <div>
            <div style={{ color: '#FB923C', fontWeight: 700, fontSize: '0.85rem' }}>60% Tax Trap Active</div>
            <div style={{ color: C.text, fontSize: '0.8rem', marginTop: '2px', lineHeight: 1.5 }}>
              Income between £100k–£125,140. Each £2 earned = £1 of PA lost. Pension contributions are the escape route.
            </div>
          </div>
        </div>
      )}

      {/* MTD Warning */}
      {result.mtdWarning && (
        <div style={{ background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.3)', borderRadius: '8px', padding: '0.75rem 1rem', marginBottom: '1.25rem', display: 'flex', gap: '0.6rem' }}>
          <Info size={14} style={{ color: C.blue, flexShrink: 0, marginTop: '2px' }} />
          <div style={{ color: C.text, fontSize: '0.8rem', lineHeight: 1.5 }}>
            <strong style={{ color: C.blue }}>MTD for Income Tax</strong> — Gross revenue over £50k means you must file quarterly via Making Tax Digital from April 2026.
          </div>
        </div>
      )}

      {/* Annual / Monthly toggle */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.75rem', gap: '0.35rem' }}>
        <button onClick={() => setShowMonthly(false)} style={toggleStyle(!showMonthly)}>Annual</button>
        <button onClick={() => setShowMonthly(true)} style={toggleStyle(showMonthly)}>Monthly</button>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
        {[
          { label: 'Net Take-Home', value: fmt(showMonthly ? m.netTakeHome : result.netTakeHome), color: C.gold },
          { label: 'Total Deductions', value: fmt(showMonthly ? m.totalDeductions : result.totalDeductions), color: C.red },
          { label: 'Effective Rate', value: pct(result.effectiveTaxRate), color: C.blue },
          { label: 'Income Tax', value: fmt(showMonthly ? m.incomeTax : result.incomeTax), color: C.text },
        ].map((s) => (
          <div key={s.label} style={{ background: C.deep, border: `1px solid ${C.border}`, borderRadius: '8px', padding: '1rem' }}>
            <div style={{ color: C.muted, fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>{s.label}</div>
            <div style={{ color: s.color, fontWeight: 700, fontSize: '1.1rem' }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Detailed line items */}
      <div style={cardStyle}>
        <button onClick={() => setExpanded((v) => !v)}
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: expanded ? '1rem' : 0 }}>
          <span style={{ color: C.soft, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Full Breakdown {showMonthly ? '(Monthly)' : '(Annual)'}</span>
          {expanded ? <ChevronUp size={16} style={{ color: C.muted }} /> : <ChevronDown size={16} style={{ color: C.muted }} />}
        </button>
        <AnimatePresence>
          {expanded && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
              {(() => {
                const d = showMonthly ? 12 : 1
                const lines = [
                  { label: 'Gross Revenue',        value: result.grossRevenue / d,       bold: false, negative: false, indent: false },
                  { label: 'Allowable Expenses',   value: result.allowableExpenses / d,  bold: false, negative: true,  indent: true },
                  { label: 'Gross Profit',         value: result.grossProfit / d,        bold: true,  negative: false, indent: false },
                  { label: 'Pension Contribution',  value: result.pensionContribution / d, bold: false, negative: true, indent: true },
                  { label: 'Adjusted Net Income',  value: result.adjustedProfit / d,     bold: false, negative: false, indent: false },
                  { label: 'Personal Allowance',   value: result.personalAllowance / d,  bold: false, negative: true,  indent: true },
                  { label: 'Taxable Income',       value: result.taxableIncome / d,      bold: true,  negative: false, indent: false },
                  ...(result.taxBands.map(b => ({
                    label: `${b.label} (${b.rate}%)`, value: b.tax / d, bold: false, negative: true, indent: true,
                  }))),
                  { label: 'Income Tax',           value: result.incomeTax / d,          bold: false, negative: true,  indent: false },
                  ...(result.niClass1 > 0 ? [{ label: 'NI Class 1 (8%)',   value: result.niClass1 / d,  bold: false, negative: true, indent: true }] : []),
                  ...(result.niClass4 > 0 ? [{ label: 'NI Class 4 (6%)',   value: result.niClass4 / d,  bold: false, negative: true, indent: true }] : []),
                  ...(result.niClass2 > 0 ? [{ label: 'NI Class 2 (voluntary)', value: result.niClass2 / d, bold: false, negative: true, indent: true }] : []),
                  ...(result.niClass2Deemed ? [{ label: 'NI Class 2 (deemed paid — £0)', value: 0, bold: false, negative: false, indent: true }] : []),
                  ...(result.dividendTax > 0 ? [{ label: 'Dividend Tax', value: result.dividendTax / d, bold: false, negative: true, indent: true }] : []),
                  ...(result.studentLoanRepayment > 0 ? [{ label: 'Student Loan Repayment', value: result.studentLoanRepayment / d, bold: false, negative: true, indent: true }] : []),
                  { label: 'Total Deductions',     value: result.totalDeductions / d,    bold: true,  negative: true,  indent: false },
                  { label: 'Net Take-Home',        value: result.netTakeHome / d,        bold: true,  negative: false, indent: false },
                ]
                return lines.map((line, i) => (
                  <div key={i} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '7px 0', paddingLeft: line.indent ? '16px' : 0,
                    borderBottom: `1px solid rgba(255,215,0,0.06)`,
                  }}>
                    <span style={{ color: line.bold ? C.text : C.muted, fontSize: line.bold ? '0.87rem' : '0.82rem', fontWeight: line.bold ? 700 : 400 }}>
                      {line.label}
                    </span>
                    <span style={{
                      color: line.bold && !line.negative ? C.gold : line.negative ? C.red : C.text,
                      fontWeight: line.bold ? 700 : 500, fontSize: line.bold ? '1rem' : '0.85rem',
                    }}>
                      {line.negative && line.value > 0 ? '-' : ''}{fmt(round2(line.value))}
                    </span>
                  </div>
                ))
              })()}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Optimization Tips */}
      {result.optimizationTips.length > 0 && (
        <div style={{ ...cardStyle, marginTop: '1rem' }}>
          <button onClick={() => setTipsOpen((v) => !v)}
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: tipsOpen ? '1rem' : 0 }}>
            <span style={{ color: C.green, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Lightbulb size={14} /> Optimization Tips ({result.optimizationTips.length})
            </span>
            {tipsOpen ? <ChevronUp size={16} style={{ color: C.muted }} /> : <ChevronDown size={16} style={{ color: C.muted }} />}
          </button>
          <AnimatePresence>
            {tipsOpen && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {result.optimizationTips.map((tip) => (
                  <div key={tip.id} style={{
                    background: 'rgba(74,222,128,0.05)', border: '1px solid rgba(74,222,128,0.15)',
                    borderRadius: '8px', padding: '0.85rem 1rem',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ color: C.green, fontWeight: 700, fontSize: '0.85rem' }}>{tip.title}</span>
                      {tip.saving > 0 && (
                        <span style={{ color: C.green, fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <TrendingDown size={12} /> Save {fmt(tip.saving)}
                        </span>
                      )}
                    </div>
                    <p style={{ color: C.text, fontSize: '0.8rem', lineHeight: 1.55, margin: 0 }}>{tip.description}</p>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      <p style={{ color: C.muted, fontSize: '0.68rem', textAlign: 'center', marginTop: '1rem' }}>
        2026/27 HMRC Compliant | Encrypted via Supabase
      </p>
    </motion.div>
  )
}

// ─── Legacy Result Panel (Welfare & Job Loss) ────────────────────────────────
function LegacyResultPanel({ result }: { result: ScenarioResult }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      {result.sixtyTrap && (
        <div style={{ background: 'rgba(251,146,60,0.08)', border: '1px solid rgba(251,146,60,0.4)', borderRadius: '8px', padding: '0.85rem 1.1rem', marginBottom: '1.25rem', display: 'flex', gap: '0.6rem' }}>
          <AlertTriangle size={16} style={{ color: '#FB923C', flexShrink: 0, marginTop: '2px' }} />
          <div>
            <div style={{ color: '#FB923C', fontWeight: 700, fontSize: '0.85rem' }}>60% Tax Trap Active</div>
            <div style={{ color: C.text, fontSize: '0.8rem', marginTop: '2px', lineHeight: 1.5 }}>
              Income between £100k–£125,140. Each £2 earned = £1 of PA lost. Effective rate is 60%.
            </div>
          </div>
        </div>
      )}

      {/* Insight message */}
      <div style={{
        background: 'rgba(255,215,0,0.06)', border: `1px solid rgba(255,215,0,0.2)`,
        borderRadius: '10px', padding: '1rem 1.2rem', marginBottom: '1.25rem',
      }}>
        <p style={{ color: C.text, fontSize: '0.85rem', lineHeight: 1.6, margin: 0 }}>{result.catMessage}</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
        {[
          { label: 'Net Take-Home', value: fmt(result.netTakeHome), color: C.gold },
          { label: 'Total Tax', value: fmt(result.totalDeductions), color: C.red },
          { label: 'Effective Rate', value: pct(result.effectiveRate), color: C.blue },
          { label: 'Monthly Take-Home', value: fmt(round2(result.netTakeHome / 12)), color: C.green },
        ].map((s) => (
          <div key={s.label} style={{ background: C.deep, border: `1px solid ${C.border}`, borderRadius: '8px', padding: '1rem' }}>
            <div style={{ color: C.muted, fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>{s.label}</div>
            <div style={{ color: s.color, fontWeight: 700, fontSize: '1.1rem' }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div style={cardStyle}>
        <button onClick={() => setExpanded((v) => !v)}
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: expanded ? '1rem' : 0 }}>
          <span style={{ color: C.soft, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Full Breakdown</span>
          {expanded ? <ChevronUp size={16} style={{ color: C.muted }} /> : <ChevronDown size={16} style={{ color: C.muted }} />}
        </button>
        <AnimatePresence>
          {expanded && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
              {result.lines.map((line, i) => (
                <div key={i} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '7px 0', paddingLeft: line.indent ? '16px' : 0,
                  borderBottom: `1px solid rgba(255,215,0,0.06)`,
                }}>
                  <span style={{ color: line.bold ? C.text : C.muted, fontSize: line.bold ? '0.87rem' : '0.82rem', fontWeight: line.bold ? 700 : 400 }}>
                    {line.label}
                  </span>
                  <span style={{
                    color: line.bold ? C.gold : line.negative ? C.red : C.text,
                    fontWeight: line.bold ? 700 : 500, fontSize: line.bold ? '1rem' : '0.85rem',
                  }}>
                    {line.negative ? '-' : ''}{fmt(line.value)}
                  </span>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <p style={{ color: C.muted, fontSize: '0.68rem', textAlign: 'center', marginTop: '1rem' }}>
        2026/27 HMRC Compliant | Encrypted via Supabase
      </p>
    </motion.div>
  )
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────
type ScenarioKey = 'employed' | 'self-employed' | 'director' | 'welfare' | 'jobloss'

const SCENARIOS: { key: ScenarioKey; label: string; desc: string; icon: string }[] = [
  { key: 'employed',       label: 'Employed',        desc: 'PAYE salary, 8% NI',         icon: '💼' },
  { key: 'self-employed',  label: 'Self-Employed',   desc: 'Sole trader, 6% NI Class 4', icon: '🔧' },
  { key: 'director',       label: 'Director',        desc: 'Salary + Dividends',          icon: '🏢' },
  { key: 'welfare',        label: 'Welfare & Support', desc: 'UC, JSA, Carer\'s Allowance', icon: '🤝' },
  { key: 'jobloss',        label: 'Job Loss',        desc: '£30k exemption & PAYE refund', icon: '⚡' },
]

export default function TaxCalculator5() {
  const [scenario, setScenario] = useState<ScenarioKey>('employed')
  const [showMonthly, setShowMonthly] = useState(false)
  const [sliderIncome, setSliderIncome] = useState(45_000)

  // ─ Full engine inputs
  const [taxRegion, setTaxRegion] = useState<TaxRegion>('ruk')
  const [grossRevenue, setGrossRevenue] = useState(45_000)
  const [allowableExpenses, setAllowableExpenses] = useState(0)
  const [dividendIncome, setDividendIncome] = useState(0)
  const [pensionContribution, setPensionContribution] = useState(0)
  const [studentLoanPlan, setStudentLoanPlan] = useState<StudentLoanPlan>('none')
  const [marriageAllowance, setMarriageAllowance] = useState(false)
  const [blindPersonsAllowance, setBlindPersonsAllowance] = useState(false)
  const [voluntaryClass2NI, setVoluntaryClass2NI] = useState(false)

  // ─ Director-specific
  const [dirSalary, setDirSalary] = useState(12_570)
  const [dirDividends, setDirDividends] = useState(50_000)

  // ─ Legacy scenario inputs
  const [s3, setS3] = useState<S3Input>({ universalCredit: 6_000, jsaAmount: 4_000, carersAllowance: 2_400, otherIncome: 0 })
  const [s4, setS4] = useState<S4Input>({ annualSalary: 42_000, monthsWorked: 6, redundancyPayment: 35_000, paydeTaxPaid: 4_200 })

  const isFullEngine = scenario === 'employed' || scenario === 'self-employed' || scenario === 'director'

  // Sync slider → gross income
  function applySlider(v: number) {
    setSliderIncome(v)
    if (scenario === 'employed' || scenario === 'self-employed') setGrossRevenue(v)
    else if (scenario === 'director') setDirDividends(v)
    else if (scenario === 'jobloss') setS4((p) => ({ ...p, annualSalary: v }))
  }

  // Build TaxInput for full engine
  const taxInput: TaxInput = useMemo(() => {
    if (scenario === 'director') {
      return {
        grossRevenue: dirSalary + dirDividends,
        allowableExpenses: 0,
        dividendIncome: dirDividends,
        employmentType: 'director' as EmploymentType,
        taxRegion,
        studentLoanPlan,
        voluntaryClass2NI: false,
        marriageAllowance,
        blindPersonsAllowance,
        pensionContribution,
      }
    }
    return {
      grossRevenue,
      allowableExpenses: scenario === 'self-employed' ? allowableExpenses : 0,
      dividendIncome: 0,
      employmentType: scenario as EmploymentType,
      taxRegion,
      studentLoanPlan,
      voluntaryClass2NI,
      marriageAllowance,
      blindPersonsAllowance,
      pensionContribution,
    }
  }, [scenario, grossRevenue, allowableExpenses, dividendIncome, dirSalary, dirDividends, taxRegion, studentLoanPlan, voluntaryClass2NI, marriageAllowance, blindPersonsAllowance, pensionContribution])

  // Compute results
  const fullResult: TaxResult | null = useMemo(() => {
    if (!isFullEngine) return null
    try { return calculateTax(taxInput) } catch { return null }
  }, [isFullEngine, taxInput])

  const legacyResult: ScenarioResult | null = useMemo(() => {
    if (isFullEngine) return null
    try {
      if (scenario === 'welfare') return calcScenario3(s3)
      if (scenario === 'jobloss') return calcScenario4(s4)
    } catch { return null }
    return null
  }, [isFullEngine, scenario, s3, s4])

  return (
    <div style={{ maxWidth: '820px', margin: '0 auto' }}>
      {/* Country toggle — MUST be first */}
      <div style={{ ...cardStyle, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <span style={{ color: C.soft, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Tax Jurisdiction</span>
          <div style={{ color: C.muted, fontSize: '0.7rem', marginTop: '2px' }}>
            {taxRegion === 'scotland' ? 'Scottish rates: 19%–48% (6 bands)' : 'Rest of UK rates: 20% / 40% / 45%'}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={() => setTaxRegion('ruk')} style={toggleStyle(taxRegion === 'ruk')}>Rest of UK</button>
          <button onClick={() => setTaxRegion('scotland')} style={toggleStyle(taxRegion === 'scotland')}>Scotland</button>
        </div>
      </div>

      {/* Scenario selector */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: '0.5rem', marginBottom: '1.5rem' }}>
        {SCENARIOS.map((s) => (
          <button key={s.key} onClick={() => setScenario(s.key)}
            style={{
              padding: '0.75rem 0.5rem', borderRadius: '8px', cursor: 'pointer',
              background: scenario === s.key ? 'rgba(255,215,0,0.1)' : 'transparent',
              border: `1px solid ${scenario === s.key ? C.gold : C.border}`,
              color: scenario === s.key ? C.gold : C.muted,
              textAlign: 'center', transition: 'all 0.15s', minHeight: '44px',
            }}>
            <div style={{ fontSize: '1.2rem', marginBottom: '2px' }}>{s.icon}</div>
            <div style={{ fontSize: '0.78rem', fontWeight: 600 }}>{s.label}</div>
            <div style={{ fontSize: '0.65rem', opacity: 0.7, marginTop: '1px' }}>{s.desc}</div>
          </button>
        ))}
      </div>

      {/* What-If slider (not for welfare) */}
      {scenario !== 'welfare' && (
        <WhatIfSlider income={sliderIncome} onChange={applySlider} />
      )}

      {/* Input form */}
      <AnimatePresence mode="wait">
        <motion.div key={scenario}
          initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}
          transition={{ duration: 0.2 }}
          style={{ ...cardStyle, marginBottom: '1.5rem' }}>

          <h3 style={{ fontFamily: 'var(--font-playfair)', color: C.text, fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.25rem' }}>
            {SCENARIOS.find((s) => s.key === scenario)?.icon}{' '}
            {SCENARIOS.find((s) => s.key === scenario)?.label} Details
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: '1rem' }}>

            {/* EMPLOYED */}
            {scenario === 'employed' && <>
              <Field label="Gross Salary (£)">
                <NumInput value={grossRevenue} onChange={setGrossRevenue} />
              </Field>
              <Field label="Pension Contribution (£)"
                hint={<p style={{ color: C.blue, fontSize: '0.71rem' }}><Info size={11} style={{ display: 'inline', marginRight: '3px' }} />Reduces taxable income at your marginal rate</p>}>
                <NumInput value={pensionContribution} onChange={setPensionContribution} max={60_000} />
              </Field>
            </>}

            {/* SELF-EMPLOYED */}
            {scenario === 'self-employed' && <>
              <Field label="Gross Revenue (£)">
                <NumInput value={grossRevenue} onChange={setGrossRevenue} />
              </Field>
              <Field label="Allowable Expenses (£)">
                <NumInput value={allowableExpenses} onChange={setAllowableExpenses} />
              </Field>
              <Field label="Pension Contribution (£)">
                <NumInput value={pensionContribution} onChange={setPensionContribution} max={60_000} />
              </Field>
            </>}

            {/* DIRECTOR */}
            {scenario === 'director' && <>
              <Field label="Director Salary (£)"
                hint={<p style={{ color: dirSalary === 12_570 ? C.green : C.blue, fontSize: '0.71rem' }}>
                  {dirSalary === 12_570 ? '✓ Optimal — no NI, full State Pension credit' : `Recommended: ${fmt(12_570)}`}
                </p>}>
                <NumInput value={dirSalary} onChange={setDirSalary} />
              </Field>
              <Field label="Dividend Income (£)">
                <NumInput value={dirDividends} onChange={setDirDividends} />
              </Field>
              <Field label="Pension Contribution (£)">
                <NumInput value={pensionContribution} onChange={setPensionContribution} max={60_000} />
              </Field>
            </>}

            {/* WELFARE */}
            {scenario === 'welfare' && <>
              <Field label="Universal Credit / month (£)"
                hint={<p style={{ color: C.green, fontSize: '0.71rem' }}>✓ Tax-free — won't affect allowance</p>}>
                <NumInput value={s3.universalCredit} onChange={(v) => setS3((p) => ({ ...p, universalCredit: v }))} />
              </Field>
              <Field label="JSA (annual, taxable £)">
                <NumInput value={s3.jsaAmount} onChange={(v) => setS3((p) => ({ ...p, jsaAmount: v }))} />
              </Field>
              <Field label="Carer's Allowance (annual £)">
                <NumInput value={s3.carersAllowance} onChange={(v) => setS3((p) => ({ ...p, carersAllowance: v }))} />
              </Field>
              <Field label="Other Earned Income (£)">
                <NumInput value={s3.otherIncome} onChange={(v) => setS3((p) => ({ ...p, otherIncome: v }))} />
              </Field>
            </>}

            {/* JOB LOSS */}
            {scenario === 'jobloss' && <>
              <Field label="Annual Salary (£)">
                <NumInput value={s4.annualSalary} onChange={(v) => setS4((p) => ({ ...p, annualSalary: v }))} />
              </Field>
              <Field label="Months Worked This Year">
                <input type="range" min={1} max={12} step={1} value={s4.monthsWorked}
                  onChange={(e) => setS4((p) => ({ ...p, monthsWorked: Number(e.target.value) }))}
                  style={{ width: '100%', accentColor: C.gold, minHeight: '44px' }} />
                <div style={{ color: C.gold, fontSize: '0.85rem', textAlign: 'center' }}>{s4.monthsWorked} months</div>
              </Field>
              <Field label="Total Redundancy Payment (£)"
                hint={<p style={{ color: C.green, fontSize: '0.71rem' }}>✓ First £30,000 is tax-free</p>}>
                <NumInput value={s4.redundancyPayment} onChange={(v) => setS4((p) => ({ ...p, redundancyPayment: v }))} />
              </Field>
              <Field label="PAYE Tax Already Paid (£)">
                <NumInput value={s4.paydeTaxPaid} onChange={(v) => setS4((p) => ({ ...p, paydeTaxPaid: v }))} />
              </Field>
            </>}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Additional Tax Options (full engine scenarios only) */}
      {isFullEngine && (
        <div style={{ ...cardStyle, marginBottom: '1.5rem' }}>
          <h3 style={{ fontFamily: 'var(--font-playfair)', color: C.text, fontSize: '1rem', fontWeight: 700, marginBottom: '1rem' }}>
            Additional Options
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: '1rem' }}>
            {/* Student Loan */}
            <Field label="Student Loan Plan">
              <select value={studentLoanPlan} onChange={(e) => setStudentLoanPlan(e.target.value as StudentLoanPlan)} style={selectStyle}>
                {Object.entries(STUDENT_LOAN_LABELS).map(([key, label]) => (
                  <option key={key} value={key} style={{ background: C.deep, color: C.text }}>{label}</option>
                ))}
              </select>
            </Field>

            {/* Toggles */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <Toggle label="Marriage Allowance (−£1,260 PA)" active={marriageAllowance} onChange={setMarriageAllowance} />
              <Toggle label="Blind Person's Allowance (+£3,250)" active={blindPersonsAllowance} onChange={setBlindPersonsAllowance} />
              {scenario === 'self-employed' && (
                <Toggle label="Voluntary Class 2 NI (£3.65/wk)" active={voluntaryClass2NI} onChange={setVoluntaryClass2NI} />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      {fullResult && <FullResultPanel result={fullResult} showMonthly={showMonthly} setShowMonthly={setShowMonthly} />}
      {legacyResult && <LegacyResultPanel result={legacyResult} />}
    </div>
  )
}
