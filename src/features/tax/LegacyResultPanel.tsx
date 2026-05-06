'use client'

// Result renderer for welfare + job-loss scenarios. These flow through
// calcScenario3/4 which produce ScenarioResult (pre-rendered line items),
// not the calculateTax shape - hence a separate panel.

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react'
import { round2, type ScenarioResult } from '@/lib/TaxBible2026'
import { fmt, pct } from './tokens'

export default function LegacyResultPanel({ result }: { result: ScenarioResult }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      {result.sixtyTrap && (
        <div className="bg-[rgba(251,146,60,0.08)] border border-[rgba(251,146,60,0.4)] rounded-lg p-[0.85rem_1.1rem] mb-5 flex gap-[0.6rem]">
          <AlertTriangle size={16} className="text-[#FB923C] shrink-0 mt-0.5" />
          <div>
            <div className="text-[#FB923C] font-bold text-[0.85rem]">60% Tax Trap Active</div>
            <div className="text-[var(--sa-white)] text-[0.8rem] mt-0.5 leading-[1.5]">
              Income between £100k–£125,140. Each £2 earned = £1 of PA lost. Effective rate is 60%.
            </div>
          </div>
        </div>
      )}

      <div className="bg-[rgba(244,245,248,0.04)] border border-[rgba(244,245,248,0.1)] rounded-[10px] p-[1rem_1.2rem] mb-5">
        <p className="text-[var(--sa-white)] text-[0.85rem] leading-[1.6] m-0">{result.catMessage}</p>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3 mb-5">
        {[
          { label: 'Net Take-Home',     value: fmt(result.netTakeHome),              color: 'var(--sa-white)' },
          { label: 'Total Tax',         value: fmt(result.totalDeductions),          color: '#F87171' },
          { label: 'Effective Rate',    value: pct(result.effectiveRate),            color: '#93C5FD' },
          { label: 'Monthly Take-Home', value: fmt(round2(result.netTakeHome / 12)), color: '#4ADE80' },
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
          <span className="text-[rgba(244,245,248,0.42)] text-[0.78rem] uppercase tracking-[0.08em]">Full Breakdown</span>
          {expanded ? <ChevronUp size={16} className="text-[rgba(244,245,248,0.42)]" /> : <ChevronDown size={16} className="text-[rgba(244,245,248,0.42)]" />}
        </button>
        <AnimatePresence>
          {expanded && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
              {result.lines.map((line, i) => (
                <div key={i} className={`flex justify-between items-center py-[7px] border-b border-[rgba(244,245,248,0.06)] ${line.indent ? 'pl-[16px]' : 'pl-0'}`}>
                  <span className={`${line.bold ? 'text-[var(--sa-white)] text-[0.87rem] font-bold' : 'text-[rgba(244,245,248,0.42)] text-[0.82rem] font-normal'}`}>
                    {line.label}
                  </span>
                  <span className={`${line.bold ? 'font-bold text-base text-[var(--sa-white)]' : `font-medium text-[0.85rem] ${line.negative ? 'text-[#F87171]' : 'text-[var(--sa-white)]'}`}`}>
                    {line.negative ? '-' : ''}{fmt(line.value)}
                  </span>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <p className="text-[rgba(244,245,248,0.42)] text-[0.68rem] text-center mt-4">
        2026/27 HMRC Compliant | Encrypted via Supabase
      </p>
    </motion.div>
  )
}
