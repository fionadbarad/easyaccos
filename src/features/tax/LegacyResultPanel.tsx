'use client'

// Result renderer for welfare + job-loss scenarios. These flow through
// calcScenario3/4 which produce ScenarioResult (pre-rendered line items),
// not the calculateTax shape — hence a separate panel.

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react'
import { C } from '@/styles/palette'
import { round2, type ScenarioResult } from '@/lib/tax-scenarios'
import { cardStyle, fmt, pct } from './tokens'

export default function LegacyResultPanel({ result }: { result: ScenarioResult }) {
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

      <div style={{
        background: 'rgba(244,245,248,0.04)', border: `1px solid rgba(244,245,248,0.1)`,
        borderRadius: '10px', padding: '1rem 1.2rem', marginBottom: '1.25rem',
      }}>
        <p style={{ color: C.text, fontSize: '0.85rem', lineHeight: 1.6, margin: 0 }}>{result.catMessage}</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
        {[
          { label: 'Net Take-Home',     value: fmt(result.netTakeHome),              color: C.white },
          { label: 'Total Tax',         value: fmt(result.totalDeductions),          color: C.red },
          { label: 'Effective Rate',    value: pct(result.effectiveRate),            color: C.blue },
          { label: 'Monthly Take-Home', value: fmt(round2(result.netTakeHome / 12)), color: C.green },
        ].map((s) => (
          <div key={s.label} style={{ background: C.deep, border: `1px solid ${C.border}`, borderRadius: '8px', padding: '1rem' }}>
            <div style={{ color: C.muted, fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>{s.label}</div>
            <div style={{ color: s.color, fontWeight: 700, fontSize: '1.1rem' }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div style={cardStyle}>
        <button onClick={() => setExpanded(v => !v)}
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: expanded ? '1rem' : 0 }}>
          <span style={{ color: C.muted, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Full Breakdown</span>
          {expanded ? <ChevronUp size={16} style={{ color: C.muted }} /> : <ChevronDown size={16} style={{ color: C.muted }} />}
        </button>
        <AnimatePresence>
          {expanded && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
              {result.lines.map((line, i) => (
                <div key={i} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '7px 0', paddingLeft: line.indent ? '16px' : 0,
                  borderBottom: `1px solid rgba(244,245,248,0.06)`,
                }}>
                  <span style={{ color: line.bold ? C.text : C.muted, fontSize: line.bold ? '0.87rem' : '0.82rem', fontWeight: line.bold ? 700 : 400 }}>
                    {line.label}
                  </span>
                  <span style={{
                    color: line.bold ? C.white : line.negative ? C.red : C.text,
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
