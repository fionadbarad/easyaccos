'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { Copy, CheckCheck, FileText, TrendingUp, TrendingDown } from 'lucide-react'
import { calcScenario1 } from '@/lib/TaxBible2026'

interface Transaction { id: string; date: string; description: string; type: 'income' | 'expense'; amount: number }
const STORAGE_KEY = 'easyacco_transactions'

const SEED: Transaction[] = [
  { id: '1', date: '2026-01-01', description: 'Client A - Consulting',  type: 'income',  amount: 2400   },
  { id: '2', date: '2026-01-10', description: 'Subscriptions',          type: 'expense', amount: 120    },
  { id: '3', date: '2026-02-01', description: 'Client B - Project',     type: 'income',  amount: 3100   },
  { id: '4', date: '2026-02-14', description: 'Travel',                 type: 'expense', amount: 230    },
  { id: '5', date: '2026-03-01', description: 'Client A - Retainer',    type: 'income',  amount: 2800   },
  { id: '6', date: '2026-03-05', description: 'Software Licences',      type: 'expense', amount: 54.99  },
  { id: '7', date: '2026-03-12', description: 'Client C - Design',      type: 'income',  amount: 1800   },
  { id: '8', date: '2026-03-20', description: 'Freelance Writing',       type: 'income',  amount: 750    },
]

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const fmt = (v: number) => `£${Math.round(v).toLocaleString('en-GB')}`
const fmtDp = (v: number) => `£${Math.abs(v).toLocaleString('en-GB', { minimumFractionDigits: 2 })}`

function buildMonthly(txs: Transaction[]) {
  const map: Record<string, { income: number; expenses: number }> = {}
  for (const tx of txs) {
    const m = MONTHS[new Date(tx.date).getMonth()]
    if (!map[m]) map[m] = { income: 0, expenses: 0 }
    if (tx.type === 'income') map[m].income += tx.amount
    else map[m].expenses += tx.amount
  }
  return Object.entries(map).map(([month, d]) => ({ month, ...d, profit: d.income - d.expenses }))
}

function ISLine({
  label = '', value, indent = 0, bold = false, separator = false, highlight = false, negative = false,
}: {
  label?: string; value?: number; indent?: number; bold?: boolean;
  separator?: boolean; highlight?: boolean; negative?: boolean;
}) {
  if (separator) return <div className="border-t border-[var(--sa-border)] my-[5px]" />
  return (
    <div
      className={`flex justify-between items-center ${bold ? 'py-[9px]' : 'py-[6px]'} ${highlight ? 'bg-[rgba(244,245,248,0.03)] rounded-[3px]' : ''}`}
      style={{ paddingLeft: `${indent * 16}px` }}>
      <span className={`${bold ? 'text-[var(--sa-white)] text-[0.82rem] font-semibold' : 'text-[rgba(244,245,248,0.42)] text-[0.78rem] font-normal'}`}>
        {label}
      </span>
      {value !== undefined && (
        <span
          className={`${bold ? 'font-semibold text-[0.9rem]' : 'font-normal text-[0.82rem]'} font-mono tabular-nums`}
          style={{ color: highlight ? 'var(--sa-white)' : negative ? '#F87171' : (bold ? 'var(--sa-white)' : 'rgba(244,245,248,0.42)') }}>
          {negative && value > 0 ? '(' : ''}{fmtDp(value)}{negative && value > 0 ? ')' : ''}
        </span>
      )}
    </div>
  )
}

function StatCard({ label, value, sub, trend }: { label: string; value: string; sub?: string; trend?: 'up' | 'down' }) {
  return (
    <div className="bg-[var(--sa-surface)] border border-[var(--sa-border)] rounded-md p-[1.1rem_1.25rem]">
      <div className="text-[rgba(244,245,248,0.42)] text-[0.65rem] uppercase tracking-[0.08em] mb-1.5 flex items-center gap-[5px] font-semibold">
        {trend === 'up'   && <TrendingUp  size={10} className="text-[#4ADE80]" />}
        {trend === 'down' && <TrendingDown size={10} className="text-[#F87171]" />}
        {label}
      </div>
      <div className="text-[var(--sa-white)] font-semibold text-[1.2rem] tracking-[-0.02em] font-mono tabular-nums">{value}</div>
      {sub && <div className="text-[rgba(244,245,248,0.42)] text-[0.7rem] mt-[3px]">{sub}</div>}
    </div>
  )
}

const tooltipStyle = {
  background: 'var(--sa-surface)', border: `1px solid rgba(244,245,248,0.1)`,
  borderRadius: '4px', color: 'var(--sa-white)', fontSize: '0.75rem',
}

type View = 'overview' | 'income-statement'

export default function PnLPage() {
  const [txs, setTxs] = useState<Transaction[]>([])
  const [copied, setCopied] = useState(false)
  const [copyError, setCopyError] = useState(false)
  const [view, setView] = useState<View>('overview')
  const [cogsForm, setCogsForm] = useState({ date: new Date().toISOString().slice(0, 10), description: '', amount: '' })

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (!saved) { setTxs(SEED); return }
      const parsed = JSON.parse(saved)
      setTxs(Array.isArray(parsed) ? parsed : SEED)
    } catch { setTxs(SEED) }
  }, [])

  const monthly      = buildMonthly(txs)
  const totalRevenue = txs.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const COGS_KEYWORDS = ['material', 'subcontract', 'cogs', 'stock', 'inventory', 'goods', 'purchases', 'wholesale', 'raw ', 'direct cost']
  const isCogs = (desc: string) => {
    const d = desc.toLowerCase()
    return COGS_KEYWORDS.some((k) => d.includes(k))
  }
  const costOfSales  = txs.filter((t) => t.type === 'expense' && isCogs(t.description)).reduce((s, t) => s + t.amount, 0)
  const grossProfit  = totalRevenue - costOfSales
  const cogsItems    = txs.filter((t) => t.type === 'expense' && isCogs(t.description))
  const opEx         = txs.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0) - costOfSales
  const ebitda       = grossProfit - opEx
  const netProfit    = ebitda

  const taxCalc = useMemo(() => {
    if (netProfit <= 0) return { incomeTax: 0, nationalInsurance: 0, totalDeductions: 0 }
    return calcScenario1({
      grossIncome: totalRevenue,
      expenses: txs.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
      employmentType: 'self-employed',
      pension: 0,
    })
  }, [totalRevenue, txs, netProfit])

  const taxProvision   = taxCalc.totalDeductions
  const profitAfterTax = netProfit - taxProvision
  const margin         = totalRevenue > 0 ? (netProfit / totalRevenue * 100) : 0

  function addCogsEntry(e: React.FormEvent) {
    e.preventDefault()
    const amt = parseFloat(cogsForm.amount)
    if (!amt || !cogsForm.description.trim()) return
    const tag = isCogs(cogsForm.description) ? cogsForm.description.trim() : `COGS - ${cogsForm.description.trim()}`
    const next: Transaction[] = [
      { id: crypto.randomUUID(), date: cogsForm.date, description: tag, type: 'expense', amount: amt },
      ...txs,
    ]
    setTxs(next)
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) } catch {}
    setCogsForm({ date: new Date().toISOString().slice(0, 10), description: '', amount: '' })
  }

  function exportSA103CSV() {
    const expensesTotal = txs.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
    const rows: Array<[string, string]> = [
      ['SA103 Self-Employment (Short) - 2026/27', ''],
      ['Generated', new Date().toISOString()],
      ['', ''],
      ['Box 9  Turnover (Total Revenue)', totalRevenue.toFixed(2)],
      ['Box 10 Other business income', '0.00'],
      ['Box 11 Cost of goods bought (COGS)', costOfSales.toFixed(2)],
      ['Box 17 Other allowable business expenses', opEx.toFixed(2)],
      ['Box 20 Total allowable expenses', expensesTotal.toFixed(2)],
      ['Box 21 Net profit / (loss)', netProfit.toFixed(2)],
      ['', ''],
      ['- Tax provision (indicative) -', ''],
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
      generated: new Date().toISOString(), fiscalYear: '2026/27',
      summary: { totalRevenue: Math.round(totalRevenue), costOfSales, grossProfit, opEx, ebitda, taxProvision: Math.round(taxProvision), profitAfterTax: Math.round(profitAfterTax) },
      monthlyBreakdown: monthly, transactions: txs,
    }
    navigator.clipboard.writeText(JSON.stringify(payload, null, 2))
      .then(() => {
        setCopyError(false)
        setCopied(true)
        setTimeout(() => setCopied(false), 2500)
      })
      .catch(() => {
        setCopyError(true)
        setTimeout(() => setCopyError(false), 4000)
      })
  }

  const btnBaseClass = 'p-[7px_14px] rounded cursor-pointer text-[0.78rem] font-medium min-h-[36px] transition-all duration-[100ms]'

  return (
    <div className="p-[clamp(1.5rem,4vw,2.5rem)] max-w-[960px]">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
        <div>
          <div className="text-[rgba(244,245,248,0.42)] text-[0.62rem] uppercase tracking-[0.12em] mb-[5px] font-mono">reports</div>
          <h1 className="text-[var(--sa-white)] text-[clamp(1.4rem,3vw,1.9rem)] font-semibold tracking-[-0.03em] m-0">
            Financial Reports
          </h1>
          <p className="text-[rgba(244,245,248,0.42)] text-[0.78rem] mt-1 font-mono">2026/27 · GBP · HMRC-compliant</p>
        </div>
        <div className="flex gap-[0.4rem] flex-wrap">
          {(['overview', 'income-statement'] as View[]).map((v) => (
            <button key={v} onClick={() => setView(v)}
              className={`${btnBaseClass} border ${view === v ? 'bg-[rgba(244,245,248,0.08)] border-[rgba(244,245,248,0.2)] text-[var(--sa-white)]' : 'bg-transparent border-[var(--sa-border)] text-[rgba(244,245,248,0.42)]'}`}>
              {v === 'overview' ? 'Overview' : 'Income Statement'}
            </button>
          ))}
          <button onClick={exportJSON}
            title={copyError ? 'Clipboard access denied - check browser permissions.' : undefined}
            className={`${btnBaseClass} flex items-center gap-1.5 border ${copied ? 'bg-[rgba(74,222,128,0.08)] border-[rgba(74,222,128,0.25)] text-[#4ADE80]' : copyError ? 'bg-[rgba(248,113,113,0.08)] border-[rgba(248,113,113,0.25)] text-[#F87171]' : 'bg-[var(--sa-surface)] border-[var(--sa-border)] text-[rgba(244,245,248,0.42)]'}`}>
            {copied ? <CheckCheck size={13} /> : <Copy size={13} />}
            {copied ? 'Copied' : copyError ? 'Clipboard blocked' : 'Export JSON'}
          </button>
          <button onClick={exportSA103CSV} title="SA103 self-assessment pre-fill CSV" className={`${btnBaseClass} flex items-center gap-1.5 bg-[var(--sa-surface)] border border-[var(--sa-border)] text-[rgba(244,245,248,0.42)]`}>
            <FileText size={13} /> Export SA103 CSV
          </button>
        </div>
      </div>

      {/* MTD Alert */}
      {totalRevenue >= 50_000 && (
        <div className="bg-[rgba(251,191,36,0.06)] border border-[rgba(251,191,36,0.2)] rounded p-[0.8rem_1rem] mb-6 flex gap-[0.65rem] items-start">
          <span className="text-[#FBBF24] text-xs font-bold font-mono shrink-0">MTD</span>
          <div>
            <span className="text-[#FBBF24] font-semibold text-[0.82rem]">Making Tax Digital - registration required</span>
            <p className="text-[rgba(244,245,248,0.42)] text-xs m-[2px_0_0] leading-[1.5]">
              Turnover exceeds <span className="text-[var(--sa-white)] font-mono">£50,000</span>. Register for MTD ITSA before <span className="text-[var(--sa-white)]">6 April 2026</span>.
            </p>
          </div>
        </div>
      )}

      {/* ── OVERVIEW ── */}
      {view === 'overview' && (
        <>
          <div className="grid gap-[1px] border border-[var(--sa-border)] rounded-md overflow-hidden bg-[var(--sa-border)] mb-6"
            style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(165px,1fr))' }}>
            {[
              { label: 'Total Revenue',    value: fmt(totalRevenue),      trend: 'up' as const   },
              { label: 'Total Expenses',   value: fmt(opEx + costOfSales),trend: 'down' as const },
              { label: 'Net Profit',       value: fmt(netProfit),         sub: `${margin.toFixed(1)}% margin`      },
              { label: 'Tax Provision',    value: fmt(taxProvision),      sub: '2026/27 HMRC liability' },
              { label: 'Profit After Tax', value: fmt(profitAfterTax)                               },
            ].map((s) => (
              <div key={s.label} className="bg-[var(--sa-surface)] p-[1rem_1.15rem]">
                <div className="text-[rgba(244,245,248,0.42)] text-[0.63rem] uppercase tracking-[0.07em] font-semibold mb-[5px] flex items-center gap-1">
                  {s.trend === 'up'   && <TrendingUp  size={9} className="text-[#4ADE80]" />}
                  {s.trend === 'down' && <TrendingDown size={9} className="text-[#F87171]" />}
                  {s.label}
                </div>
                <div className="text-[var(--sa-white)] font-semibold text-[1.1rem] tracking-[-0.02em] font-mono">{s.value}</div>
                {s.sub && <div className="text-[rgba(244,245,248,0.42)] text-[0.68rem] mt-0.5">{s.sub}</div>}
              </div>
            ))}
          </div>

          <div className="bg-[var(--sa-surface)] border border-[var(--sa-border)] rounded-md p-5 mb-4">
            <h2 className="text-[var(--sa-white)] text-[0.85rem] font-semibold tracking-[-0.01em] mb-[1.1rem]">Income vs Expenses - Monthly</h2>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={monthly} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="var(--sa-white)" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="var(--sa-white)" stopOpacity={0}    />
                  </linearGradient>
                  <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#F87171" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#F87171" stopOpacity={0}    />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(244,245,248,0.05)" />
                <XAxis dataKey="month" tick={{ fill: 'rgba(244,245,248,0.42)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'rgba(244,245,248,0.42)', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `£${(Number(v)/1000).toFixed(0)}k`} />
                <Tooltip contentStyle={tooltipStyle} formatter={(value) => typeof value === 'number' ? fmt(value) : value} />
                <Legend wrapperStyle={{ fontSize: '0.75rem', color: 'rgba(244,245,248,0.42)' }} />
                <Area type="monotone" dataKey="income"   name="Income"   stroke="var(--sa-white)" strokeWidth={1.5} fill="url(#incomeGrad)" />
                <Area type="monotone" dataKey="expenses" name="Expenses" stroke="#F87171" strokeWidth={1.5} fill="url(#expGrad)"    />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-[var(--sa-surface)] border border-[var(--sa-border)] rounded-md p-5">
            <h2 className="text-[var(--sa-white)] text-[0.85rem] font-semibold tracking-[-0.01em] mb-[1.1rem]">Monthly Net Profit</h2>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={monthly} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(244,245,248,0.05)" />
                <XAxis dataKey="month" tick={{ fill: 'rgba(244,245,248,0.42)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'rgba(244,245,248,0.42)', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `£${(Number(v)/1000).toFixed(0)}k`} />
                <Tooltip contentStyle={tooltipStyle} formatter={(value) => typeof value === 'number' ? fmt(value) : value} />
                <Bar dataKey="profit" name="Net Profit" fill="var(--sa-white)" fillOpacity={0.85} radius={[2,2,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      {/* ── INCOME STATEMENT ── */}
      {view === 'income-statement' && (
        <div className="bg-[var(--sa-surface)] border border-[var(--sa-border)] rounded-md p-7 max-w-[580px]">
          <div className="flex items-center gap-[0.65rem] mb-6">
            <FileText size={16} className="text-[rgba(244,245,248,0.42)]" strokeWidth={1.5} />
            <div>
              <h2 className="text-[var(--sa-white)] text-[0.95rem] font-semibold tracking-[-0.02em] m-0">Income Statement (P&amp;L)</h2>
              <p className="text-[rgba(244,245,248,0.42)] text-[0.68rem] m-0 font-mono">Period ending 5 April 2027 · 2026/27 Fiscal Year</p>
            </div>
          </div>

          <ISLine label="REVENUE" bold />
          <ISLine label="Client Income / Sales"             value={totalRevenue} indent={1} />
          <ISLine label="Total Revenue"                     value={totalRevenue} bold highlight />
          <ISLine separator />

          <ISLine label="COST OF SALES" bold />
          {cogsItems.length === 0 ? (
            <ISLine label="Direct Materials / Subcontractors" value={costOfSales} indent={1} negative />
          ) : (
            cogsItems.slice(0, 6).map((t) => (
              <ISLine key={t.id} label={t.description} value={t.amount} indent={1} negative />
            ))
          )}
          {cogsItems.length > 6 && (
            <ISLine label={`+ ${cogsItems.length - 6} more items`} indent={1} />
          )}
          <ISLine label="Total Cost of Sales"               value={costOfSales} bold negative />

          <form onSubmit={addCogsEntry} className="grid gap-1.5 items-center m-[10px_0_4px] pl-[16px]"
            style={{ gridTemplateColumns: 'auto 1fr 110px auto' }}>
            <input type="date" value={cogsForm.date}
              onChange={(e) => setCogsForm((f) => ({ ...f, date: e.target.value }))}
              className="bg-[var(--sa-gray)] border border-[var(--sa-border)] rounded-[3px] p-[6px_8px] text-[var(--sa-white)] text-[0.72rem] font-mono outline-none" />
            <input type="text" value={cogsForm.description} placeholder="e.g. Raw materials - steel"
              onChange={(e) => setCogsForm((f) => ({ ...f, description: e.target.value }))}
              className="bg-[var(--sa-gray)] border border-[var(--sa-border)] rounded-[3px] p-[6px_8px] text-[var(--sa-white)] text-xs outline-none" />
            <input type="number" min={0} step={0.01} value={cogsForm.amount} placeholder="0.00"
              onChange={(e) => setCogsForm((f) => ({ ...f, amount: e.target.value }))}
              className="bg-[var(--sa-gray)] border border-[var(--sa-border)] rounded-[3px] p-[6px_8px] text-[var(--sa-white)] text-xs text-right font-mono outline-none" />
            <button type="submit" className="bg-[var(--sa-white)] text-[var(--sa-black)] border-none rounded-[3px] p-[6px_12px] text-[0.72rem] font-semibold cursor-pointer">
              + COGS
            </button>
          </form>
          <ISLine separator />

          <ISLine label="GROSS PROFIT" value={grossProfit} bold highlight />
          <ISLine label={`Gross Margin: ${totalRevenue > 0 ? ((grossProfit / totalRevenue) * 100).toFixed(1) : 0}%`} indent={1} />
          <ISLine separator />

          <ISLine label="OPERATING EXPENSES" bold />
          {txs.filter((t) => t.type === 'expense' && !isCogs(t.description)).slice(0, 6).map((t) => (
            <ISLine key={t.id} label={t.description} value={t.amount} indent={1} negative />
          ))}
          {txs.filter((t) => t.type === 'expense' && !isCogs(t.description)).length > 6 && (
            <ISLine label={`+ ${txs.filter((t) => t.type === 'expense' && !isCogs(t.description)).length - 6} more items`} indent={1} />
          )}
          <ISLine label="Total OpEx" value={opEx} bold negative />
          <ISLine separator />

          <ISLine label="NET PROFIT (EBITDA)" value={ebitda} bold highlight />
          <ISLine separator />

          <ISLine label="TAX PROVISION" bold />
          <ISLine label="Income Tax (2026/27)"        value={taxCalc.incomeTax}          indent={1} negative />
          <ISLine label="National Insurance (Class 4)" value={taxCalc.nationalInsurance} indent={1} negative />
          <ISLine label="Total Tax Provision"          value={taxProvision}               bold negative />
          <ISLine separator />

          <div className="bg-[rgba(244,245,248,0.04)] border border-[var(--sa-border)] rounded p-[0.9rem_1rem] mt-1">
            <div className="flex justify-between items-center">
              <span className="text-[var(--sa-white)] font-semibold text-[0.85rem] tracking-[-0.01em]">NET PROFIT AFTER TAX</span>
              <span
                className="font-semibold text-base font-mono tabular-nums"
                style={{ color: profitAfterTax >= 0 ? 'var(--sa-white)' : '#F87171' }}>
                {fmtDp(profitAfterTax)}
              </span>
            </div>
            <div className="text-[rgba(244,245,248,0.42)] text-[0.65rem] mt-1 font-mono">
              2026/27 HMRC compliant · tax calculations run client-side
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
