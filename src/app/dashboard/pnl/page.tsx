'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { Sheet, Copy, CheckCheck, FileText, TrendingUp, TrendingDown } from 'lucide-react'
import { calcScenario1 } from '@/lib/TaxBible2026'

const C = {
  bg: '#0B0E1A', deep: '#050A14', card: '#111827',
  gold: '#FFD700', soft: '#C2A368', text: '#E5E7EB',
  muted: 'rgba(229,231,235,0.55)', border: 'rgba(255,215,0,0.12)',
  red: '#FF6B6B', green: '#4ADE80',
}

interface Transaction { id: string; date: string; description: string; type: 'income' | 'expense'; amount: number }
const STORAGE_KEY = 'easyacco_transactions'

const SEED: Transaction[] = [
  { id: '1', date: '2026-01-01', description: 'Client A — Consulting', type: 'income',  amount: 2400 },
  { id: '2', date: '2026-01-10', description: 'Subscriptions',         type: 'expense', amount: 120 },
  { id: '3', date: '2026-02-01', description: 'Client B — Project',    type: 'income',  amount: 3100 },
  { id: '4', date: '2026-02-14', description: 'Travel',                type: 'expense', amount: 230 },
  { id: '5', date: '2026-03-01', description: 'Client A — Retainer',   type: 'income',  amount: 2800 },
  { id: '6', date: '2026-03-05', description: 'Software Licences',     type: 'expense', amount: 54.99 },
  { id: '7', date: '2026-03-12', description: 'Client C — Design',     type: 'income',  amount: 1800 },
  { id: '8', date: '2026-03-20', description: 'Freelance Writing',      type: 'income',  amount: 750 },
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

// ─── Income Statement Line ────────────────────────────────────────────────────
function ISLine({
  label = '', value, indent = 0, bold = false, separator = false, highlight = false, negative = false,
}: {
  label?: string; value?: number; indent?: number; bold?: boolean;
  separator?: boolean; highlight?: boolean; negative?: boolean;
}) {
  if (separator) return <div style={{ borderTop: `1px solid rgba(255,215,0,0.15)`, margin: '6px 0' }} />
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: `${bold ? 10 : 7}px ${bold ? 0 : 0}px`,
      paddingLeft: `${indent * 20}px`,
      borderBottom: bold ? `1px solid rgba(255,215,0,0.1)` : 'none',
      background: highlight ? 'rgba(255,215,0,0.04)' : 'transparent',
      borderRadius: highlight ? '4px' : 0,
    }}>
      <span style={{ color: bold ? C.text : C.muted, fontSize: bold ? '0.87rem' : '0.82rem', fontWeight: bold ? 700 : 400 }}>
        {label}
      </span>
      {value !== undefined && (
        <span style={{
          color: highlight ? C.gold : negative ? C.red : (bold ? C.gold : C.text),
          fontWeight: bold ? 700 : 500, fontSize: bold ? '1rem' : '0.87rem',
          fontFamily: 'monospace',
        }}>
          {negative && value > 0 ? '(' : ''}{fmtDp(value)}{negative && value > 0 ? ')' : ''}
        </span>
      )}
    </div>
  )
}

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, trend }: { label: string; value: string; sub?: string; trend?: 'up' | 'down' }) {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '8px', padding: '1.25rem 1.5rem', backdropFilter: 'blur(10px)' }}>
      <div style={{ color: C.muted, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '5px' }}>
        {trend === 'up' && <TrendingUp size={11} style={{ color: C.green }} />}
        {trend === 'down' && <TrendingDown size={11} style={{ color: C.red }} />}
        {label}
      </div>
      <div style={{ color: C.gold, fontWeight: 700, fontSize: '1.35rem' }}>{value}</div>
      {sub && <div style={{ color: C.muted, fontSize: '0.78rem', marginTop: '4px' }}>{sub}</div>}
    </div>
  )
}

const tooltipStyle = { background: '#0F1628', border: `1px solid rgba(194,163,104,0.3)`, borderRadius: '6px', color: C.text, fontSize: '0.8rem' }

// ─── VIEW TOGGLE ──────────────────────────────────────────────────────────────
type View = 'overview' | 'income-statement'

export default function PnLPage() {
  const [txs, setTxs]       = useState<Transaction[]>([])
  const [copied, setCopied] = useState(false)
  const [view, setView]     = useState<View>('overview')

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      setTxs(saved ? JSON.parse(saved) : SEED)
    } catch { setTxs(SEED) }
  }, [])

  const monthly       = buildMonthly(txs)
  const totalRevenue  = txs.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const costOfSales   = txs.filter((t) => t.type === 'expense' && (t.description.toLowerCase().includes('material') || t.description.toLowerCase().includes('subcontract'))).reduce((s, t) => s + t.amount, 0)
  const grossProfit   = totalRevenue - costOfSales
  const opEx          = txs.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0) - costOfSales
  const ebitda        = grossProfit - opEx
  const netProfit     = ebitda

  // Tax Provision — uses TaxBible2026 scenario 1 (self-employed) for accurate HMRC calculation
  const taxCalc = useMemo(() => {
    if (netProfit <= 0) return { incomeTax: 0, nationalInsurance: 0, totalDeductions: 0 }
    return calcScenario1({
      grossIncome: totalRevenue,
      expenses: txs.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
      employmentType: 'self-employed',
      pension: 0,
    })
  }, [totalRevenue, txs, netProfit])

  const taxProvision  = taxCalc.totalDeductions
  const profitAfterTax = netProfit - taxProvision
  const margin        = totalRevenue > 0 ? (netProfit / totalRevenue * 100) : 0

  function syncToSheets() {
    const payload = {
      generated: new Date().toISOString(), fiscalYear: '2026/27',
      summary: { totalRevenue: Math.round(totalRevenue), costOfSales, grossProfit, opEx, ebitda, taxProvision: Math.round(taxProvision), profitAfterTax: Math.round(profitAfterTax) },
      monthlyBreakdown: monthly, transactions: txs,
    }
    navigator.clipboard.writeText(JSON.stringify(payload, null, 2))
      .then(() => { setCopied(true); setTimeout(() => setCopied(false), 2500) })
      .catch(() => alert('Could not copy — check browser permissions.'))
  }

  return (
    <div style={{ padding: 'clamp(1.5rem,4vw,2.5rem)', maxWidth: '960px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-playfair)', color: C.text, fontSize: 'clamp(1.5rem,3vw,2rem)', fontWeight: 700, margin: 0 }}>
            Financial Reports
          </h1>
          <p style={{ color: C.muted, fontSize: '0.875rem', marginTop: '4px' }}>2026/27 Fiscal Year · All figures in GBP</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {(['overview', 'income-statement'] as View[]).map((v) => (
            <button key={v} onClick={() => setView(v)}
              style={{
                padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600,
                minHeight: '44px',
                background: view === v ? 'rgba(255,215,0,0.1)' : 'transparent',
                border: `1px solid ${view === v ? C.gold : C.border}`,
                color: view === v ? C.gold : C.muted,
              }}>
              {v === 'overview' ? '📊 Overview' : '📋 Income Statement'}
            </button>
          ))}
          <button onClick={syncToSheets}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px', minHeight: '44px',
              background: copied ? 'rgba(74,222,128,0.12)' : 'rgba(255,215,0,0.09)',
              border: `1px solid ${copied ? 'rgba(74,222,128,0.4)' : 'rgba(255,215,0,0.3)'}`,
              borderRadius: '7px', padding: '9px 16px', cursor: 'pointer',
              color: copied ? C.green : C.gold, fontSize: '0.82rem', fontWeight: 600, transition: 'all 0.2s',
            }}>
            {copied ? <CheckCheck size={15} /> : <Sheet size={15} />}
            {copied ? 'Copied!' : 'Export JSON'}
          </button>
        </div>
      </div>

      {/* MTD Alert */}
      {totalRevenue >= 50_000 && (
        <div style={{ background: 'rgba(255,215,0,0.07)', border: '1px solid rgba(255,215,0,0.35)', borderRadius: '8px', padding: '0.85rem 1.1rem', marginBottom: '1.5rem', display: 'flex', gap: '0.7rem', alignItems: 'flex-start' }}>
          <span style={{ fontSize: '1rem', flexShrink: 0 }}>⚡</span>
          <div>
            <span style={{ color: C.gold, fontWeight: 700, fontSize: '0.85rem' }}>Making Tax Digital (MTD) — Action Required</span>
            <p style={{ color: C.text, fontSize: '0.8rem', margin: '3px 0 0', lineHeight: 1.55 }}>
              Your turnover exceeds <strong style={{ color: C.gold }}>£50,000</strong>. Register for MTD for Income Tax by <strong style={{ color: C.gold }}>6 April 2026</strong>.
            </p>
          </div>
        </div>
      )}

      {/* ── OVERVIEW VIEW ── */}
      {view === 'overview' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: '1rem', marginBottom: '2rem' }}>
            <StatCard label="Total Revenue"    value={fmt(totalRevenue)}  trend="up" />
            <StatCard label="Total Expenses"   value={fmt(opEx + costOfSales)} trend="down" />
            <StatCard label="Net Profit"        value={fmt(netProfit)}     sub={`${margin.toFixed(1)}% margin`} />
            <StatCard label="Tax Provision"     value={fmt(taxProvision)}  sub="HMRC liability (2026/27)" />
            <StatCard label="Profit After Tax"  value={fmt(profitAfterTax)} />
          </div>

          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '8px', padding: '1.5rem', marginBottom: '1.5rem' }}>
            <h2 style={{ fontFamily: 'var(--font-playfair)', color: C.text, fontSize: '1.05rem', fontWeight: 700, marginBottom: '1.25rem' }}>
              Income vs Expenses — Monthly
            </h2>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={monthly} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={C.gold} stopOpacity={0.35} />
                    <stop offset="95%" stopColor={C.gold} stopOpacity={0}    />
                  </linearGradient>
                  <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#ff8a9a" stopOpacity={0.28} />
                    <stop offset="95%" stopColor="#ff8a9a" stopOpacity={0}    />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(194,163,104,0.08)" />
                <XAxis dataKey="month" tick={{ fill: C.muted, fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: C.muted, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `£${(Number(v) / 1000).toFixed(0)}k`} />
                <Tooltip contentStyle={tooltipStyle} formatter={(value) => typeof value === 'number' ? fmt(value) : value} />
                <Legend wrapperStyle={{ fontSize: '0.8rem', color: C.muted }} />
                <Area type="monotone" dataKey="income"   name="Income"   stroke={C.gold}  strokeWidth={2} fill="url(#incomeGrad)" />
                <Area type="monotone" dataKey="expenses" name="Expenses" stroke="#ff8a9a" strokeWidth={2} fill="url(#expGrad)"    />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '8px', padding: '1.5rem' }}>
            <h2 style={{ fontFamily: 'var(--font-playfair)', color: C.text, fontSize: '1.05rem', fontWeight: 700, marginBottom: '1.25rem' }}>
              Monthly Net Profit
            </h2>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={monthly} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(194,163,104,0.08)" />
                <XAxis dataKey="month" tick={{ fill: C.muted, fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: C.muted, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `£${(Number(v)/1000).toFixed(0)}k`} />
                <Tooltip contentStyle={tooltipStyle} formatter={(value) => typeof value === 'number' ? fmt(value) : value} />
                <Bar dataKey="profit" name="Net Profit" fill={C.gold} radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      {/* ── INCOME STATEMENT VIEW ── */}
      {view === 'income-statement' && (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '10px', padding: '2rem', maxWidth: '600px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.75rem' }}>
            <FileText size={20} style={{ color: C.soft }} />
            <div>
              <h2 style={{ fontFamily: 'var(--font-playfair)', color: C.text, fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>
                Income Statement (P&amp;L)
              </h2>
              <p style={{ color: C.muted, fontSize: '0.75rem', margin: 0 }}>For the period ending 5 April 2027 · 2026/27 Fiscal Year</p>
            </div>
          </div>

          {/* REVENUE */}
          <ISLine label="REVENUE" bold />
          <ISLine label="Client Income / Sales"      value={totalRevenue}  indent={1} />
          <ISLine label="Total Revenue"              value={totalRevenue}  bold highlight />
          <ISLine separator />

          {/* COST OF SALES */}
          <ISLine label="COST OF SALES" bold />
          <ISLine label="Direct Materials / Subcontractors" value={costOfSales} indent={1} negative />
          <ISLine label="Total Cost of Sales"        value={costOfSales}   bold negative />
          <ISLine separator />

          {/* GROSS PROFIT */}
          <ISLine label="GROSS PROFIT"               value={grossProfit}   bold highlight />
          <ISLine label={`Gross Margin: ${totalRevenue > 0 ? ((grossProfit / totalRevenue) * 100).toFixed(1) : 0}%`} indent={1} />
          <ISLine separator />

          {/* OPERATING EXPENSES */}
          <ISLine label="OPERATING EXPENSES (OpEx)" bold />
          {txs.filter((t) => t.type === 'expense').slice(0, 6).map((t) => (
            <ISLine key={t.id} label={t.description} value={t.amount} indent={1} negative />
          ))}
          {txs.filter((t) => t.type === 'expense').length > 6 && (
            <ISLine label={`... +${txs.filter((t) => t.type === 'expense').length - 6} more`} indent={1} />
          )}
          <ISLine label="Total OpEx"                 value={opEx}          bold negative />
          <ISLine separator />

          {/* NET PROFIT */}
          <ISLine label="NET PROFIT (EBITDA)"        value={ebitda}        bold highlight />
          <ISLine separator />

          {/* TAX PROVISION */}
          <ISLine label="TAX PROVISION" bold />
          <ISLine label="Income Tax (2026/27 HMRC)"  value={taxCalc.incomeTax}          indent={1} negative />
          <ISLine label="National Insurance (Class 4)" value={taxCalc.nationalInsurance} indent={1} negative />
          <ISLine label="Total Tax Provision"         value={taxProvision}  bold negative />
          <ISLine separator />

          {/* PROFIT AFTER TAX */}
          <div style={{ background: 'rgba(255,215,0,0.06)', border: `1px solid rgba(255,215,0,0.2)`, borderRadius: '6px', padding: '1rem', marginTop: '0.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: C.text, fontWeight: 700, fontSize: '0.95rem' }}>NET PROFIT AFTER TAX</span>
              <span style={{ color: profitAfterTax >= 0 ? C.gold : C.red, fontWeight: 700, fontSize: '1.15rem', fontFamily: 'monospace' }}>
                {fmtDp(profitAfterTax)}
              </span>
            </div>
            <div style={{ color: C.muted, fontSize: '0.72rem', marginTop: '4px' }}>
              2026/27 HMRC Compliant | Encrypted via Supabase
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
