'use client'

import { useState } from 'react'
import { calculateTax, type TaxInput, type TaxResult, type EmploymentType, type TaxRegion, type StudentLoanPlan } from '@/lib/tax-logic'
import { AlertTriangle, Info } from 'lucide-react'

// ─── Palette ────────────────────────────────────────────────────────────────
const C = {
  bg:      '#0B0E1A',
  deep:    '#050A14',
  card:    '#111827',
  card2:   '#0F1C2E',
  gold:    '#FFD700',
  goldSoft:'#C2A368',
  text:    '#E5E7EB',
  muted:   'rgba(229,231,235,0.55)',
  border:  'rgba(255,215,0,0.15)',
  red:     '#FF6B6B',
  green:   '#4ADE80',
}

const fmt = (n: number) => `£${Math.round(n).toLocaleString('en-GB')}`
const pct = (n: number) => `${n.toFixed(1)}%`

const labelStyle: React.CSSProperties = {
  display: 'block', color: C.muted, fontSize: '0.72rem',
  letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.4rem',
}
const inputStyle: React.CSSProperties = {
  width: '100%', background: C.deep, border: `1px solid ${C.border}`,
  borderRadius: '6px', padding: '10px 13px', color: C.text,
  fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box',
}
const selectStyle: React.CSSProperties = { ...inputStyle, cursor: 'pointer', appearance: 'none' }

function StatRow({ label, value, highlight, sub }: {
  label: string; value: string; highlight?: boolean; sub?: string
}) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '9px 0', borderBottom: `1px solid rgba(255,215,0,0.08)`,
    }}>
      <div>
        <span style={{ color: C.muted, fontSize: '0.82rem' }}>{label}</span>
        {sub && <span style={{ display: 'block', color: 'rgba(229,231,235,0.3)', fontSize: '0.7rem' }}>{sub}</span>}
      </div>
      <span style={{
        color: highlight ? C.gold : C.text,
        fontWeight: highlight ? 700 : 500,
        fontSize: highlight ? '1.05rem' : '0.9rem',
      }}>
        {value}
      </span>
    </div>
  )
}

function PillToggle<T extends string>({ options, value, onChange, label }: {
  options: { value: T; label: string }[]
  value: T
  onChange: (v: T) => void
  label?: string
}) {
  return (
    <div>
      {label && <div style={labelStyle}>{label}</div>}
      <div style={{
        display: 'inline-flex', background: C.deep,
        border: `1px solid ${C.border}`, borderRadius: '8px', padding: '3px', gap: '2px',
      }}>
        {options.map((opt) => (
          <button key={opt.value} onClick={() => onChange(opt.value)}
            style={{
              padding: '7px 14px', borderRadius: '6px', border: 'none',
              cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600,
              transition: 'all 0.18s ease',
              background: value === opt.value ? C.gold : 'transparent',
              color: value === opt.value ? '#0B0E1A' : C.muted,
            }}>
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}

const INITIAL: TaxInput = {
  grossRevenue: 45000,
  allowableExpenses: 0,
  dividendIncome: 0,
  employmentType: 'self-employed',
  taxRegion: 'ruk',
  studentLoanPlan: 'none',
  voluntaryClass2NI: false,
  marriageAllowance: false,
  blindPersonsAllowance: false,
}

export default function TaxPage() {
  const [form, setForm] = useState<TaxInput>(INITIAL)
  const result: TaxResult = calculateTax(form)

  function set<K extends keyof TaxInput>(key: K, val: TaxInput[K]) {
    setForm((f) => ({ ...f, [key]: val }))
  }

  const totalIncome    = result.grossProfit + form.dividendIncome
  const takeHomePct    = totalIncome > 0 ? (result.netTakeHome / totalIncome) * 100 : 100
  const showDividend   = form.employmentType === 'director' || form.dividendIncome > 0
  const showClass2     = form.employmentType === 'self-employed'
  const showClass4     = form.employmentType === 'self-employed'
  const showClass1     = form.employmentType === 'employed' || form.employmentType === 'director'

  return (
    <div style={{ padding: 'clamp(1.5rem,4vw,2.5rem)', maxWidth: '960px' }}>

      {/* Header */}
      <h1 style={{ fontFamily: 'var(--font-playfair)', color: C.text, fontSize: 'clamp(1.5rem,3vw,2rem)', fontWeight: 700, marginBottom: '0.3rem' }}>
        Tax Estimator
      </h1>
      <p style={{ color: C.muted, fontSize: '0.875rem', marginBottom: '2rem' }}>
        2026/27 fiscal year · HMRC-accurate · Profit-based calculation
      </p>

      {/* ── 60% TRAP ALERT ── */}
      {result.sixtyPercentTrap && (
        <div style={{
          background: 'rgba(255,215,0,0.08)', border: `1px solid ${C.gold}`,
          borderRadius: '8px', padding: '1rem 1.25rem', marginBottom: '1.5rem',
          display: 'flex', gap: '0.75rem', alignItems: 'flex-start',
        }}>
          <AlertTriangle size={20} style={{ color: C.gold, flexShrink: 0, marginTop: '1px' }} />
          <div>
            <div style={{ color: C.gold, fontWeight: 700, fontSize: '0.9rem', marginBottom: '3px' }}>
              ⚡ 60% Effective Tax Trap Detected
            </div>
            <div style={{ color: C.text, fontSize: '0.82rem', lineHeight: 1.55 }}>
              Your income is between <strong style={{ color: C.gold }}>£100,000 – £125,140</strong>. Your Personal Allowance is being tapered away (£1 for every £2 earned). This creates an effective 60% marginal rate. Consider pension contributions (SIPP) to bring income below £100,000.
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))', gap: '1.5rem' }}>

        {/* ── INPUT CARD ── */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '10px', padding: '1.75rem' }}>
          <h2 style={{ color: C.gold, fontFamily: 'var(--font-playfair)', fontSize: '1.05rem', fontWeight: 700, marginBottom: '1.5rem' }}>
            Income Details
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

            {/* Employment type toggle */}
            <PillToggle<EmploymentType>
              label="Employment Type"
              value={form.employmentType}
              onChange={(v) => set('employmentType', v)}
              options={[
                { value: 'employed',      label: 'Employed'      },
                { value: 'self-employed', label: 'Self-Employed' },
                { value: 'director',      label: 'Director'      },
              ]}
            />

            {/* Scotland / rUK toggle */}
            <PillToggle<TaxRegion>
              label="Tax Region"
              value={form.taxRegion}
              onChange={(v) => set('taxRegion', v)}
              options={[
                { value: 'ruk',      label: 'rUK (England / Wales / NI)' },
                { value: 'scotland', label: 'Scotland'                     },
              ]}
            />

            {/* Gross Revenue */}
            <div>
              <label style={labelStyle}>
                {form.employmentType === 'employed' ? 'Gross Annual Salary' : 'Gross Revenue / Turnover'}
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: C.muted, fontSize: '0.9rem', pointerEvents: 'none' }}>£</span>
                <input type="number" min={0} max={9_999_999} value={form.grossRevenue}
                  onChange={(e) => set('grossRevenue', Math.max(0, Number(e.target.value)))}
                  style={{ ...inputStyle, paddingLeft: '26px' }} />
              </div>
            </div>

            {/* Allowable Expenses */}
            {form.employmentType !== 'employed' && (
              <div>
                <label style={labelStyle}>Allowable Expenses</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: C.muted, fontSize: '0.9rem', pointerEvents: 'none' }}>£</span>
                  <input type="number" min={0} value={form.allowableExpenses}
                    onChange={(e) => set('allowableExpenses', Math.max(0, Number(e.target.value)))}
                    style={{ ...inputStyle, paddingLeft: '26px' }} />
                </div>
                <p style={{ color: C.muted, fontSize: '0.72rem', marginTop: '5px' }}>
                  Tax is calculated on Profit (Revenue − Expenses)
                </p>
              </div>
            )}

            {/* Dividend Income (Director) */}
            {showDividend && (
              <div>
                <label style={labelStyle}>Dividend Income</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: C.muted, fontSize: '0.9rem', pointerEvents: 'none' }}>£</span>
                  <input type="number" min={0} value={form.dividendIncome}
                    onChange={(e) => set('dividendIncome', Math.max(0, Number(e.target.value)))}
                    style={{ ...inputStyle, paddingLeft: '26px' }} />
                </div>
                <p style={{ color: C.muted, fontSize: '0.72rem', marginTop: '5px' }}>
                  £500 dividend allowance · 10.75% basic / 35.75% higher
                </p>
              </div>
            )}

            {/* Student Loan */}
            <div>
              <label style={labelStyle}>Student Loan Plan</label>
              <select value={form.studentLoanPlan}
                onChange={(e) => set('studentLoanPlan', e.target.value as StudentLoanPlan)}
                style={selectStyle}>
                <option value="none">None</option>
                <option value="plan1">Plan 1 — £26,900 threshold (pre-2012)</option>
                <option value="plan2">Plan 2 — £29,385 threshold (9%)</option>
                <option value="plan4">Plan 4 — £33,795 threshold (Scotland)</option>
                <option value="plan5">Plan 5 — £25,000 threshold (new default)</option>
                <option value="postgraduate">Postgraduate — £21,000 threshold (6%)</option>
              </select>
            </div>

            {/* Class 2 NI */}
            {showClass2 && (
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}>
                <input type="checkbox" checked={form.voluntaryClass2NI}
                  onChange={(e) => set('voluntaryClass2NI', e.target.checked)}
                  style={{ width: '15px', height: '15px', accentColor: C.gold, marginTop: '2px', flexShrink: 0 }} />
                <span style={{ color: C.muted, fontSize: '0.82rem', lineHeight: 1.5 }}>
                  Voluntary Class 2 NI — £3.65/week (£189.80/yr)<br />
                  <span style={{ color: 'rgba(229,231,235,0.35)', fontSize: '0.72rem' }}>Protects State Pension entitlement (only if profit &lt; £6,845)</span>
                </span>
              </label>
            )}

            {/* Marriage Allowance */}
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}>
              <input type="checkbox" checked={form.marriageAllowance}
                onChange={(e) => set('marriageAllowance', e.target.checked)}
                style={{ width: '15px', height: '15px', accentColor: C.gold, marginTop: '2px', flexShrink: 0 }} />
              <span style={{ color: C.muted, fontSize: '0.82rem', lineHeight: 1.5 }}>
                Marriage Allowance — transfer £1,260 of PA to spouse<br />
                <span style={{ color: 'rgba(229,231,235,0.35)', fontSize: '0.72rem' }}>Saves your partner up to £252 tax · only if you earn below £12,570</span>
              </span>
            </label>

            {/* Blind Person's Allowance */}
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}>
              <input type="checkbox" checked={form.blindPersonsAllowance}
                onChange={(e) => set('blindPersonsAllowance', e.target.checked)}
                style={{ width: '15px', height: '15px', accentColor: C.gold, marginTop: '2px', flexShrink: 0 }} />
              <span style={{ color: C.muted, fontSize: '0.82rem', lineHeight: 1.5 }}>
                Blind Person&apos;s Allowance — +£3,250 tax-free<br />
                <span style={{ color: 'rgba(229,231,235,0.35)', fontSize: '0.72rem' }}>2026/27 indexed rate · registered blind or severely sight-impaired</span>
              </span>
            </label>
          </div>
        </div>

        {/* ── RESULTS CARD ── */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '10px', padding: '1.75rem' }}>
          <h2 style={{ color: C.gold, fontFamily: 'var(--font-playfair)', fontSize: '1.05rem', fontWeight: 700, marginBottom: '1.5rem' }}>
            Tax Breakdown
          </h2>

          {/* Take-home bar */}
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ color: C.muted, fontSize: '0.78rem' }}>Take-home rate</span>
              <span style={{ color: C.gold, fontWeight: 700, fontSize: '0.92rem' }}>{pct(takeHomePct)}</span>
            </div>
            <div style={{ height: '9px', background: 'rgba(255,255,255,0.06)', borderRadius: '5px', overflow: 'hidden' }}>
              <div style={{
                height: '100%', width: `${Math.min(100, takeHomePct)}%`,
                background: `linear-gradient(90deg, ${C.gold}, #FFA500)`,
                borderRadius: '5px', transition: 'width 0.4s ease',
              }} />
            </div>
          </div>

          <StatRow label="Gross Revenue"        value={fmt(result.grossRevenue)} />
          {form.allowableExpenses > 0 && (
            <StatRow label="Allowable Expenses"  value={`− ${fmt(result.allowableExpenses)}`} />
          )}
          <StatRow label="Taxable Profit"        value={fmt(result.grossProfit)} />
          <StatRow label="Personal Allowance"    value={fmt(result.personalAllowance)}
            sub={result.taperWarning ? '⚠ Tapered (60% trap)' : undefined} />
          <StatRow label="Taxable Income"        value={fmt(result.taxableIncome)} />

          {/* Tax bands */}
          {result.taxBands.map((b) => (
            <StatRow key={b.label} label={`${b.label} (${b.rate}%)`} value={fmt(b.tax)} />
          ))}
          <StatRow label="Income Tax Total"      value={fmt(result.incomeTax)} />

          {showClass1 && result.niClass1 > 0 && (
            <StatRow label="NI Class 1 (Employee)" value={fmt(result.niClass1)} />
          )}
          {showClass4 && result.niClass4 > 0 && (
            <StatRow label="NI Class 4 (Self-Employed)" value={fmt(result.niClass4)} />
          )}
          {result.niClass2 > 0 && (
            <StatRow label="NI Class 2 (Voluntary)" value={fmt(result.niClass2)} />
          )}
          {result.dividendTax > 0 && (
            <StatRow label="Dividend Tax"         value={fmt(result.dividendTax)} />
          )}
          {result.studentLoanRepayment > 0 && (
            <StatRow label="Student Loan"         value={fmt(result.studentLoanRepayment)} />
          )}

          <div style={{ height: '1px', background: C.gold, opacity: 0.2, margin: '12px 0' }} />
          <StatRow label="Total Deductions"      value={fmt(result.totalDeductions)} />
          <StatRow label="Effective Rate"        value={pct(result.effectiveTaxRate)} />
          <StatRow label="Net Take-Home"         value={fmt(result.netTakeHome)} highlight />

          <p style={{ marginTop: '1.25rem', color: 'rgba(229,231,235,0.3)', fontSize: '0.7rem', lineHeight: 1.5 }}>
            Estimates only. Not financial advice. Figures based on 2026/27 HMRC rates.
          </p>
        </div>
      </div>

      {/* ── 2026/27 HMRC KEY FIGURES PANEL ── */}
      <div style={{
        marginTop: '1.5rem', background: C.card2, border: `1px solid ${C.border}`,
        borderRadius: '10px', padding: '1.5rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.1rem' }}>
          <Info size={16} style={{ color: C.gold }} />
          <h3 style={{ color: C.gold, fontFamily: 'var(--font-playfair)', fontSize: '0.95rem', fontWeight: 700, margin: 0 }}>
            2026/27 HMRC Key Figures &amp; Thresholds
          </h3>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: '0.65rem' }}>
          {HMRC_2627.map((item) => (
            <div key={item.label} style={{
              background: 'rgba(255,215,0,0.04)', border: `1px solid rgba(255,215,0,0.1)`,
              borderRadius: '6px', padding: '0.7rem 0.9rem',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                <div style={{ color: C.muted, fontSize: '0.73rem', lineHeight: 1.4 }}>{item.label}</div>
                <div style={{ color: C.gold, fontSize: '0.82rem', fontWeight: 700, flexShrink: 0 }}>{item.value}</div>
              </div>
              {item.note && (
                <div style={{ color: 'rgba(229,231,235,0.3)', fontSize: '0.68rem', marginTop: '3px' }}>{item.note}</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── EXPENSE SUGGESTION PANEL ── */}
      {form.employmentType !== 'employed' && (
        <div style={{
          marginTop: '1.5rem', background: C.card2, border: `1px solid ${C.border}`,
          borderRadius: '10px', padding: '1.5rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
            <Info size={16} style={{ color: C.gold }} />
            <h3 style={{ color: C.gold, fontFamily: 'var(--font-playfair)', fontSize: '0.95rem', fontWeight: 700, margin: 0 }}>
              Common Allowable Expenses for {form.employmentType === 'director' ? 'Directors / Ltd Companies' : 'Self-Employed'}
            </h3>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: '0.6rem' }}>
            {(form.employmentType === 'director'
              ? DIRECTOR_EXPENSES
              : SELF_EMPLOYED_EXPENSES
            ).map((item) => (
              <div key={item.label} style={{
                background: 'rgba(255,215,0,0.04)', border: `1px solid rgba(255,215,0,0.1)`,
                borderRadius: '6px', padding: '0.65rem 0.85rem',
              }}>
                <div style={{ color: C.text, fontSize: '0.82rem', fontWeight: 600 }}>{item.label}</div>
                <div style={{ color: C.muted, fontSize: '0.72rem', marginTop: '2px' }}>{item.desc}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

const SELF_EMPLOYED_EXPENSES = [
  { label: 'Use of Home',          desc: 'HMRC flat rate: £6/wk (£312/yr) or % of actual costs' },
  { label: 'SIPP Pension',         desc: 'Contribute up to £60k/yr — reduces taxable profit directly' },
  { label: 'Professional Fees',    desc: 'Accountants, lawyers, subscriptions relevant to trade' },
  { label: 'Equipment & Tech',     desc: 'Laptops, phones, software — 100% deductible if solely business' },
  { label: 'Travel & Mileage',     desc: '45p/mile first 10,000 miles · 25p/mile thereafter' },
  { label: 'Training & CPD',       desc: 'Courses, books, conferences to maintain existing skills' },
  { label: 'Marketing',            desc: 'Website, ads, business cards — fully allowable' },
  { label: 'Bank Charges',         desc: 'Business account fees and transaction costs' },
]

const HMRC_2627 = [
  { label: 'Personal Allowance',           value: '12,570',       note: 'Tapered above 100k; nil above 125,140' },
  { label: 'Basic Rate (rUK)',              value: '20%',          note: 'On income 12,571 - 50,270' },
  { label: 'Higher Rate (rUK)',             value: '40%',          note: 'On income 50,271 - 125,140' },
  { label: 'Additional Rate (rUK)',         value: '45%',          note: 'On income above 125,140' },
  { label: 'Employer NI',                  value: '15%',          note: 'From April 2025; secondary threshold 5,000' },
  { label: 'NI Class 1 (Employee)',         value: '8% / 2%',     note: 'Up to / above 50,270 upper earnings limit' },
  { label: 'NI Class 4 (Self-Employed)',    value: '6% / 2%',     note: 'Up to / above 50,270' },
  { label: 'New State Pension',             value: '241.30/wk',   note: '12,547.60/yr; requires 35 qualifying years' },
  { label: 'Basic State Pension',           value: '184.90/wk',   note: 'Pre-2016 retirees; 30 qualifying years' },
  { label: 'Pension Annual Allowance',      value: '60,000',      note: 'Max tax-relieved pension contributions' },
  { label: 'Money Purchase Annual Allowance', value: '10,000',    note: 'MPAA: triggered by flexible drawdown' },
  { label: 'Pension Lump Sum Allowance',    value: '268,275',     note: 'Lifetime limit on tax-free cash' },
  { label: 'CGT Annual Exemption',          value: '3,000',       note: 'Applies to gains on assets sold in the year' },
  { label: 'CGT BADR Rate',                 value: '18%',         note: 'Business Asset Disposal Relief (was 10%)' },
  { label: 'Dividend Allowance',            value: '500',         note: 'Tax-free dividend income' },
  { label: 'Child Benefit Taper Starts',    value: '60,000',      note: 'High Income Child Benefit Charge threshold' },
  { label: 'Child Benefit Full Repayment',  value: '80,000',      note: '100% clawed back above this income' },
  { label: 'MTD IT Threshold',              value: '50,000',      note: 'Making Tax Digital for SE/property income' },
  { label: 'ISA Annual Allowance',          value: '20,000',      note: 'Per tax year; gains and income tax-free' },
]

const DIRECTOR_EXPENSES = [
  { label: 'Director Salary',      desc: 'Set at NI threshold (£12,570) to minimise NI liability' },
  { label: 'Dividends',            desc: '£500 tax-free allowance · 10.75% basic rate beyond that' },
  { label: 'Pension (Employer)',   desc: 'Company pension contributions reduce corporation tax' },
  { label: 'Company Equipment',    desc: 'Fully deductible via Annual Investment Allowance' },
  { label: 'R&D Relief',           desc: 'SME R&D: 186% super-deduction on qualifying expenditure' },
  { label: 'Mileage / Travel',     desc: '45p/mile for business travel; company car via P11D' },
  { label: 'Office Costs',         desc: 'Rent, utilities, broadband — % business use allowable' },
  { label: 'Professional Subs',    desc: 'HMRC-approved professional body memberships' },
]
