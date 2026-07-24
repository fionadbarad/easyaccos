'use client'

import { useState, useMemo } from 'react'
import { Copy, CheckCheck, FileText } from 'lucide-react'
import { calcScenario1 } from '@/lib/tax-engine'
import { useUserData } from '@/lib/use-user-data'
import { TRANSACTIONS_SEED, type Transaction } from '@/lib/transactions/seed'
import { C } from '@/styles/palette'
import { buildMonthly, computePnL, isCogs } from '@/features/pnl/calc'
import { PnLOverview } from '@/features/pnl/PnLOverview'
import { IncomeStatement, type CogsFields } from '@/features/pnl/IncomeStatement'

type View = 'overview' | 'income-statement'

export default function PnLPage() {
  const { items: txs, persist } = useUserData<Transaction>(
    'user_transactions',
    'easyacco_transactions',
    TRANSACTIONS_SEED,
  )
  const [copied, setCopied] = useState(false)
  const [view, setView] = useState<View>('overview')

  const monthly = useMemo(() => buildMonthly(txs), [txs])
  const figures = useMemo(() => computePnL(txs), [txs])
  const { totalRevenue, costOfSales, grossProfit, opEx, ebitda, netProfit, expensesTotal } = figures

  const taxCalc = useMemo(() => {
    if (netProfit <= 0) return { incomeTax: 0, nationalInsurance: 0, totalDeductions: 0 }
    return calcScenario1({
      grossIncome: totalRevenue,
      expenses: expensesTotal,
      employmentType: 'self-employed',
      pension: 0,
    })
  }, [totalRevenue, expensesTotal, netProfit])

  const taxProvision = taxCalc.totalDeductions
  const profitAfterTax = netProfit - taxProvision

  async function addCogs({ date, description, amount }: CogsFields) {
    const tag = isCogs(description) ? description : `COGS — ${description}`
    await persist([
      {
        id: crypto.randomUUID(),
        date,
        description: tag,
        type: 'expense',
        amount,
        reference: '',
      },
      ...txs,
    ])
  }

  function exportSA103CSV() {
    const rows: Array<[string, string]> = [
      ['SA103 Self-Employment (Short) — 2026/27', ''],
      ['Generated', new Date().toISOString()],
      ['', ''],
      ['Box 9  Turnover (Total Revenue)', totalRevenue.toFixed(2)],
      ['Box 10 Other business income', '0.00'],
      ['Box 11 Cost of goods bought (COGS)', costOfSales.toFixed(2)],
      ['Box 17 Other allowable business expenses', opEx.toFixed(2)],
      ['Box 20 Total allowable expenses', expensesTotal.toFixed(2)],
      ['Box 21 Net profit / (loss)', netProfit.toFixed(2)],
      ['', ''],
      ['— Tax provision (indicative) —', ''],
      ['Income Tax', taxCalc.incomeTax.toFixed(2)],
      ['National Insurance (Class 4)', taxCalc.nationalInsurance.toFixed(2)],
      ['Profit after tax', profitAfterTax.toFixed(2)],
    ]
    // CSV-injection safe: prefix cells that start with formula triggers (=, +, -, @, tab, CR)
    // with a single quote so spreadsheet apps treat them as text, not formulas.
    const safe = (c: string) => {
      let s = String(c)
      if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`
      return `"${s.replace(/"/g, '""')}"`
    }
    const csv = rows.map((r) => r.map(safe).join(',')).join('\r\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `SA103-easyacco-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  function exportJSON() {
    const payload = {
      generated: new Date().toISOString(),
      fiscalYear: '2026/27',
      summary: {
        totalRevenue: Math.round(totalRevenue),
        costOfSales,
        grossProfit,
        opEx,
        ebitda,
        taxProvision: Math.round(taxProvision),
        profitAfterTax: Math.round(profitAfterTax),
      },
      monthlyBreakdown: monthly,
      transactions: txs,
    }
    navigator.clipboard
      .writeText(JSON.stringify(payload, null, 2))
      .then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2500)
      })
      .catch(() => alert('Clipboard access denied — check browser permissions.'))
  }

  const btnBase: React.CSSProperties = {
    padding: '7px 14px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.78rem',
    fontWeight: 500,
    minHeight: '36px',
    transition: 'all 0.1s',
  }

  return (
    <div style={{ padding: 'clamp(1.5rem,4vw,2.5rem)', maxWidth: '960px' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}
      >
        <div>
          <div
            style={{
              color: C.muted,
              fontSize: '0.62rem',
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              marginBottom: '5px',
              fontFamily: 'var(--font-geist-mono), monospace',
            }}
          >
            reports
          </div>
          <h1
            style={{
              color: C.white,
              fontSize: 'clamp(1.4rem,3vw,1.9rem)',
              fontWeight: 600,
              letterSpacing: '-0.03em',
              margin: 0,
            }}
          >
            Financial Reports
          </h1>
          <p
            style={{
              color: C.muted,
              fontSize: '0.78rem',
              marginTop: '4px',
              fontFamily: 'var(--font-geist-mono), monospace',
            }}
          >
            2026/27 · GBP · HMRC-compliant
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          {(['overview', 'income-statement'] as View[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              style={{
                ...btnBase,
                background: view === v ? 'rgba(244,245,248,0.08)' : 'transparent',
                border: `1px solid ${view === v ? 'rgba(244,245,248,0.2)' : C.border}`,
                color: view === v ? C.white : C.muted,
              }}
            >
              {v === 'overview' ? 'Overview' : 'Income Statement'}
            </button>
          ))}
          <button
            onClick={exportJSON}
            style={{
              ...btnBase,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: copied ? 'rgba(74,222,128,0.08)' : C.surface,
              border: `1px solid ${copied ? 'rgba(74,222,128,0.25)' : C.border}`,
              color: copied ? C.green : C.muted,
            }}
          >
            {copied ? <CheckCheck size={13} /> : <Copy size={13} />}
            {copied ? 'Copied' : 'Export JSON'}
          </button>
          <button
            onClick={exportSA103CSV}
            title="SA103 self-assessment pre-fill CSV"
            style={{
              ...btnBase,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: C.surface,
              border: `1px solid ${C.border}`,
              color: C.muted,
            }}
          >
            <FileText size={13} /> Export SA103 CSV
          </button>
        </div>
      </div>

      {/* MTD Alert */}
      {totalRevenue >= 50_000 && (
        <div
          style={{
            background: 'rgba(251,191,36,0.06)',
            border: '1px solid rgba(251,191,36,0.2)',
            borderRadius: '4px',
            padding: '0.8rem 1rem',
            marginBottom: '1.5rem',
            display: 'flex',
            gap: '0.65rem',
            alignItems: 'flex-start',
          }}
        >
          <span
            style={{
              color: C.amber,
              fontSize: '0.75rem',
              fontWeight: 700,
              fontFamily: 'var(--font-geist-mono), monospace',
              flexShrink: 0,
            }}
          >
            MTD
          </span>
          <div>
            <span style={{ color: C.amber, fontWeight: 600, fontSize: '0.82rem' }}>
              Making Tax Digital — registration required
            </span>
            <p style={{ color: C.muted, fontSize: '0.75rem', margin: '2px 0 0', lineHeight: 1.5 }}>
              Turnover exceeds{' '}
              <span style={{ color: C.white, fontFamily: 'var(--font-geist-mono), monospace' }}>
                £50,000
              </span>
              . Register for MTD ITSA before <span style={{ color: C.white }}>6 April 2026</span>.
            </p>
          </div>
        </div>
      )}

      {view === 'overview' && (
        <PnLOverview
          figures={figures}
          monthly={monthly}
          taxProvision={taxProvision}
          profitAfterTax={profitAfterTax}
        />
      )}

      {view === 'income-statement' && (
        <IncomeStatement
          figures={figures}
          tax={taxCalc}
          taxProvision={taxProvision}
          profitAfterTax={profitAfterTax}
          onAddCogs={addCogs}
        />
      )}
    </div>
  )
}
