'use client'

// Renders calculateTax output: top-line cards, collapsible full breakdown,
// optimisation tips, and trap/MTD advisories. Annual/Monthly toggle switches
// the display but not the underlying figures (always computed annually).

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, ChevronUp, AlertTriangle, Info, Lightbulb, TrendingDown } from 'lucide-react'
import { C } from '@/styles/palette'
import type { TaxResult } from '@/lib/tax-logic'
import { round2 } from '@/lib/tax-scenarios'
import { CARD_CLASS, toggleClass, fmt, pct } from './tokens'
import { T } from '@/styles/type'

export default function FullResultPanel({
  result,
  showMonthly,
  setShowMonthly,
}: {
  result: TaxResult
  showMonthly: boolean
  setShowMonthly: (v: boolean) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [tipsOpen, setTipsOpen] = useState(false)
  const m = result.monthly

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* The contribution was capped below what the user entered — say so, and
          say which ceiling did it. Silence here meant the breakdown quietly
          disagreed with their own input with no explanation (TAX-15). */}
      {result.annualAllowanceExceeded && (
        <div
          style={{
            background: 'rgba(96,165,250,0.08)',
            border: '1px solid rgba(96,165,250,0.3)',
            borderRadius: '8px',
            padding: '0.75rem 1rem',
            marginBottom: '1.25rem',
            display: 'flex',
            gap: '0.6rem',
          }}
        >
          <Info size={16} style={{ color: '#60A5FA', flexShrink: 0, marginTop: '2px' }} />
          <div>
            <div style={{ color: '#60A5FA', fontWeight: 700, fontSize: T.body }}>
              Pension capped at {fmt(result.annualAllowance)}
            </div>
            <div style={{ color: C.text, fontSize: T.meta, marginTop: '2px', lineHeight: 1.5 }}>
              Your annual allowance for this year is {fmt(result.annualAllowance)}
              {result.annualAllowance < 60_000
                ? ' — reduced from £60,000 by the taper on high incomes, or by the Money Purchase Annual Allowance if you have flexibly accessed a pot'
                : ''}
              , so relief below is calculated on that figure rather than the full amount you
              entered. Carry-forward of unused allowance from the previous three tax years is not
              modelled here — if you have any, your real relief may be higher.
            </div>
          </div>
        </div>
      )}

      {result.sixtyPercentTrap && (
        <div
          style={{
            background: 'rgba(251,146,60,0.08)',
            border: '1px solid rgba(251,146,60,0.4)',
            borderRadius: '8px',
            padding: '0.85rem 1.1rem',
            marginBottom: '1.25rem',
            display: 'flex',
            gap: '0.6rem',
          }}
        >
          <AlertTriangle size={16} style={{ color: '#FB923C', flexShrink: 0, marginTop: '2px' }} />
          <div>
            <div style={{ color: '#FB923C', fontWeight: 700, fontSize: T.body }}>
              60% Tax Trap Active
            </div>
            <div style={{ color: C.text, fontSize: T.meta, marginTop: '2px', lineHeight: 1.5 }}>
              Income between £100k–£125,140. Each £2 earned = £1 of PA lost. Pension contributions
              are the escape route.
            </div>
          </div>
        </div>
      )}

      {result.mtdWarning && (
        <div
          style={{
            background: 'rgba(96,165,250,0.08)',
            border: '1px solid rgba(96,165,250,0.3)',
            borderRadius: '8px',
            padding: '0.75rem 1rem',
            marginBottom: '1.25rem',
            display: 'flex',
            gap: '0.6rem',
          }}
        >
          <Info size={14} style={{ color: C.blue, flexShrink: 0, marginTop: '2px' }} />
          <div style={{ color: C.text, fontSize: T.meta, lineHeight: 1.5 }}>
            <strong style={{ color: C.blue }}>MTD for Income Tax</strong> — Gross revenue over £50k
            means you must file quarterly via Making Tax Digital from April 2026.
          </div>
        </div>
      )}

      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          marginBottom: '0.75rem',
          gap: '0.35rem',
        }}
      >
        <button onClick={() => setShowMonthly(false)} className={toggleClass(!showMonthly)}>
          Annual
        </button>
        <button onClick={() => setShowMonthly(true)} className={toggleClass(showMonthly)}>
          Monthly
        </button>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))',
          gap: '0.75rem',
          marginBottom: '1.25rem',
        }}
      >
        {[
          {
            label: 'Net Take-Home',
            value: fmt(showMonthly ? m.netTakeHome : result.netTakeHome),
            color: C.white,
          },
          {
            label: 'Total Deductions',
            value: fmt(showMonthly ? m.totalDeductions : result.totalDeductions),
            color: C.red,
          },
          { label: 'Effective Rate', value: pct(result.effectiveTaxRate), color: C.blue },
          {
            label: 'Income Tax',
            value: fmt(showMonthly ? m.incomeTax : result.incomeTax),
            color: C.text,
          },
        ].map((s) => (
          <div
            key={s.label}
            style={{
              background: C.deep,
              border: `1px solid ${C.border}`,
              borderRadius: '8px',
              padding: '1rem',
            }}
          >
            <div
              style={{
                color: C.muted,
                fontSize: T.micro,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                marginBottom: '4px',
              }}
            >
              {s.label}
            </div>
            <div style={{ color: s.color, fontWeight: 700, fontSize: T.title }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div className={CARD_CLASS}>
        <button
          onClick={() => setExpanded((v) => !v)}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            width: '100%',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
            marginBottom: expanded ? '1rem' : 0,
          }}
        >
          <span
            style={{
              color: C.muted,
              fontSize: T.caption,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
            }}
          >
            Full Breakdown {showMonthly ? '(Monthly)' : '(Annual)'}
          </span>
          {expanded ? (
            <ChevronUp size={16} style={{ color: C.muted }} />
          ) : (
            <ChevronDown size={16} style={{ color: C.muted }} />
          )}
        </button>
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              {(() => {
                const d = showMonthly ? 12 : 1
                const lines = [
                  {
                    label: 'Gross Revenue',
                    value: result.grossRevenue / d,
                    bold: false,
                    negative: false,
                    indent: false,
                  },
                  {
                    label: 'Allowable Expenses',
                    value: result.allowableExpenses / d,
                    bold: false,
                    negative: true,
                    indent: true,
                  },
                  {
                    label: 'Gross Profit',
                    value: result.grossProfit / d,
                    bold: true,
                    negative: false,
                    indent: false,
                  },
                  {
                    // `pensionContribution` on the result is the contribution
                    // ACTUALLY relieved — capped at relevant earnings and at the
                    // (tapered / MPAA) annual allowance. When that cap bites,
                    // the figure here is smaller than what the user typed, so
                    // the label has to say so rather than silently disagreeing
                    // with their own input (TAX-15).
                    label: result.annualAllowanceExceeded
                      ? 'Pension Contribution (capped)'
                      : 'Pension Contribution',
                    value: result.pensionContribution / d,
                    bold: false,
                    negative: true,
                    indent: true,
                  },
                  {
                    label: 'Adjusted Net Income',
                    value: result.adjustedProfit / d,
                    bold: false,
                    negative: false,
                    indent: false,
                  },
                  {
                    label: 'Personal Allowance',
                    value: result.personalAllowance / d,
                    bold: false,
                    negative: true,
                    indent: true,
                  },
                  {
                    label: 'Taxable Income',
                    value: result.taxableIncome / d,
                    bold: true,
                    negative: false,
                    indent: false,
                  },
                  ...result.taxBands.map((b) => ({
                    label: `${b.label} (${b.rate}%)`,
                    value: b.tax / d,
                    bold: false,
                    negative: true,
                    indent: true,
                  })),
                  {
                    label: 'Income Tax',
                    value: result.incomeTax / d,
                    bold: false,
                    negative: true,
                    indent: false,
                  },
                  ...(result.niClass1 > 0
                    ? [
                        {
                          label: 'NI Class 1 (8%)',
                          value: result.niClass1 / d,
                          bold: false,
                          negative: true,
                          indent: true,
                        },
                      ]
                    : []),
                  ...(result.niClass4 > 0
                    ? [
                        {
                          label: 'NI Class 4 (6%)',
                          value: result.niClass4 / d,
                          bold: false,
                          negative: true,
                          indent: true,
                        },
                      ]
                    : []),
                  ...(result.niClass2 > 0
                    ? [
                        {
                          label: 'NI Class 2 (voluntary)',
                          value: result.niClass2 / d,
                          bold: false,
                          negative: true,
                          indent: true,
                        },
                      ]
                    : []),
                  ...(result.niClass2Deemed
                    ? [
                        {
                          label: 'NI Class 2 (deemed paid — £0)',
                          value: 0,
                          bold: false,
                          negative: false,
                          indent: true,
                        },
                      ]
                    : []),
                  ...(result.dividendTax > 0
                    ? [
                        {
                          label: 'Dividend Tax',
                          value: result.dividendTax / d,
                          bold: false,
                          negative: true,
                          indent: true,
                        },
                      ]
                    : []),
                  ...(result.studentLoanRepayment > 0
                    ? [
                        {
                          label: 'Student Loan Repayment',
                          value: result.studentLoanRepayment / d,
                          bold: false,
                          negative: true,
                          indent: true,
                        },
                      ]
                    : []),
                  {
                    label: 'Total Deductions',
                    value: result.totalDeductions / d,
                    bold: true,
                    negative: true,
                    indent: false,
                  },
                  {
                    label: 'Net Take-Home',
                    value: result.netTakeHome / d,
                    bold: true,
                    negative: false,
                    indent: false,
                  },
                ]
                return lines.map((line, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '7px 0',
                      paddingLeft: line.indent ? '16px' : 0,
                      borderBottom: `1px solid rgba(244,245,248,0.06)`,
                    }}
                  >
                    <span
                      style={{
                        color: line.bold ? C.text : C.muted,
                        fontSize: line.bold ? T.body : T.meta,
                        fontWeight: line.bold ? 700 : 400,
                      }}
                    >
                      {line.label}
                    </span>
                    <span
                      style={{
                        color:
                          line.bold && !line.negative ? C.white : line.negative ? C.red : C.text,
                        fontWeight: line.bold ? 700 : 500,
                        fontSize: line.bold ? T.lead : T.body,
                      }}
                    >
                      {line.negative && line.value > 0 ? '-' : ''}
                      {fmt(round2(line.value))}
                    </span>
                  </div>
                ))
              })()}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {result.optimizationTips.length > 0 && (
        <div className={`${CARD_CLASS} mt-4`}>
          <button
            onClick={() => setTipsOpen((v) => !v)}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              width: '100%',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              marginBottom: tipsOpen ? '1rem' : 0,
            }}
          >
            <span
              style={{
                color: C.green,
                fontSize: T.caption,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Lightbulb size={14} /> Optimization Tips ({result.optimizationTips.length})
            </span>
            {tipsOpen ? (
              <ChevronUp size={16} style={{ color: C.muted }} />
            ) : (
              <ChevronDown size={16} style={{ color: C.muted }} />
            )}
          </button>
          <AnimatePresence>
            {tipsOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}
              >
                {result.optimizationTips.map((tip) => (
                  <div
                    key={tip.id}
                    style={{
                      background: 'rgba(74,222,128,0.05)',
                      border: '1px solid rgba(74,222,128,0.15)',
                      borderRadius: '8px',
                      padding: '0.85rem 1rem',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '4px',
                      }}
                    >
                      <span style={{ color: C.green, fontWeight: 700, fontSize: T.body }}>
                        {tip.title}
                      </span>
                      {tip.saving > 0 && (
                        <span
                          style={{
                            color: C.green,
                            fontSize: T.caption,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '3px',
                          }}
                        >
                          <TrendingDown size={12} /> Save {fmt(tip.saving)}
                        </span>
                      )}
                    </div>
                    <p style={{ color: C.text, fontSize: T.meta, lineHeight: 1.55, margin: 0 }}>
                      {tip.description}
                    </p>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      <p style={{ color: C.muted, fontSize: T.micro, textAlign: 'center', marginTop: '1rem' }}>
        2026/27 HMRC Compliant
      </p>
    </motion.div>
  )
}
