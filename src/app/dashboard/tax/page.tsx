'use client'

import { useState, useMemo } from 'react'
import {
  calculateTax, validateTaxInput,
  type TaxInput, type TaxResult, type ValidationErrors,
  type EmploymentType, type TaxRegion, type StudentLoanPlan,
  STUDENT_LOAN_LABELS,
} from '@/lib/tax-logic'
import {
  AlertTriangle, Info, ChevronDown, ChevronUp,
  Download, Lightbulb, CheckCircle,
} from 'lucide-react'

// ─── Palette ─────────────────────────────────────────────────────────────────
const C = {
  bg:       '#0B0E1A',
  deep:     '#050A14',
  card:     '#111827',
  card2:    '#0F1C2E',
  gold:     '#FFD700',
  goldSoft: '#C2A368',
  text:     '#E5E7EB',
  muted:    'rgba(229,231,235,0.55)',
  border:   'rgba(255,215,0,0.15)',
  red:      '#FF6B6B',
  green:    '#4ADE80',
  blue:     '#60A5FA',
  orange:   '#FB923C',
}

const fmt  = (n: number) => 'GBP' + Math.round(Math.abs(n)).toLocaleString('en-GB')
const fmtF = (n: number) => (n < 0 ? '-' : '') + fmt(n)
const pct  = (n: number) => n.toFixed(1) + '%'

// Replace 'GBP' prefix with the pound sign for display
const gbp = (s: string) => s.replace('GBP', '\u00a3')

const labelStyle: React.CSSProperties = {
  display: 'block', color: C.muted, fontSize: '0.72rem',
  letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.4rem',
}
const baseInput: React.CSSProperties = {
  width: '100%', background: C.deep, border: `1px solid ${C.border}`,
  borderRadius: '6px', padding: '10px 13px', color: C.text,
  fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box',
}
const errInput:  React.CSSProperties = { ...baseInput, border: `1px solid ${C.red}` }
const selectStyle: React.CSSProperties = { ...baseInput, cursor: 'pointer', appearance: 'none' }

// ─── Sub-components ───────────────────────────────────────────────────────────
function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null
  return (
    <p style={{ color: C.red, fontSize: '0.72rem', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
      <AlertTriangle size={11} /> {msg}
    </p>
  )
}

function StatRow({ label, value, highlight, sub, formula }: {
  label: string; value: string; highlight?: boolean; sub?: string; formula?: string
}) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
      padding: '9px 0', borderBottom: `1px solid rgba(255,215,0,0.07)`,
    }}>
      <div>
        <span style={{ color: C.muted, fontSize: '0.82rem' }}>{label}</span>
        {sub     && <span style={{ display: 'block', color: 'rgba(229,231,235,0.3)', fontSize: '0.68rem', marginTop: '2px' }}>{sub}</span>}
        {formula && <span style={{ display: 'block', color: C.blue, fontSize: '0.68rem', fontFamily: 'monospace', marginTop: '2px', opacity: 0.8 }}>{formula}</span>}
      </div>
      <span style={{
        color: highlight ? C.gold : C.text,
        fontWeight: highlight ? 700 : 500,
        fontSize: highlight ? '1.05rem' : '0.9rem',
        flexShrink: 0, marginLeft: '8px',
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
        flexWrap: 'wrap',
      }}>
        {options.map((opt) => (
          <button key={opt.value} onClick={() => onChange(opt.value)}
            style={{
              padding: '7px 14px', borderRadius: '6px', border: 'none',
              cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600,
              transition: 'all 0.18s ease',
              background: value === opt.value ? C.gold : 'transparent',
              color:      value === opt.value ? '#0B0E1A' : C.muted,
            }}>
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}

function MoneyInput({ label, value, onChange, error, hint, max }: {
  label: string; value: number; onChange: (v: number) => void
  error?: string; hint?: string; max?: number
}) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <div style={{ position: 'relative' }}>
        <span style={{
          position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)',
          color: C.muted, fontSize: '0.9rem', pointerEvents: 'none',
        }}>{'\u00a3'}</span>
        <input
          type="number" min={0} max={max ?? 9_999_999} value={value || ''}
          onChange={(e) => onChange(Math.max(0, Number(e.target.value)))}
          style={{ ...(error ? errInput : baseInput), paddingLeft: '26px' }}
        />
      </div>
      <FieldError msg={error} />
      {!error && hint && <p style={{ color: C.muted, fontSize: '0.7rem', marginTop: '4px' }}>{hint}</p>}
    </div>
  )
}

// ─── Print / PDF ──────────────────────────────────────────────────────────────
function printReport(form: TaxInput, r: TaxResult) {
  const empLabel = form.employmentType === 'self-employed' ? 'Self-Employed'
    : form.employmentType === 'director' ? 'Director / Ltd' : 'Employed'
  const regionLabel = form.taxRegion === 'scotland' ? 'Scotland' : 'England / Wales / NI'
  const rows = [
    ['Gross Revenue',         gbp(fmt(r.grossRevenue))          ],
    ['Allowable Expenses',    gbp(fmt(r.allowableExpenses))     ],
    ['Pension Contribution',  gbp(fmt(r.pensionContribution))   ],
    ['Gross Profit',          gbp(fmt(r.grossProfit))           ],
    ['Personal Allowance',    gbp(fmt(r.personalAllowance))     ],
    ['Taxable Income',        gbp(fmt(r.taxableIncome))         ],
    ...r.taxBands.map(b => [`Income Tax ${b.rate}%`, gbp(fmt(b.tax))]),
    ['Income Tax Total',      gbp(fmt(r.incomeTax))             ],
    r.niClass1 > 0 ? ['NI Class 1', gbp(fmt(r.niClass1))]    : null,
    r.niClass4 > 0 ? ['NI Class 4', gbp(fmt(r.niClass4))]    : null,
    r.niClass2 > 0 ? ['NI Class 2', gbp(fmt(r.niClass2))]    : null,
    r.dividendTax > 0 ? ['Dividend Tax', gbp(fmt(r.dividendTax))] : null,
    r.studentLoanRepayment > 0 ? ['Student Loan', gbp(fmt(r.studentLoanRepayment))] : null,
    ['', ''],
    ['Total Deductions',      gbp(fmt(r.totalDeductions))       ],
    ['Effective Rate',        pct(r.effectiveTaxRate)           ],
    ['Net Take-Home',         gbp(fmt(r.netTakeHome))           ],
  ].filter(Boolean) as [string, string][]

  const rowsHtml = rows.map(([l, v]) =>
    l === ''
      ? `<tr><td colspan="2" style="border-top:2px solid #FFD700;padding:4px 0"></td></tr>`
      : `<tr><td style="padding:7px 0;color:#999;border-bottom:1px solid #f0f0f0">${l}</td><td style="padding:7px 0;text-align:right;font-weight:600;border-bottom:1px solid #f0f0f0">${v}</td></tr>`
  ).join('')

  const html = `<!DOCTYPE html><html><head><title>EasyAcco Tax Report 2026/27</title>
<style>
  body{font-family:Georgia,serif;max-width:600px;margin:40px auto;color:#222;font-size:15px}
  h1{font-size:1.6rem;border-bottom:3px solid #FFD700;padding-bottom:8px;margin-bottom:4px}
  .meta{color:#666;font-size:0.85rem;margin-bottom:24px}
  table{width:100%;border-collapse:collapse}
  .take-home{font-size:1.25rem;font-weight:700;color:#222;background:#FFF9E6;padding:12px;border-radius:6px;margin-top:16px;text-align:right}
  .disclaimer{margin-top:32px;font-size:0.75rem;color:#999;border-top:1px solid #eee;padding-top:12px;line-height:1.5}
  @media print{body{margin:20px}}
</style></head><body>
<h1>EasyAcco Tax Estimate 2026/27</h1>
<div class="meta">${empLabel} &middot; ${regionLabel} &middot; Generated ${new Date().toLocaleDateString('en-GB')}</div>
<table>${rowsHtml}</table>
<div class="take-home">Net Take-Home: ${gbp(fmt(r.netTakeHome))} &nbsp;(${pct(r.effectiveTaxRate)} effective rate)</div>
<div class="disclaimer">Estimates only. Not financial advice. Based on 2026/27 HMRC published rates. Figures are approximate and do not account for all personal circumstances. Consult a qualified accountant before making tax decisions. EasyAcco &mdash; easyacco.vercel.app</div>
</body></html>`

  const w = window.open('', '_blank', 'width=700,height=900')
  if (w) { w.document.write(html); w.document.close(); setTimeout(() => w.print(), 400) }
}

// ─── Tip icon helper ──────────────────────────────────────────────────────────
function TipIcon({ id }: { id: string }) {
  if (id === 'pension-60pct')    return <span style={{ fontSize: '1.2rem' }}>{'⚡'}</span>
  if (id === 'pension-higher')   return <span style={{ fontSize: '1.2rem' }}>{'🏦'}</span>
  if (id === 'director-structure') return <span style={{ fontSize: '1.2rem' }}>{'🏢'}</span>
  if (id === 'isa')              return <span style={{ fontSize: '1.2rem' }}>{'🛡️'}</span>
  return <span style={{ fontSize: '1.2rem' }}>{'💡'}</span>
}

// ─── Default form ─────────────────────────────────────────────────────────────
const INITIAL: TaxInput = {
  grossRevenue:         45_000,
  allowableExpenses:    0,
  dividendIncome:       0,
  pensionContribution:  0,
  employmentType:       'self-employed',
  taxRegion:            'ruk',
  studentLoanPlan:      'none',
  voluntaryClass2NI:    false,
  marriageAllowance:    false,
  blindPersonsAllowance: false,
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function TaxPage() {
  const [form, setForm]               = useState<TaxInput>(INITIAL)
  const [showBreakdown, setBreakdown] = useState(false)
  const [showHmrc, setShowHmrc]       = useState(false)

  const errors: ValidationErrors = useMemo(() => validateTaxInput(form), [form])
  const hasErrors = Object.keys(errors).length > 0
  const result: TaxResult = useMemo(() => calculateTax(form), [form])

  function set<K extends keyof TaxInput>(key: K, val: TaxInput[K]) {
    setForm((f) => ({ ...f, [key]: val }))
  }

  const totalIncome  = result.adjustedProfit + form.dividendIncome
  const takeHomePct  = totalIncome > 0 ? (result.netTakeHome / totalIncome) * 100 : 100
  const showDividend = form.employmentType === 'director' || form.dividendIncome > 0
  const showClass1   = form.employmentType === 'employed'  || form.employmentType === 'director'
  const showClass4   = form.employmentType === 'self-employed'
  const showClass2   = form.employmentType === 'self-employed'

  const inputS = (field: keyof ValidationErrors) =>
    errors[field] ? errInput : baseInput

  return (
    <div style={{ padding: 'clamp(1.25rem,4vw,2.5rem)', maxWidth: '980px' }}>

      {/* ── Header ── */}
      <h1 style={{
        fontFamily: 'var(--font-playfair)', color: C.text,
        fontSize: 'clamp(1.5rem,3vw,2rem)', fontWeight: 700, marginBottom: '0.25rem',
      }}>
        Tax Estimator
      </h1>
      <p style={{ color: C.muted, fontSize: '0.875rem', marginBottom: '1.5rem' }}>
        2026/27 fiscal year &middot; HMRC-accurate &middot; Profit-based &middot; Dividend rates 8.75% / 33.75%
      </p>

      {/* ── 60% TRAP ALERT ── */}
      {result.sixtyPercentTrap && (
        <div style={{
          background: 'rgba(255,215,0,0.08)', border: `1px solid ${C.gold}`,
          borderRadius: '8px', padding: '1rem 1.25rem', marginBottom: '1rem',
          display: 'flex', gap: '0.75rem', alignItems: 'flex-start',
        }}>
          <AlertTriangle size={20} style={{ color: C.gold, flexShrink: 0, marginTop: '1px' }} />
          <div>
            <div style={{ color: C.gold, fontWeight: 700, fontSize: '0.9rem', marginBottom: '3px' }}>
              60% Effective Tax Trap Active
            </div>
            <div style={{ color: C.text, fontSize: '0.82rem', lineHeight: 1.55 }}>
              Your income ({gbp(fmt(result.adjustedProfit))}) is between{' '}
              <strong style={{ color: C.gold }}>{'\u00a3'}100,000 and {'\u00a3'}125,140</strong>.
              Your Personal Allowance is being tapered at {'\u00a3'}1 per {'\u00a3'}2 of excess income,
              creating an effective 60% marginal rate. A SIPP pension contribution of{' '}
              <strong style={{ color: C.gold }}>{gbp(fmt(result.adjustedProfit - 100_000))}</strong>{' '}
              brings you back to {'\u00a3'}100,000 and restores your full allowance.
            </div>
          </div>
        </div>
      )}

      {/* ── MTD WARNING ── */}
      {result.mtdWarning && (
        <div style={{
          background: 'rgba(96,165,250,0.08)', border: `1px solid rgba(96,165,250,0.4)`,
          borderRadius: '8px', padding: '0.9rem 1.2rem', marginBottom: '1rem',
          display: 'flex', gap: '0.75rem', alignItems: 'flex-start',
        }}>
          <Info size={18} style={{ color: C.blue, flexShrink: 0, marginTop: '1px' }} />
          <div>
            <div style={{ color: C.blue, fontWeight: 700, fontSize: '0.88rem', marginBottom: '2px' }}>
              MTD ITSA — Making Tax Digital
            </div>
            <div style={{ color: C.text, fontSize: '0.8rem', lineHeight: 1.5 }}>
              Your gross income exceeds{' '}
              <strong style={{ color: C.blue }}>{'\u00a3'}50,000</strong>. From April 2026
              you may be required to comply with Making Tax Digital for Income Tax Self Assessment.
              Quarterly digital submissions to HMRC replace the annual Self Assessment return.
              Speak to your accountant about compatible software.
            </div>
          </div>
        </div>
      )}

      {/* ── MAIN GRID: inputs + results ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))', gap: '1.5rem' }}>

        {/* INPUT CARD */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '10px', padding: '1.75rem' }}>
          <h2 style={{ color: C.gold, fontFamily: 'var(--font-playfair)', fontSize: '1.05rem', fontWeight: 700, marginBottom: '1.5rem' }}>
            Income Details
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>

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

            <PillToggle<TaxRegion>
              label="Tax Region"
              value={form.taxRegion}
              onChange={(v) => set('taxRegion', v)}
              options={[
                { value: 'ruk',      label: 'England / Wales / NI' },
                { value: 'scotland', label: 'Scotland'              },
              ]}
            />

            {/* Gross Revenue */}
            <MoneyInput
              label={form.employmentType === 'employed' ? 'Gross Annual Salary' : 'Gross Revenue / Turnover'}
              value={form.grossRevenue}
              onChange={(v) => set('grossRevenue', v)}
              error={errors.grossRevenue}
            />

            {/* Allowable Expenses */}
            {form.employmentType !== 'employed' && (
              <MoneyInput
                label="Allowable Expenses"
                value={form.allowableExpenses}
                onChange={(v) => set('allowableExpenses', v)}
                error={errors.allowableExpenses}
                hint={'Tax is calculated on Profit (Revenue minus Expenses)'}
              />
            )}

            {/* Pension Contribution */}
            <MoneyInput
              label="SIPP / Pension Contribution"
              value={form.pensionContribution}
              onChange={(v) => set('pensionContribution', v)}
              error={errors.pensionContribution}
              hint={'Reduces adjusted net income — gets full tax relief at your marginal rate. Max £60,000/yr.'}
              max={60_000}
            />

            {/* Dividend Income */}
            {showDividend && (
              <MoneyInput
                label="Dividend Income"
                value={form.dividendIncome}
                onChange={(v) => set('dividendIncome', v)}
                error={errors.dividendIncome}
                hint={'\u00a3500 allowance \u00b7 8.75% basic rate / 33.75% higher rate / 39.35% additional'}
              />
            )}

            {/* Student Loan */}
            <div>
              <label style={labelStyle}>Student Loan Plan</label>
              <select
                value={form.studentLoanPlan}
                onChange={(e) => set('studentLoanPlan', e.target.value as StudentLoanPlan)}
                style={selectStyle}
              >
                {(Object.keys(STUDENT_LOAN_LABELS) as StudentLoanPlan[]).map((k) => (
                  <option key={k} value={k}>{STUDENT_LOAN_LABELS[k]}</option>
                ))}
              </select>
            </div>

            {/* NI Class 2 */}
            {showClass2 && (
              result.niClass2Mandatory ? (
                <div style={{
                  background: 'rgba(74,222,128,0.07)', border: `1px solid rgba(74,222,128,0.25)`,
                  borderRadius: '6px', padding: '0.7rem 0.9rem',
                  display: 'flex', gap: '8px', alignItems: 'flex-start',
                }}>
                  <CheckCircle size={14} style={{ color: C.green, marginTop: '2px', flexShrink: 0 }} />
                  <span style={{ color: C.muted, fontSize: '0.8rem', lineHeight: 1.5 }}>
                    <strong style={{ color: C.text }}>NI Class 2 — auto-applied ({'\u00a3'}3.65/wk)</strong><br />
                    <span style={{ fontSize: '0.7rem', color: 'rgba(229,231,235,0.35)' }}>
                      Profit exceeds {'\u00a3'}6,845 Small Profits Threshold — Class 2 NI is mandatory
                    </span>
                  </span>
                </div>
              ) : (
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={form.voluntaryClass2NI}
                    onChange={(e) => set('voluntaryClass2NI', e.target.checked)}
                    style={{ width: '15px', height: '15px', accentColor: C.gold, marginTop: '2px', flexShrink: 0 }} />
                  <span style={{ color: C.muted, fontSize: '0.82rem', lineHeight: 1.5 }}>
                    Voluntary Class 2 NI — {'\u00a3'}3.65/week ({'\u00a3'}189.80/yr)<br />
                    <span style={{ color: 'rgba(229,231,235,0.35)', fontSize: '0.7rem' }}>
                      Profit is below {'\u00a3'}6,845 SPT — pay voluntarily to protect State Pension entitlement
                    </span>
                  </span>
                </label>
              )
            )}

            {/* Marriage Allowance */}
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}>
              <input type="checkbox" checked={form.marriageAllowance}
                onChange={(e) => set('marriageAllowance', e.target.checked)}
                style={{ width: '15px', height: '15px', accentColor: C.gold, marginTop: '2px', flexShrink: 0 }} />
              <span style={{ color: C.muted, fontSize: '0.82rem', lineHeight: 1.5 }}>
                Marriage / Civil Partnership Allowance<br />
                <span style={{ color: 'rgba(229,231,235,0.35)', fontSize: '0.7rem' }}>
                  Transfers {'\u00a3'}1,260 of PA to your spouse — saves them up to {'\u00a3'}252/yr
                </span>
              </span>
            </label>

            {/* Blind Person's Allowance */}
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}>
              <input type="checkbox" checked={form.blindPersonsAllowance}
                onChange={(e) => set('blindPersonsAllowance', e.target.checked)}
                style={{ width: '15px', height: '15px', accentColor: C.gold, marginTop: '2px', flexShrink: 0 }} />
              <span style={{ color: C.muted, fontSize: '0.82rem', lineHeight: 1.5 }}>
                Blind Person&apos;s Allowance — +{'\u00a3'}3,250 tax-free<br />
                <span style={{ color: 'rgba(229,231,235,0.35)', fontSize: '0.7rem' }}>
                  2026/27 indexed rate &middot; registered blind or severely sight-impaired
                </span>
              </span>
            </label>

          </div>
        </div>

        {/* RESULTS CARD */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '10px', padding: '1.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ color: C.gold, fontFamily: 'var(--font-playfair)', fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>
              Tax Breakdown
            </h2>
            <button
              onClick={() => !hasErrors && printReport(form, result)}
              disabled={hasErrors}
              title="Download / Print PDF"
              style={{
                display: 'flex', alignItems: 'center', gap: '5px',
                background: hasErrors ? 'rgba(255,215,0,0.12)' : 'rgba(255,215,0,0.15)',
                border: `1px solid ${C.border}`, borderRadius: '6px',
                padding: '6px 11px', cursor: hasErrors ? 'not-allowed' : 'pointer',
                color: hasErrors ? C.muted : C.gold, fontSize: '0.75rem', fontWeight: 600,
              }}>
              <Download size={13} /> PDF
            </button>
          </div>

          {hasErrors ? (
            <div style={{
              background: 'rgba(255,107,107,0.08)', border: `1px solid rgba(255,107,107,0.3)`,
              borderRadius: '8px', padding: '1rem', textAlign: 'center',
            }}>
              <AlertTriangle size={22} style={{ color: C.red, marginBottom: '6px' }} />
              <p style={{ color: C.red, fontSize: '0.85rem', margin: 0 }}>Fix the errors in the form to see your breakdown.</p>
            </div>
          ) : (
            <>
              {/* Take-home bar */}
              <div style={{ marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                  <span style={{ color: C.muted, fontSize: '0.78rem' }}>Take-home rate</span>
                  <span style={{ color: C.gold, fontWeight: 700, fontSize: '0.9rem' }}>{pct(takeHomePct)}</span>
                </div>
                <div style={{ height: '8px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', width: `${Math.min(100, takeHomePct)}%`,
                    background: `linear-gradient(90deg, ${C.gold}, #FFA500)`,
                    borderRadius: '4px', transition: 'width 0.4s ease',
                  }} />
                </div>
              </div>

              {/* Main rows */}
              <StatRow label="Gross Revenue"      value={gbp(fmt(result.grossRevenue))} />
              {result.allowableExpenses > 0 && (
                <StatRow label="Allowable Expenses" value={`- ${gbp(fmt(result.allowableExpenses))}`} />
              )}
              {result.pensionContribution > 0 && (
                <StatRow label="Pension Contribution" value={`- ${gbp(fmt(result.pensionContribution))}`}
                  sub={'Full tax relief at your marginal rate'} />
              )}
              <StatRow label="Adjusted Profit"   value={gbp(fmt(result.adjustedProfit))} />
              <StatRow label="Personal Allowance" value={gbp(fmt(result.personalAllowance))}
                sub={result.taperWarning ? '⚠ Tapered — income above £100,000' : undefined} />
              <StatRow label="Taxable Income"     value={gbp(fmt(result.taxableIncome))} />

              {result.taxBands.map((b) => (
                <StatRow key={b.label}
                  label={`${b.label} (${b.rate}%)`}
                  value={gbp(fmt(b.tax))}
                  formula={`${gbp(fmt(b.amount))} × ${b.rate}%`}
                />
              ))}
              <StatRow label="Income Tax Total"   value={gbp(fmt(result.incomeTax))} />

              {showClass1 && result.niClass1 > 0 && (
                <StatRow label="NI Class 1 (Employee)" value={gbp(fmt(result.niClass1))}
                  formula={'8% on earnings £12,570–£50,270; 2% above'} />
              )}
              {showClass4 && result.niClass4 > 0 && (
                <StatRow label="NI Class 4 (SE)" value={gbp(fmt(result.niClass4))}
                  formula={'6% on profit £12,570–£50,270; 2% above'} />
              )}
              {result.niClass2 > 0 && (
                <StatRow
                  label={`NI Class 2 (${result.niClass2Mandatory ? 'Mandatory' : 'Voluntary'})`}
                  value={gbp(fmt(result.niClass2))}
                  sub={'£3.65/wk × 52 = £189.80/yr — protects State Pension entitlement'}
                />
              )}
              {result.dividendTax > 0 && (
                <StatRow label="Dividend Tax" value={gbp(fmt(result.dividendTax))}
                  sub={'8.75% basic / 33.75% higher / 39.35% additional · first £500 tax-free'} />
              )}
              {result.studentLoanRepayment > 0 && (
                <StatRow label="Student Loan" value={gbp(fmt(result.studentLoanRepayment))} />
              )}

              <div style={{ height: '1px', background: C.gold, opacity: 0.18, margin: '10px 0' }} />
              <StatRow label="Total Deductions"  value={gbp(fmt(result.totalDeductions))} />
              <StatRow label="Effective Rate"    value={pct(result.effectiveTaxRate)} />
              <StatRow label="Net Take-Home"     value={gbp(fmt(result.netTakeHome))} highlight />

              {/* Breakdown toggle */}
              <button
                onClick={() => setBreakdown((v) => !v)}
                style={{
                  marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '6px',
                  background: 'none', border: `1px solid ${C.border}`, borderRadius: '6px',
                  padding: '7px 12px', color: C.goldSoft, cursor: 'pointer', fontSize: '0.78rem', width: '100%',
                }}>
                {showBreakdown ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                {showBreakdown ? 'Hide calculation steps' : 'How is this calculated?'}
              </button>

              {showBreakdown && (
                <div style={{
                  marginTop: '0.75rem', background: C.deep, borderRadius: '8px',
                  padding: '1rem', border: `1px solid rgba(255,215,0,0.08)`,
                }}>
                  <p style={{ color: C.muted, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.75rem' }}>
                    Step-by-step calculation
                  </p>
                  {result.breakdown.filter((s) => s.value !== 0).map((step, i) => (
                    <div key={i} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                      padding: '6px 0', borderBottom: `1px solid rgba(255,215,0,0.05)`,
                    }}>
                      <div>
                        <span style={{ color: C.text, fontSize: '0.8rem' }}>{step.label}</span>
                        <span style={{ display: 'block', color: 'rgba(229,231,235,0.35)', fontSize: '0.68rem', maxWidth: '220px', lineHeight: 1.4 }}>{step.note}</span>
                      </div>
                      <span style={{
                        color: step.value < 0 ? C.red : C.green,
                        fontWeight: 600, fontSize: '0.82rem', flexShrink: 0, marginLeft: '8px',
                      }}>
                        {step.value < 0 ? '- ' : '+ '}{gbp(fmt(step.value))}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Disclaimer */}
          <div style={{
            marginTop: '1.25rem', background: 'rgba(255,255,255,0.02)',
            border: `1px solid rgba(255,215,0,0.06)`, borderRadius: '6px', padding: '0.75rem',
          }}>
            <p style={{ color: 'rgba(229,231,235,0.3)', fontSize: '0.68rem', lineHeight: 1.6, margin: 0 }}>
              <strong style={{ color: 'rgba(229,231,235,0.5)' }}>Estimates only. Not financial advice.</strong>{' '}
              Figures are based on 2026/27 HMRC published rates and are for guidance only.
              Individual circumstances vary. Consult a qualified accountant or HMRC before
              making tax decisions. EasyAcco accepts no liability for tax assessments.
            </p>
          </div>
        </div>
      </div>

      {/* ── OPTIMIZATION TIPS ── */}
      {!hasErrors && result.optimizationTips.length > 0 && (
        <div style={{
          marginTop: '1.5rem', background: C.card2,
          border: `1px solid ${C.border}`, borderRadius: '10px', padding: '1.5rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.1rem' }}>
            <Lightbulb size={16} style={{ color: C.gold }} />
            <h3 style={{ color: C.gold, fontFamily: 'var(--font-playfair)', fontSize: '0.95rem', fontWeight: 700, margin: 0 }}>
              Tax Optimisation Suggestions
            </h3>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: '0.75rem' }}>
            {result.optimizationTips.map((tip) => (
              <div key={tip.id} style={{
                background: 'rgba(255,215,0,0.04)', border: `1px solid rgba(255,215,0,0.12)`,
                borderRadius: '8px', padding: '1rem',
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                  <TipIcon id={tip.id} />
                  <div>
                    <div style={{ color: C.text, fontWeight: 700, fontSize: '0.85rem', marginBottom: '5px' }}>
                      {tip.title}
                      {tip.saving > 0 && (
                        <span style={{
                          marginLeft: '8px', background: 'rgba(74,222,128,0.15)',
                          color: C.green, fontSize: '0.7rem', padding: '2px 7px',
                          borderRadius: '999px', fontWeight: 600,
                        }}>
                          Save ~{gbp(fmt(tip.saving))}
                        </span>
                      )}
                    </div>
                    <p style={{ color: C.muted, fontSize: '0.78rem', lineHeight: 1.55, margin: 0 }}>
                      {tip.description.replace(/GBP/g, '\u00a3')}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── 2026/27 HMRC KEY FIGURES ── */}
      <div style={{
        marginTop: '1.5rem', background: C.card2,
        border: `1px solid ${C.border}`, borderRadius: '10px', padding: '1.5rem',
      }}>
        <button
          onClick={() => setShowHmrc((v) => !v)}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: 0,
          }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Info size={15} style={{ color: C.gold }} />
            <span style={{ color: C.gold, fontFamily: 'var(--font-playfair)', fontSize: '0.95rem', fontWeight: 700 }}>
              2026/27 HMRC Key Figures &amp; Thresholds
            </span>
          </div>
          {showHmrc ? <ChevronUp size={16} style={{ color: C.muted }} /> : <ChevronDown size={16} style={{ color: C.muted }} />}
        </button>

        {showHmrc && (
          <div style={{ marginTop: '1rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(255px,1fr))', gap: '0.6rem' }}>
            {HMRC_2627.map((item) => (
              <div key={item.label} style={{
                background: 'rgba(255,215,0,0.03)', border: `1px solid rgba(255,215,0,0.09)`,
                borderRadius: '6px', padding: '0.65rem 0.85rem',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                  <div style={{ color: C.muted, fontSize: '0.72rem', lineHeight: 1.4 }}>{item.label}</div>
                  <div style={{ color: C.gold, fontSize: '0.82rem', fontWeight: 700, flexShrink: 0 }}>{item.value}</div>
                </div>
                {item.note && (
                  <div style={{ color: 'rgba(229,231,235,0.28)', fontSize: '0.67rem', marginTop: '3px' }}>{item.note}</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── EXPENSE SUGGESTIONS ── */}
      {form.employmentType !== 'employed' && (
        <div style={{
          marginTop: '1.5rem', background: C.card2,
          border: `1px solid ${C.border}`, borderRadius: '10px', padding: '1.5rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
            <Info size={15} style={{ color: C.gold }} />
            <h3 style={{ color: C.gold, fontFamily: 'var(--font-playfair)', fontSize: '0.95rem', fontWeight: 700, margin: 0 }}>
              Common Allowable Expenses —{' '}
              {form.employmentType === 'director' ? 'Directors / Ltd Companies' : 'Self-Employed'}
            </h3>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: '0.55rem' }}>
            {(form.employmentType === 'director' ? DIRECTOR_EXPENSES : SE_EXPENSES).map((item) => (
              <div key={item.label} style={{
                background: 'rgba(255,215,0,0.03)', border: `1px solid rgba(255,215,0,0.08)`,
                borderRadius: '6px', padding: '0.6rem 0.8rem',
              }}>
                <div style={{ color: C.text, fontSize: '0.82rem', fontWeight: 600 }}>{item.label}</div>
                <div style={{ color: C.muted, fontSize: '0.7rem', marginTop: '2px' }}>{item.desc}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Static data ──────────────────────────────────────────────────────────────
const SE_EXPENSES = [
  { label: 'Use of Home',       desc: 'HMRC flat rate: £6/wk (£312/yr) or % of actual costs'        },
  { label: 'SIPP Pension',      desc: 'Up to £60,000/yr — reduces taxable profit at marginal rate'   },
  { label: 'Professional Fees', desc: 'Accountants, solicitors, trade subscriptions'                  },
  { label: 'Equipment & Tech',  desc: 'Laptops, phones, software — 100% if solely business'           },
  { label: 'Travel & Mileage',  desc: '45p/mile (first 10,000 miles) then 25p/mile'                  },
  { label: 'Training & CPD',    desc: 'Courses and books to maintain existing skills'                 },
  { label: 'Marketing',         desc: 'Website, ads, business cards — fully allowable'                },
  { label: 'Bank Charges',      desc: 'Business account fees and transaction costs'                   },
]

const DIRECTOR_EXPENSES = [
  { label: 'Director Salary',    desc: 'Set at NI threshold (£12,570) — maximises take-home'         },
  { label: 'Dividends',          desc: '£500 tax-free allowance · 8.75% basic / 33.75% higher'       },
  { label: 'Employer Pension',   desc: 'Company contributions reduce corporation tax'                  },
  { label: 'Company Equipment',  desc: 'Fully deductible via Annual Investment Allowance'             },
  { label: 'R&D Relief',         desc: 'SME R&D credit on qualifying expenditure'                     },
  { label: 'Mileage / Travel',   desc: '45p/mile for business; company car via P11D'                  },
  { label: 'Office / WFH',       desc: 'Rent, utilities, broadband — % business use allowable'        },
  { label: 'Professional Subs',  desc: 'HMRC-approved professional body memberships'                  },
]

const HMRC_2627 = [
  { label: 'Personal Allowance',             value: '£12,570',      note: 'Tapered above £100k; nil above £125,140'            },
  { label: 'Basic Rate (rUK)',               value: '20%',           note: '£12,571 – £50,270 (band width £37,700)'             },
  { label: 'Higher Rate (rUK)',              value: '40%',           note: '£50,271 – £125,140'                                  },
  { label: 'Additional Rate (rUK)',          value: '45%',           note: 'Above £125,140'                                      },
  { label: 'Dividend — Basic Rate',          value: '8.75%',         note: 'In basic rate band (first £500 tax-free)'            },
  { label: 'Dividend — Higher Rate',         value: '33.75%',        note: 'In higher rate band'                                 },
  { label: 'Dividend — Additional Rate',     value: '39.35%',        note: 'Above £125,140'                                     },
  { label: 'Employer NI',                   value: '15%',            note: 'From April 2025; secondary threshold £5,000'        },
  { label: 'NI Class 1 (Employee)',          value: '8% / 2%',       note: 'Up to / above £50,270 upper earnings limit'         },
  { label: 'NI Class 4 (SE)',               value: '6% / 2%',        note: 'Up to / above £50,270'                              },
  { label: 'NI Class 2 (SE, mandatory)',     value: '£3.65/wk',      note: 'Auto-applied if profit ≥ £6,845 SPT'                },
  { label: 'New State Pension',             value: '£241.30/wk',     note: '£12,547.60/yr · requires 35 qualifying NI years'    },
  { label: 'Basic State Pension',           value: '£184.90/wk',     note: 'Pre-2016 retirees · 30 qualifying years'            },
  { label: 'Pension Annual Allowance',      value: '£60,000',        note: 'Max tax-relieved contributions per year'            },
  { label: 'Money Purchase AA (MPAA)',       value: '£10,000',       note: 'Triggered once you access flexible drawdown'        },
  { label: 'Pension Lump Sum Allowance',    value: '£268,275',       note: 'Lifetime limit on tax-free pension cash'            },
  { label: 'CGT Annual Exemption',          value: '£3,000',         note: 'Gains on assets sold; excess at 18% / 24%'         },
  { label: 'CGT BADR Rate',                value: '18%',             note: 'Business Asset Disposal Relief (was 10%)'           },
  { label: 'ISA Annual Allowance',          value: '£20,000',        note: 'All income/gains inside ISA are tax-free'           },
  { label: 'Child Benefit Taper',           value: '£60,000',        note: 'HICBC starts; full repayment at £80,000'            },
  { label: 'MTD ITSA Threshold',            value: '£50,000',        note: 'Gross SE/property income triggers MTD from Apr 2026'},
]
