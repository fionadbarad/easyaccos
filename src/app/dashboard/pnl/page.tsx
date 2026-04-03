'use client'

import { useState, useEffect } from 'react'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts'

const C = { bg: '#1A2342', deep: '#0F1628', card: '#4A4066', gold: '#C2A368', text: '#E4D3B4', muted: 'rgba(228,211,180,0.55)', border: 'rgba(194,163,104,0.2)' }

interface Transaction { id: string; date: string; description: string; type: 'income' | 'expense'; amount: number }
const STORAGE_KEY = 'easyacco_transactions'

const SEED: Transaction[] = [
  { id: '1', date: '2026-01-01', description: 'Client A', type: 'income',  amount: 2400 },
  { id: '2', date: '2026-01-10', description: 'Subscriptions', type: 'expense', amount: 120 },
  { id: '3', date: '2026-02-01', description: 'Client B', type: 'income',  amount: 3100 },
  { id: '4', date: '2026-02-14', description: 'Travel',    type: 'expense', amount: 230 },
  { id: '5', date: '2026-03-01', description: 'Client A',  type: 'income',  amount: 2800 },
  { id: '6', date: '2026-03-05', description: 'Software',  type: 'expense', amount: 54.99 },
  { id: '7', date: '2026-03-12', description: 'Client C',  type: 'income',  amount: 1800 },
  { id: '8', date: '2026-03-20', description: 'Writing',   type: 'income',  amount: 750 },
]

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function buildMonthlyData(txs: Transaction[]) {
  const map: Record<string, { income: number; expenses: number }> = {}
  for (const tx of txs) {
    const m = MONTHS[new Date(tx.date).getMonth()]
    if (!map[m]) map[m] = { income: 0, expenses: 0 }
    if (tx.type === 'income') map[m].income += tx.amount
    else map[m].expenses += tx.amount
  }
  return Object.entries(map).map(([month, d]) => ({ month, ...d, profit: d.income - d.expenses }))
}

const fmt = (v: number) => `£${Math.round(v).toLocaleString('en-GB')}`

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '7px', padding: '1.25rem 1.5rem' }}>
      <div style={{ color: C.muted, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>{label}</div>
      <div style={{ color: C.gold, fontWeight: 700, fontSize: '1.35rem' }}>{value}</div>
      {sub && <div style={{ color: C.muted, fontSize: '0.78rem', marginTop: '4px' }}>{sub}</div>}
    </div>
  )
}

const tooltipStyle = { background: '#0F1628', border: `1px solid rgba(194,163,104,0.3)`, borderRadius: '6px', color: C.text, fontSize: '0.8rem' }

export default function PnLPage() {
  const [txs, setTxs] = useState<Transaction[]>([])

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      setTxs(saved ? JSON.parse(saved) : SEED)
    } catch { setTxs(SEED) }
  }, [])

  const monthly = buildMonthlyData(txs)
  const totalIncome   = txs.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const totalExpenses = txs.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  const netProfit     = totalIncome - totalExpenses
  const margin        = totalIncome > 0 ? (netProfit / totalIncome * 100) : 0

  return (
    <div style={{ padding: 'clamp(1.5rem,4vw,2.5rem)', maxWidth: '920px' }}>
      <h1 style={{ fontFamily: 'var(--font-playfair)', color: C.text, fontSize: 'clamp(1.5rem,3vw,2rem)', fontWeight: 700, marginBottom: '0.3rem' }}>
        Profit &amp; Loss Report
      </h1>
      <p style={{ color: C.muted, fontSize: '0.875rem', marginBottom: '2rem' }}>Based on your transaction history · All figures in GBP</p>

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <StatCard label="Total Income"   value={fmt(totalIncome)}   />
        <StatCard label="Total Expenses" value={fmt(totalExpenses)} />
        <StatCard label="Net Profit"     value={fmt(netProfit)}     />
        <StatCard label="Profit Margin"  value={`${margin.toFixed(1)}%`} />
      </div>

      {/* Area chart — monthly income vs expenses */}
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
            <Tooltip contentStyle={tooltipStyle} formatter={(value) => {
              if (typeof value === 'number') {
                return fmt(value)
              }
              const num = Number(value)
              return Number.isFinite(num) ? fmt(num) : value
            }} />
            <Legend wrapperStyle={{ fontSize: '0.8rem', color: C.muted }} />
            <Area type="monotone" dataKey="income"   name="Income"   stroke={C.gold}    strokeWidth={2} fill="url(#incomeGrad)" />
            <Area type="monotone" dataKey="expenses" name="Expenses" stroke="#ff8a9a"   strokeWidth={2} fill="url(#expGrad)"    />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Bar chart — net profit */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '8px', padding: '1.5rem' }}>
        <h2 style={{ fontFamily: 'var(--font-playfair)', color: C.text, fontSize: '1.05rem', fontWeight: 700, marginBottom: '1.25rem' }}>
          Monthly Net Profit
        </h2>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={monthly} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(194,163,104,0.08)" />
            <XAxis dataKey="month" tick={{ fill: C.muted, fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: C.muted, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `£${(Number(v)/1000).toFixed(0)}k`} />
            <Tooltip contentStyle={tooltipStyle} formatter={(value) => {
              if (typeof value === 'number') return fmt(value)
              const num = Number(value)
              return Number.isFinite(num) ? fmt(num) : value
            }} />
            <Bar dataKey="profit" name="Net Profit" fill={C.gold} radius={[3,3,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
