'use client'

// Renders calculateTax output: top-line cards, collapsible full breakdown,
// optimisation tips, and trap/MTD advisories. Annual/Monthly toggle switches
// the display but not the underlying figures (always computed annually).

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, ChevronUp, AlertTriangle, Info, Lightbulb, TrendingDown } from 'lucide-react'
import type { TaxResult } from '@/lib/tax-logic'
import { round2 } from '@/lib/TaxBible2026'
import { fmt, pct } from './tokens'

export default function FullResultPanel({ result, showMonthly, setShowMonthly }: {
  result: TaxResult; showMonthly: boolean; setShowMonthly: (v: boolean) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [tipsOpen, setTipsOpen] = useState(false)
  const m = result.monthly

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      {result.sixtyPercentTrap && (
        <div className="bg-[rgba(251,146,60,0.08)] border border-[rgba(251,146,60,0.4)] rounded-lg p-[0.85rem_1.1rem] mb-5 flex gap-[0.6rem]">
          <AlertTriangle size={16} className="text-[#FB923C] shrink-0 mt-0.5" />
          <div>
            <div className="text-[#FB923C] font-bold text-[0.85rem]">60% Tax Trap Active</div>
            <div className="text-[var(--sa-white)] text-[0.8rem] mt-0.5 leading-[1.5]">
              Income between £100k–£125,140. Each £2 earned = £1 of PA lost. Pension contributions are the escape route.
            </div>
          </div>
        </div>
      )}

      {result.mtdWarning && (
        <div className="bg-[rgba(96,165,250,0.08)] border border-[rgba(96,165,250,0.3)] rounded-lg p-[0.75rem_1rem] mb-5 flex gap-[0.6rem]">
          <Info size={14} className="text-[#93C5FD] shrink-0 mt-0.5" />
          <div className="text-[var(--sa-white)] text-[0.8rem] leading-[1.5]">
            <strong className="text-[#93C5FD]">MTD for Income Tax</strong> - Gross revenue over £50k means you must file quarterly via Making Tax Digital from April 2026.
          </div>
        </div>
      )}

      <div className="flex justify-end mb-3 gap-[0.35rem]">
        <button onClick={() => setShowMonthly(false)} className={`p-[6px_14px] rounded-md cursor-pointer text-[0.78rem] font-semibold min-h-[36px] transition-all duration-150 ease-in-out ${!showMonthly ? 'bg-[rgba(244,245,248,0.1)] border border-[var(--sa-white)] text-[var(--sa-white)]' : 'bg-transparent border border-[var(--sa-border)] text-[rgba(244,245,248,0.42)]'}`}>Annual</button>
        <button onClick={() => setShowMonthly(true)} className={`p-[6px_14px] rounded-md cursor-pointer text-[0.78rem] font-semibold min-h-[36px] transition-all duration-150 ease-in-out ${showMonthly ? 'bg-[rgba(244,245,248,0.1)] border border-[var(--sa-white)] text-[var(--sa-white)]' : 'bg-transparent border border-[var(--sa-border)] text-[rgba(244,245,248,0.42)]'}`}>Monthly</button>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3 mb-5">
        {[
          { label: 'Net Take-Home', value: fmt(showMonthly ? m.netTakeHome : result.netTakeHome), color: 'var(--sa-white)' },
          { label: 'Total Deductions', value: fmt(showMonthly ? m.totalDeductions : result.totalDeductions), color: '#F87171' },
          { label: 'Effective Rate', value: pct(result.effectiveTaxRate), color: '#93C5FD' },
          { label: 'Income Tax', value: fmt(showMonthly ? m.incomeTax : result.incomeTax), color: 'var(--sa-white)' },
        ].map((s) => (
          <div key={s.label} className="bg-[var(--sa-gray)] border border-[var(--sa-border)] rounded-lg p-4">
            <div className="text-[rgba(244,245,248,0.42)] text-[0.68rem] uppercase tracking-[0.08em] mb-1">{s.label}</div>
            <div style={{ color: s.color }} className="font-bold text-[1.1rem]">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="bg-[var(--sa-surface)] border border-[var(--sa-border)] rounded-[10px] p-6">
        <button onClick={() => setExpanded(v => !v)}
          className={`flex justify-between items-center w-full bg-transparent border-none cursor-pointer p-0 ${expanded ? 'mb-4' : 'mb-0'}`}>
          <span className="text-[rgba(244,245,248,0.42)] text-[0.78rem] uppercase tracking-[0.08em]">Full Breakdown {showMonthly ? '(Monthly)' : '(Annual)'}</span>
          {expanded ? <ChevronUp size={16} className="text-[rgba(244,245,248,0.42)]" /> : <ChevronDown size={16} className="text-[rgba(244,245,248,0.42)]" />}
        </button>
        <AnimatePresence>
          {expanded && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
              {(() => {
                const d = showMonthly ? 12 : 1
                const lines = [
                  { label: 'Gross Revenue',         value: result.grossRevenue / d,        bold: false, negative: false, indent: false },
                  { label: 'Allowable Expenses',    value: result.allowableExpenses / d,   bold: false, negative: true,  indent: true },
                  { label: 'Gross Profit',          value: result.grossProfit / d,         bold: true,  negative: false, indent: false },
                  { label: 'Pension Contribution',  value: result.pensionContribution / d, bold: false, negative: true,  indent: true },
                  { label: 'Adjusted Net Income',   value: result.adjustedProfit / d,      bold: false, negative: false, indent: false },
                  { label: 'Personal Allowance',    value: result.personalAllowance / d,   bold: false, negative: true,  indent: true },
                  { label: 'Taxable Income',        value: result.taxableIncome / d,       bold: true,  negative: false, indent: false },
                  ...(result.taxBands.map(b => ({
                    label: `${b.label} (${b.rate}%)`, value: b.tax / d, bold: false, negative: true, indent: true,
                  }))),
                  { label: 'Income Tax',            value: result.incomeTax / d,           bold: false, negative: true,  indent: false },
                  ...(result.niClass1 > 0 ? [{ label: 'NI Class 1 (8%)',   value: result.niClass1 / d,  bold: false, negative: true, indent: true }] : []),
                  ...(result.niClass4 > 0 ? [{ label: 'NI Class 4 (6%)',   value: result.niClass4 / d,  bold: false, negative: true, indent: true }] : []),
                  ...(result.niClass2 > 0 ? [{ label: 'NI Class 2 (voluntary)', value: result.niClass2 / d, bold: false, negative: true, indent: true }] : []),
                  ...(result.niClass2Deemed ? [{ label: 'NI Class 2 (deemed paid - £0)', value: 0, bold: false, negative: false, indent: true }] : []),
                  ...(result.dividendTax > 0 ? [{ label: 'Dividend Tax', value: result.dividendTax / d, bold: false, negative: true, indent: true }] : []),
                  ...(result.studentLoanRepayment > 0 ? [{ label: 'Student Loan Repayment', value: result.studentLoanRepayment / d, bold: false, negative: true, indent: true }] : []),
                  { label: 'Total Deductions',      value: result.totalDeductions / d,     bold: true,  negative: true,  indent: false },
                  { label: 'Net Take-Home',         value: result.netTakeHome / d,         bold: true,  negative: false, indent: false },
                ]
                return lines.map((line, i) => (
                  <div key={i} className={`flex justify-between items-center py-[7px] border-b border-[rgba(244,245,248,0.06)] ${line.indent ? 'pl-[16px]' : 'pl-0'}`}>
                    <span className={`${line.bold ? 'text-[var(--sa-white)] text-[0.87rem] font-bold' : 'text-[rgba(244,245,248,0.42)] text-[0.82rem] font-normal'}`}>
                      {line.label}
                    </span>
                    <span className={`${line.bold ? 'font-bold text-base' : 'font-medium text-[0.85rem]'} ${line.bold && !line.negative ? 'text-[var(--sa-white)]' : line.negative ? 'text-[#F87171]' : 'text-[var(--sa-white)]'}`}>
                      {line.negative && line.value > 0 ? '-' : ''}{fmt(round2(line.value))}
                    </span>
                  </div>
                ))
              })()}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {result.optimizationTips.length > 0 && (
        <div className="bg-[var(--sa-surface)] border border-[var(--sa-border)] rounded-[10px] p-6 mt-4">
          <button onClick={() => setTipsOpen(v => !v)}
            className={`flex justify-between items-center w-full bg-transparent border-none cursor-pointer p-0 ${tipsOpen ? 'mb-4' : 'mb-0'}`}>
            <span className="text-[#4ADE80] text-[0.78rem] uppercase tracking-[0.08em] flex items-center gap-1.5">
              <Lightbulb size={14} /> Optimization Tips ({result.optimizationTips.length})
            </span>
            {tipsOpen ? <ChevronUp size={16} className="text-[rgba(244,245,248,0.42)]" /> : <ChevronDown size={16} className="text-[rgba(244,245,248,0.42)]" />}
          </button>
          <AnimatePresence>
            {tipsOpen && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                className="flex flex-col gap-3">
                {result.optimizationTips.map((tip) => (
                  <div key={tip.id} className="bg-[rgba(74,222,128,0.05)] border border-[rgba(74,222,128,0.15)] rounded-lg p-[0.85rem_1rem]">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[#4ADE80] font-bold text-[0.85rem]">{tip.title}</span>
                      {tip.saving > 0 && (
                        <span className="text-[#4ADE80] text-[0.78rem] flex items-center gap-[3px]">
                          <TrendingDown size={12} /> Save {fmt(tip.saving)}
                        </span>
                      )}
                    </div>
                    <p className="text-[var(--sa-white)] text-[0.8rem] leading-[1.55] m-0">{tip.description}</p>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      <p className="text-[rgba(244,245,248,0.42)] text-[0.68rem] text-center mt-4">
        2026/27 HMRC Compliant | Encrypted via Supabase
      </p>
    </motion.div>
  )
}
