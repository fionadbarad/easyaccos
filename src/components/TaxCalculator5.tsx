'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Volume2, VolumeX, ChevronDown, ChevronUp, AlertTriangle, Info } from 'lucide-react'
import {
  TB, fmtGBP, round2,
  calcScenario1, calcScenario2, calcScenario3, calcScenario4, calcScenario5,
  calcStudentLoanFull, calcHICBC, calcScotlandIncomeTax, calcPA,
  PLANS_BY_REGION, PLAN_LABELS,
  type ScenarioResult, type S1Input, type S2Input, type S3Input, type S4Input, type S5Input,
  type StudentLoanPlanFull, type TaxRegion,
} from '@/lib/TaxBible2026'

// ─── Palette ─────────────────────────────────────────────────────────────────
const C = {
  bg:     '#0B0E1A', deep:  '#050A14', card:  '#111827',
  gold:   '#FFD700', soft:  '#C2A368', text:  '#E5E7EB',
  muted:  'rgba(229,231,235,0.55)', border: 'rgba(255,215,0,0.15)',
  red:    '#FF6B6B', green: '#4ADE80', blue:  '#60A5FA',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = fmtGBP
const pct = (n: number) => n.toFixed(1) + '%'

const label: React.CSSProperties = {
  display: 'block', color: C.muted, fontSize: '0.72rem',
  letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.4rem',
}
const inp: React.CSSProperties = {
  width: '100%', background: C.deep, border: `1px solid ${C.border}`,
  borderRadius: '6px', padding: '10px 13px', color: C.text,
  fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box',
  minHeight: '44px',
}
const card: React.CSSProperties = {
  background: C.card, border: `1px solid ${C.border}`,
  borderRadius: '10px', padding: '1.5rem',
}

// ─── Voice ───────────────────────────────────────────────────────────────────
function speakResult(result: ScenarioResult) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
  window.speechSynthesis.cancel()
  const text = [
    `${result.scenario} tax breakdown for 2026 to 2027.`,
    `Gross income: ${fmt(result.grossIncome)}.`,
    `Personal allowance: ${fmt(result.personalAllowance)}.`,
    `Income tax: ${fmt(result.incomeTax)}.`,
    `National Insurance: ${fmt(result.nationalInsurance)}.`,
    result.dividendTax > 0 ? `Dividend tax: ${fmt(result.dividendTax)}.` : '',
    `Total deductions: ${fmt(result.totalDeductions)}.`,
    `Net take-home: ${fmt(result.netTakeHome)}.`,
    `Effective rate: ${pct(result.effectiveRate)}.`,
    result.sixtyTrap ? 'Warning: you are in the 60 percent tax trap.' : '',
  ].filter(Boolean).join(' ')
  const utt = new SpeechSynthesisUtterance(text)
  utt.rate = 0.92
  utt.pitch = 1.05
  window.speechSynthesis.speak(utt)
}

// ─── What-If Slider ───────────────────────────────────────────────────────────
function WhatIfSlider({ income, onChange }: { income: number; onChange: (v: number) => void }) {
  return (
    <div style={{ ...card, marginBottom: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <span style={{ color: C.soft, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          What-If Income Slider
        </span>
        <span style={{ color: C.gold, fontWeight: 700, fontSize: '1.1rem' }}>{fmt(income)}</span>
      </div>
      <input
        type="range" min={0} max={250_000} step={500} value={income}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: '100%', accentColor: C.gold, cursor: 'pointer', height: '6px' }}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', color: C.muted, fontSize: '0.7rem', marginTop: '4px' }}>
        <span>£0</span>
        <span>£50k</span>
        <span>£100k</span>
        <span>£150k</span>
        <span>£200k+</span>
      </div>
      {income > 100_000 && income < 125_140 && (
        <div style={{ marginTop: '0.75rem', padding: '0.6rem 0.9rem', background: 'rgba(251,146,60,0.1)', border: '1px solid rgba(251,146,60,0.4)', borderRadius: '6px', color: '#FB923C', fontSize: '0.78rem' }}>
          ⚠️ 60% Tax Trap active — every £2 over £100k costs £1 of Personal Allowance
        </div>
      )}
    </div>
  )
}

// ─── Result Display ───────────────────────────────────────────────────────────
function ResultPanel({ result, speaking, onSpeak }: { result: ScenarioResult; speaking: boolean; onSpeak: () => void }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      {/* Cat message */}
      <div style={{
        background: 'rgba(255,215,0,0.06)', border: `1px solid rgba(255,215,0,0.2)`,
        borderRadius: '10px', padding: '1rem 1.2rem', marginBottom: '1.25rem',
        display: 'flex', gap: '0.75rem', alignItems: 'flex-start',
      }}>
        <span style={{ fontSize: '0.75rem', color: C.gold, fontWeight: 700, flexShrink: 0 }}>Kittax</span>
        <p style={{ color: C.text, fontSize: '0.85rem', lineHeight: 1.6, margin: 0 }}>{result.catMessage}</p>
        <button onClick={onSpeak}
          style={{ flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', color: speaking ? C.gold : C.muted, padding: '2px' }}
          title={speaking ? 'Stop reading' : 'Read aloud'}>
          {speaking ? <Volume2 size={18} /> : <VolumeX size={18} />}
        </button>
      </div>

      {/* 60% trap warning */}
      {result.sixtyTrap && (
        <div style={{ background: 'rgba(251,146,60,0.08)', border: '1px solid rgba(251,146,60,0.4)', borderRadius: '8px', padding: '0.85rem 1.1rem', marginBottom: '1.25rem', display: 'flex', gap: '0.6rem' }}>
          <AlertTriangle size={16} style={{ color: '#FB923C', flexShrink: 0, marginTop: '2px' }} />
          <div>
            <div style={{ color: '#FB923C', fontWeight: 700, fontSize: '0.85rem' }}>60% Tax Trap Active</div>
            <div style={{ color: C.text, fontSize: '0.8rem', marginTop: '2px', lineHeight: 1.5 }}>
              Income between £100k–£125,140. Each £2 earned = £1 of Personal Allowance lost. Effective rate is 60%. Pension contributions are the escape route.
            </div>
          </div>
        </div>
      )}

      {/* Summary headline */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
        {[
          { label: 'Net Take-Home', value: fmt(result.netTakeHome), color: C.gold },
          { label: 'Total Tax', value: fmt(result.totalDeductions), color: C.red },
          { label: 'Effective Rate', value: pct(result.effectiveRate), color: C.blue },
          { label: 'Monthly Take-Home', value: fmt(round2(result.netTakeHome / 12)), color: C.green },
        ].map((s) => (
          <div key={s.label} style={{ background: C.deep, border: `1px solid ${C.border}`, borderRadius: '8px', padding: '1rem', backdropFilter: 'blur(10px)' }}>
            <div style={{ color: C.muted, fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>{s.label}</div>
            <div style={{ color: s.color, fontWeight: 700, fontSize: '1.1rem' }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Detailed breakdown */}
      <div style={card}>
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
                    fontWeight: line.bold ? 700 : 500,
                    fontSize: line.bold ? '1rem' : '0.85rem',
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
        2026/27 HMRC Compliant | Secured via Supabase RLS &amp; AES-256 Encryption
      </p>
    </motion.div>
  )
}

// ─── Scenario Forms ───────────────────────────────────────────────────────────
function Field({ label: lbl, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={label}>{lbl}</label>
      {children}
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

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
type ScenarioKey = 's1emp' | 's1se' | 's2' | 's3' | 's4' | 's5'

const SCENARIOS: { key: ScenarioKey; label: string; desc: string; icon: string }[] = [
  { key: 's1emp', label: 'Employed',           desc: 'PAYE salary, 8% NI',          icon: '💼' },
  { key: 's1se',  label: 'Self-Employed',       desc: 'Sole trader, 6% NI Class 4',  icon: '🔧' },
  { key: 's2',    label: 'High Earner £100k+',  desc: '60% Trap & taper',            icon: '📈' },
  { key: 's3',    label: 'Welfare & Support',   desc: 'UC, JSA, Carer\'s Allowance', icon: '🤝' },
  { key: 's4',    label: 'Job Loss',            desc: '£30k exemption & PAYE refund',icon: '⚡' },
  { key: 's5',    label: 'Director',            desc: 'Salary + Dividends',           icon: '🏢' },
]

export default function TaxCalculator5() {
  const [scenario, setScenario] = useState<ScenarioKey>('s1emp')
  const [speaking, setSpeaking] = useState(false)
  const [sliderIncome, setSliderIncome] = useState(45_000)

  // ─ Country toggle
  const [region, setRegion] = useState<TaxRegion>('uk')

  // ─ Extra tax options
  const [studentLoan, setStudentLoan] = useState<StudentLoanPlanFull>('none')
  const [hasPostgrad, setHasPostgrad] = useState(false)
  const [childBenefit, setChildBenefit] = useState(0) // annual £

  // ─ Allowances & Deductions
  const [marriageAllowance, setMarriageAllowance] = useState(false)       // saves £252
  const [blindPersons,      setBlindPersons]      = useState(false)       // adds £3,070 to PA
  const [tradingAllowance,  setTradingAllowance]  = useState(false)       // first £1,000 SE income tax-free
  const [rentARoom,         setRentARoom]         = useState(false)       // first £7,500 rental income tax-free
  const [rentalIncome,      setRentalIncome]      = useState(0)           // annual rental £

  // Reset student loan when region changes (country-restricted)
  const availablePlans = PLANS_BY_REGION[region]
  if (studentLoan !== 'none' && studentLoan !== 'postgrad' && !availablePlans.includes(studentLoan)) {
    setStudentLoan('none')
  }

  // ─ Scenario 1 Employed
  const [s1e, setS1e] = useState<S1Input>({ grossIncome: 45_000, expenses: 0, employmentType: 'employed', pension: 0 })
  // ─ Scenario 1 Self-Employed
  const [s1s, setS1s] = useState<S1Input>({ grossIncome: 45_000, expenses: 5_000, employmentType: 'self-employed', pension: 0 })
  // ─ Scenario 2
  const [s2, setS2] = useState<S2Input>({ grossIncome: 110_000, pension: 0 })
  // ─ Scenario 3
  const [s3, setS3] = useState<S3Input>({ universalCredit: 6_000, jsaAmount: 4_000, carersAllowance: 2_400, otherIncome: 0 })
  // ─ Scenario 4
  const [s4, setS4] = useState<S4Input>({ annualSalary: 42_000, monthsWorked: 6, redundancyPayment: 35_000, paydeTaxPaid: 4_200 })
  // ─ Scenario 5
  const [s5, setS5] = useState<S5Input>({ salary: 12_570, dividends: 50_000, pension: 0 })

  // Sync What-If slider → active scenario's income
  function applySlider(v: number) {
    setSliderIncome(v)
    if (scenario === 's1emp') setS1e((p) => ({ ...p, grossIncome: v }))
    else if (scenario === 's1se') setS1s((p) => ({ ...p, grossIncome: v }))
    else if (scenario === 's2') setS2((p) => ({ ...p, grossIncome: v }))
    else if (scenario === 's4') setS4((p) => ({ ...p, annualSalary: v }))
    else if (scenario === 's5') setS5((p) => ({ ...p, dividends: v }))
  }

  // Compute result (with extra tax overlay)
  const result: ScenarioResult | null = (() => {
    try {
      let base: ScenarioResult | null = null
      if (scenario === 's1emp') base = calcScenario1(s1e)
      if (scenario === 's1se')  base = calcScenario1(s1s)
      if (scenario === 's2')    base = calcScenario2(s2)
      if (scenario === 's3')    base = calcScenario3(s3)
      if (scenario === 's4')    base = calcScenario4(s4)
      if (scenario === 's5')    base = calcScenario5(s5)
      if (!base) return null

      // Scotland tax override
      if (region === 'scotland') {
        const pa = calcPA(base.grossIncome)
        const taxable = Math.max(0, base.grossIncome - pa)
        const scotTax = calcScotlandIncomeTax(taxable)
        const diff = round2(scotTax - base.incomeTax)
        base = {
          ...base,
          incomeTax: scotTax,
          totalDeductions: round2(base.totalDeductions + diff),
          netTakeHome: round2(base.netTakeHome - diff),
          effectiveRate: base.grossIncome > 0 ? round2(((base.totalDeductions + diff) / base.grossIncome) * 100) : 0,
        }
      }

      // Student loan overlay
      const sl = calcStudentLoanFull(base.grossIncome, studentLoan, hasPostgrad)
      if (sl.total > 0) {
        base = {
          ...base,
          totalDeductions: round2(base.totalDeductions + sl.total),
          netTakeHome: round2(base.netTakeHome - sl.total),
          effectiveRate: base.grossIncome > 0 ? round2(((base.totalDeductions + sl.total) / base.grossIncome) * 100) : 0,
          lines: [
            ...base.lines,
            ...(sl.planRepayment > 0 ? [{ label: `Student Loan (${PLAN_LABELS[studentLoan]?.split('(')[0]?.trim()})`, value: sl.planRepayment, negative: true, indent: true }] : []),
            ...(sl.postgradRepayment > 0 ? [{ label: 'Postgrad Loan (6%)', value: sl.postgradRepayment, negative: true, indent: true }] : []),
            ...(sl.dualRate ? [{ label: 'Dual-plan marginal rate: 15%', value: 0, indent: true }] : []),
          ],
        }
      }

      // HICBC overlay
      if (childBenefit > 0) {
        const hicbc = calcHICBC(base.grossIncome, childBenefit)
        if (hicbc > 0) {
          base = {
            ...base,
            totalDeductions: round2(base.totalDeductions + hicbc),
            netTakeHome: round2(base.netTakeHome - hicbc),
            lines: [
              ...base.lines,
              { label: 'Child Benefit Charge (HICBC)', value: hicbc, negative: true, indent: true },
            ],
          }
        }
      }

      if (!base) return null

      // ── Allowance overlays ──────────────────────────────────────────────────

      // Determine marginal rate from gross income
      const grossInc = base.grossIncome
      const marginalRate = grossInc > 125_140 ? 0.45 : grossInc > 50_270 ? 0.40 : 0.20

      // Marriage Allowance — partner receives £1,260 PA transfer → saves £252 (10% of £1,260 = basic rate relief)
      if (marriageAllowance) {
        const saving = 252
        base = {
          ...base,
          totalDeductions: round2(base.totalDeductions - saving),
          netTakeHome: round2(base.netTakeHome + saving),
          effectiveRate: grossInc > 0 ? round2(((base.totalDeductions - saving) / grossInc) * 100) : 0,
          lines: [...base.lines, { label: 'Marriage Allowance saving', value: saving, negative: false, indent: true, bold: false }],
        }
      }

      // Blind Person's Allowance — adds £3,250 to Personal Allowance (2026/27)
      if (blindPersons) {
        const saving = round2(Math.min(TB.BLIND_ALLOWANCE, Math.max(0, grossInc - TB.PA_BASE)) * marginalRate)
        if (saving > 0) {
          base = {
            ...base,
            totalDeductions: round2(base.totalDeductions - saving),
            netTakeHome: round2(base.netTakeHome + saving),
            effectiveRate: grossInc > 0 ? round2(((base.totalDeductions - saving) / grossInc) * 100) : 0,
            lines: [...base.lines, { label: `Blind Person's Allowance (+£${TB.BLIND_ALLOWANCE.toLocaleString()} PA)`, value: saving, negative: false, indent: true, bold: false }],
          }
        }
      }

      // Trading Allowance — first £1,000 SE income tax-free (SE / Director scenarios)
      if (tradingAllowance && (scenario === 's1se' || scenario === 's5')) {
        const saving = round2(1_000 * marginalRate)
        base = {
          ...base,
          totalDeductions: round2(base.totalDeductions - saving),
          netTakeHome: round2(base.netTakeHome + saving),
          effectiveRate: grossInc > 0 ? round2(((base.totalDeductions - saving) / grossInc) * 100) : 0,
          lines: [...base.lines, { label: 'Trading Allowance (first £1,000 tax-free)', value: saving, negative: false, indent: true, bold: false }],
        }
      }

      // Rent-a-Room Relief — first £7,500 rental income tax-free
      if (rentARoom && rentalIncome > 0) {
        const exemptRental = Math.min(rentalIncome, 7_500)
        const saving = round2(exemptRental * marginalRate)
        if (saving > 0) {
          base = {
            ...base,
            totalDeductions: round2(base.totalDeductions - saving),
            netTakeHome: round2(base.netTakeHome + saving),
            effectiveRate: grossInc > 0 ? round2(((base.totalDeductions - saving) / grossInc) * 100) : 0,
            lines: [...base.lines, { label: `Rent-a-Room Relief (first £${exemptRental.toLocaleString()} tax-free)`, value: saving, negative: false, indent: true, bold: false }],
          }
        }
      }

      return base
    } catch { return null }
  })()

  function handleSpeak() {
    if (!result) return
    if (speaking) {
      window.speechSynthesis?.cancel()
      setSpeaking(false)
    } else {
      setSpeaking(true)
      speakResult(result)
      const utt = new SpeechSynthesisUtterance('')
      utt.onend = () => setSpeaking(false)
      // fallback timeout
      setTimeout(() => setSpeaking(false), 15_000)
    }
  }

  return (
    <div style={{ maxWidth: '820px', margin: '0 auto' }}>
      {/* Scenario selector */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: '0.5rem', marginBottom: '1.5rem' }}>
        {SCENARIOS.map((s) => (
          <button key={s.key} onClick={() => setScenario(s.key)}
            style={{
              padding: '0.75rem 0.5rem', borderRadius: '8px', cursor: 'pointer',
              background: scenario === s.key ? 'rgba(255,215,0,0.1)' : 'transparent',
              border: `1px solid ${scenario === s.key ? C.gold : C.border}`,
              color: scenario === s.key ? C.gold : C.muted,
              textAlign: 'center', transition: 'all 0.15s',
              minHeight: '44px',
            }}>
            <div style={{ fontSize: '1.2rem', marginBottom: '2px' }}>{s.icon}</div>
            <div style={{ fontSize: '0.78rem', fontWeight: 600 }}>{s.label}</div>
            <div style={{ fontSize: '0.65rem', opacity: 0.7, marginTop: '1px' }}>{s.desc}</div>
          </button>
        ))}
      </div>

      {/* Country Toggle */}
      <div style={{ ...card, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1.2rem' }}>
        <span style={{ color: C.muted, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Tax Region</span>
        <div style={{ display: 'flex', gap: '4px' }}>
          {(['uk', 'scotland'] as TaxRegion[]).map((r) => (
            <button key={r} onClick={() => setRegion(r)}
              style={{
                padding: '6px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600,
                background: region === r ? 'rgba(255,215,0,0.12)' : 'transparent',
                border: `1px solid ${region === r ? C.gold : C.border}`,
                color: region === r ? C.gold : C.muted,
                transition: 'all 0.15s',
              }}>
              {r === 'uk' ? 'Rest of UK' : 'Scotland'}
            </button>
          ))}
        </div>
      </div>

      {/* Extra Tax Options */}
      <div style={{ ...card, marginBottom: '1rem' }}>
        <div style={{ color: C.soft, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.75rem' }}>
          Extra Deductions &amp; Allowances
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: '1rem' }}>
          <Field label="Student Loan Plan">
            <select value={studentLoan} onChange={(e) => setStudentLoan(e.target.value as StudentLoanPlanFull)}
              style={{ ...inp, cursor: 'pointer', appearance: 'auto' }}>
              {availablePlans.map((p) => (
                <option key={p} value={p} style={{ background: C.deep, color: C.text }}>
                  {PLAN_LABELS[p]}
                </option>
              ))}
            </select>
          </Field>
          {studentLoan !== 'none' && studentLoan !== 'postgrad' && (
            <Field label="Also have Postgrad Loan?">
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '10px 0' }}>
                <input type="checkbox" checked={hasPostgrad} onChange={(e) => setHasPostgrad(e.target.checked)}
                  style={{ accentColor: C.gold, width: '18px', height: '18px' }} />
                <span style={{ color: C.text, fontSize: '0.85rem' }}>
                  Yes — Postgrad (£21k @ 6%) {hasPostgrad && <span style={{ color: C.gold }}> Combined 15% marginal rate</span>}
                </span>
              </label>
            </Field>
          )}
          <Field label="Annual Child Benefit (£)">
            <NumInput value={childBenefit} onChange={(v) => setChildBenefit(v)} max={5_000} />
            {childBenefit > 0 && (
              <p style={{ color: C.muted, fontSize: '0.71rem', marginTop: '4px' }}>
                HICBC applies if income exceeds £60,000. Full clawback at £80,000.
              </p>
            )}
          </Field>
        </div>

        {/* Allowances toggle row */}
        <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: `1px solid rgba(255,215,0,0.08)` }}>
          <div style={{ color: C.soft, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.75rem' }}>
            Additional Allowances
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: '0.75rem' }}>

            {/* Marriage Allowance */}
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer', padding: '0.75rem', background: 'rgba(255,215,0,0.03)', border: `1px solid ${marriageAllowance ? 'rgba(255,215,0,0.3)' : C.border}`, borderRadius: '6px' }}>
              <input type="checkbox" checked={marriageAllowance} onChange={(e) => setMarriageAllowance(e.target.checked)}
                style={{ accentColor: C.gold, width: '16px', height: '16px', flexShrink: 0, marginTop: '2px' }} />
              <div>
                <div style={{ color: C.text, fontSize: '0.82rem', fontWeight: 600 }}>Marriage Allowance</div>
                <div style={{ color: C.muted, fontSize: '0.72rem', marginTop: '2px', lineHeight: 1.4 }}>
                  Transfer unused Personal Allowance to spouse/civil partner. Saves up to £252/year. Transferor must earn below £12,570.
                </div>
              </div>
            </label>

            {/* Blind Person's Allowance */}
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer', padding: '0.75rem', background: 'rgba(255,215,0,0.03)', border: `1px solid ${blindPersons ? 'rgba(255,215,0,0.3)' : C.border}`, borderRadius: '6px' }}>
              <input type="checkbox" checked={blindPersons} onChange={(e) => setBlindPersons(e.target.checked)}
                style={{ accentColor: C.gold, width: '16px', height: '16px', flexShrink: 0, marginTop: '2px' }} />
              <div>
                <div style={{ color: C.text, fontSize: '0.82rem', fontWeight: 600 }}>Blind Person&apos;s Allowance</div>
                <div style={{ color: C.muted, fontSize: '0.72rem', marginTop: '2px', lineHeight: 1.4 }}>
                  Registered blind or severely sight-impaired. Adds £3,250 to Personal Allowance (2026/27). Must be registered with your local authority.
                </div>
              </div>
            </label>

            {/* Trading Allowance — only relevant for SE/Director */}
            {(scenario === 's1se' || scenario === 's5') && (
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer', padding: '0.75rem', background: 'rgba(255,215,0,0.03)', border: `1px solid ${tradingAllowance ? 'rgba(255,215,0,0.3)' : C.border}`, borderRadius: '6px' }}>
                <input type="checkbox" checked={tradingAllowance} onChange={(e) => setTradingAllowance(e.target.checked)}
                  style={{ accentColor: C.gold, width: '16px', height: '16px', flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <div style={{ color: C.text, fontSize: '0.82rem', fontWeight: 600 }}>Trading Allowance</div>
                  <div style={{ color: C.muted, fontSize: '0.72rem', marginTop: '2px', lineHeight: 1.4 }}>
                    First £1,000 of self-employment income is tax-free. Useful for casual or hobby income.
                  </div>
                </div>
              </label>
            )}

            {/* Rent-a-Room Relief */}
            <div style={{ padding: '0.75rem', background: 'rgba(255,215,0,0.03)', border: `1px solid ${rentARoom ? 'rgba(255,215,0,0.3)' : C.border}`, borderRadius: '6px' }}>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer', marginBottom: rentARoom ? '0.6rem' : 0 }}>
                <input type="checkbox" checked={rentARoom} onChange={(e) => setRentARoom(e.target.checked)}
                  style={{ accentColor: C.gold, width: '16px', height: '16px', flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <div style={{ color: C.text, fontSize: '0.82rem', fontWeight: 600 }}>Rent-a-Room Relief</div>
                  <div style={{ color: C.muted, fontSize: '0.72rem', marginTop: '2px', lineHeight: 1.4 }}>
                    Renting a furnished room in your main home? First £7,500 of rental income is tax-free.
                  </div>
                </div>
              </label>
              {rentARoom && (
                <div>
                  <label style={{ ...label }}>Annual Rental Income (£)</label>
                  <NumInput value={rentalIncome} onChange={(v) => setRentalIncome(v)} max={50_000} />
                </div>
              )}
            </div>

          </div>
        </div>

      </div>

      {/* What-If slider */}
      <WhatIfSlider income={sliderIncome} onChange={applySlider} />

      {/* Input form per scenario */}
      <AnimatePresence mode="wait">
        <motion.div key={scenario}
          initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}
          transition={{ duration: 0.2 }}
          style={{ ...card, marginBottom: '1.5rem' }}>

          <h3 style={{ fontFamily: 'var(--font-playfair)', color: C.text, fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.25rem' }}>
            {SCENARIOS.find((s) => s.key === scenario)?.icon} {SCENARIOS.find((s) => s.key === scenario)?.label} Details
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: '1rem' }}>
            {/* SCENARIO 1 — Employed */}
            {scenario === 's1emp' && <>
              <Field label="Gross Salary (£)"><NumInput value={s1e.grossIncome} onChange={(v) => setS1e((p) => ({ ...p, grossIncome: v }))} /></Field>
              <Field label="Pension Contribution (£)"><NumInput value={s1e.pension} onChange={(v) => setS1e((p) => ({ ...p, pension: v }))} max={60_000} /></Field>
            </>}

            {/* SCENARIO 1 — Self-Employed */}
            {scenario === 's1se' && <>
              <Field label="Gross Revenue (£)"><NumInput value={s1s.grossIncome} onChange={(v) => setS1s((p) => ({ ...p, grossIncome: v }))} /></Field>
              <Field label="Allowable Expenses (£)"><NumInput value={s1s.expenses} onChange={(v) => setS1s((p) => ({ ...p, expenses: v }))} /></Field>
              <Field label="Pension Contribution (£)"><NumInput value={s1s.pension} onChange={(v) => setS1s((p) => ({ ...p, pension: v }))} max={60_000} /></Field>
            </>}

            {/* SCENARIO 2 — High Earner */}
            {scenario === 's2' && <>
              <Field label="Gross Income (£)"><NumInput value={s2.grossIncome} onChange={(v) => setS2((p) => ({ ...p, grossIncome: v }))} max={500_000} /></Field>
              <Field label="Pension Contribution (£)">
                <NumInput value={s2.pension} onChange={(v) => setS2((p) => ({ ...p, pension: v }))} max={60_000} />
                <p style={{ color: C.blue, fontSize: '0.71rem', marginTop: '4px' }}>
                  <Info size={11} style={{ display: 'inline', marginRight: '3px' }} />
                  Enter {fmtGBP(Math.max(0, s2.grossIncome - TB.PA_TAPER_START))} to escape the 60% trap
                </p>
              </Field>
            </>}

            {/* SCENARIO 3 — Welfare */}
            {scenario === 's3' && <>
              <Field label="Universal Credit / month (£)">
                <NumInput value={s3.universalCredit} onChange={(v) => setS3((p) => ({ ...p, universalCredit: v }))} />
                <p style={{ color: C.green, fontSize: '0.71rem', marginTop: '4px' }}>✓ Tax-free — won't affect allowance</p>
              </Field>
              <Field label="JSA (annual, taxable £)"><NumInput value={s3.jsaAmount} onChange={(v) => setS3((p) => ({ ...p, jsaAmount: v }))} /></Field>
              <Field label="Carer's Allowance (annual £)"><NumInput value={s3.carersAllowance} onChange={(v) => setS3((p) => ({ ...p, carersAllowance: v }))} /></Field>
              <Field label="Other Earned Income (£)"><NumInput value={s3.otherIncome} onChange={(v) => setS3((p) => ({ ...p, otherIncome: v }))} /></Field>
            </>}

            {/* SCENARIO 4 — Job Loss */}
            {scenario === 's4' && <>
              <Field label="Annual Salary (£)"><NumInput value={s4.annualSalary} onChange={(v) => setS4((p) => ({ ...p, annualSalary: v }))} /></Field>
              <Field label="Months Worked This Year">
                <input type="range" min={1} max={12} step={1} value={s4.monthsWorked}
                  onChange={(e) => setS4((p) => ({ ...p, monthsWorked: Number(e.target.value) }))}
                  style={{ width: '100%', accentColor: C.gold, minHeight: '44px' }} />
                <div style={{ color: C.gold, fontSize: '0.85rem', textAlign: 'center' }}>{s4.monthsWorked} months</div>
              </Field>
              <Field label="Total Redundancy Payment (£)">
                <NumInput value={s4.redundancyPayment} onChange={(v) => setS4((p) => ({ ...p, redundancyPayment: v }))} />
                <p style={{ color: C.green, fontSize: '0.71rem', marginTop: '4px' }}>✓ First £30,000 is tax-free</p>
              </Field>
              <Field label="PAYE Tax Already Paid (£)"><NumInput value={s4.paydeTaxPaid} onChange={(v) => setS4((p) => ({ ...p, paydeTaxPaid: v }))} /></Field>
            </>}

            {/* SCENARIO 5 — Director */}
            {scenario === 's5' && <>
              <Field label="Director Salary (£)">
                <NumInput value={s5.salary} onChange={(v) => setS5((p) => ({ ...p, salary: v }))} />
                <p style={{ color: s5.salary === TB.DIRECTOR_OPTIMAL_SALARY ? C.green : C.blue, fontSize: '0.71rem', marginTop: '4px' }}>
                  {s5.salary === TB.DIRECTOR_OPTIMAL_SALARY ? '✓ Optimal — no NI, full State Pension credit' : `Recommended: ${fmtGBP(TB.DIRECTOR_OPTIMAL_SALARY)}`}
                </p>
              </Field>
              <Field label="Dividend Income (£)"><NumInput value={s5.dividends} onChange={(v) => setS5((p) => ({ ...p, dividends: v }))} /></Field>
              <Field label="Pension Contribution (£)"><NumInput value={s5.pension} onChange={(v) => setS5((p) => ({ ...p, pension: v }))} max={60_000} /></Field>
              <div style={{ padding: '0.75rem', background: 'rgba(255,215,0,0.05)', border: `1px solid rgba(255,215,0,0.15)`, borderRadius: '6px', fontSize: '0.78rem', color: C.muted }}>
                <div style={{ color: C.soft, fontWeight: 600, marginBottom: '4px' }}>2026/27 Dividend Rates</div>
                <div>Basic (up to £50,270): 10.75%</div>
                <div>Higher (£50,271–£125,140): 35.75%</div>
                <div>Additional (above £125,140): 39.35%</div>
                <div style={{ color: C.green, marginTop: '4px' }}>First £500 = tax-free allowance</div>
              </div>
            </>}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Result */}
      {result && (
        <ResultPanel result={result} speaking={speaking} onSpeak={handleSpeak} />
      )}
    </div>
  )
}
