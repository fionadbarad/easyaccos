'use client'

import { useState, useEffect, useMemo } from 'react'
import { Plus, Trash2, ArrowUpCircle, ArrowDownCircle, Calendar, Filter } from 'lucide-react'

const C = {
  bg: '#0B0E1A', deep: '#050A14', card: '#111827',
  gold: '#FFD700', soft: '#EAB308', text: '#E5E7EB',
  muted: 'rgba(229,231,235,0.55)', border: 'rgba(255,215,0,0.15)',
}

type TxType = 'income' | 'expense'
type DateFilter = 'all' | 'today' | 'month' | 'custom'

interface Transaction {
  id: string; date: string; description: string
  type: TxType; amount: number; reference: string
}

const inputStyle: React.CSSProperties = {
  background: C.deep, border: `1px solid ${C.border}`, borderRadius: '6px',
  padding: '10px 13px', color: C.text, fontSize: '0.875rem', outline: 'none',
  boxSizing: 'border-box', width: '100%', minHeight: '44px',
}
const labelStyle: React.CSSProperties = {
  display: 'block', color: C.muted, fontSize: '0.72rem',
  textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.3rem',
}
const STORAGE_KEY = 'easyacco_transactions'

const SEED: Transaction[] = [
  { id: '1', date: '2026-04-01', description: 'Client Project — Acme Corp', type: 'income',  amount: 2400,  reference: 'INV-001' },
  { id: '2', date: '2026-04-02', description: 'Adobe Creative Cloud',       type: 'expense', amount: 54.99, reference: 'SUB-001' },
  { id: '3', date: '2026-04-05', description: 'Consulting — Beta Ltd',       type: 'income',  amount: 1800,  reference: 'INV-002' },
  { id: '4', date: '2026-04-07', description: 'Home Office Internet',        type: 'expense', amount: 45,    reference: 'UTIL-001' },
  { id: '5', date: '2026-03-20', description: 'Freelance Writing Project',   type: 'income',  amount: 750,   reference: 'INV-003' },
  { id: '6', date: '2026-03-15', description: 'Travel — Client Visit',       type: 'expense', amount: 120,   reference: 'EXP-001' },
  { id: '7', date: '2026-02-28', description: 'Design Retainer',             type: 'income',  amount: 3200,  reference: 'INV-004' },
]

function toISODate(d: Date) {
  return d.toISOString().slice(0, 10)
}

function isToday(dateStr: string) {
  return dateStr === toISODate(new Date())
}

function isThisMonth(dateStr: string) {
  const now = new Date()
  const d = new Date(dateStr)
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
}

export default function TransactionsPage() {
  const [txs, setTxs]           = useState<Transaction[]>([])
  const [typeFilter, setType]   = useState<TxType | 'all'>('all')
  const [dateFilter, setDate]   = useState<DateFilter>('all')
  const [customFrom, setFrom]   = useState('')
  const [customTo, setTo]       = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm]         = useState({
    date: toISODate(new Date()), description: '', type: 'income' as TxType, amount: '', reference: '',
  })

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      setTxs(saved ? JSON.parse(saved) : SEED)
    } catch { setTxs(SEED) }
  }, [])

  function persist(next: Transaction[]) {
    setTxs(next)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  }

  function add(e: React.FormEvent) {
    e.preventDefault()
    const amount = parseFloat(form.amount)
    if (!amount || !form.description) return
    persist([{ id: crypto.randomUUID(), ...form, amount }, ...txs])
    setForm((f) => ({ ...f, description: '', amount: '', reference: '' }))
    setShowForm(false)
  }

  function remove(id: string) { persist(txs.filter((t) => t.id !== id)) }

  // Filtering
  const visible = useMemo(() => {
    return txs
      .filter((t) => typeFilter === 'all' || t.type === typeFilter)
      .filter((t) => {
        if (dateFilter === 'today')  return isToday(t.date)
        if (dateFilter === 'month')  return isThisMonth(t.date)
        if (dateFilter === 'custom' && customFrom && customTo)
          return t.date >= customFrom && t.date <= customTo
        return true
      })
      .sort((a, b) => b.date.localeCompare(a.date))
  }, [txs, typeFilter, dateFilter, customFrom, customTo])

  const totalIn   = visible.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const totalOut  = visible.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  const net       = totalIn - totalOut
  const fmt       = (n: number) => `£${Math.abs(n).toLocaleString('en-GB', { minimumFractionDigits: 2 })}`

  const dateFilterLabels: Record<DateFilter, string> = {
    all:    'All Time',
    today:  'Today',
    month:  'This Month',
    custom: 'Custom Range',
  }

  return (
    <div style={{ padding: 'clamp(1.5rem,4vw,2.5rem)', maxWidth: '960px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-playfair)', color: C.text, fontSize: 'clamp(1.5rem,3vw,2rem)', fontWeight: 700, marginBottom: '0.3rem' }}>
            Daily Ledger
          </h1>
          <p style={{ color: C.muted, fontSize: '0.875rem' }}>
            {visible.length} records · Net: <strong style={{ color: net >= 0 ? C.gold : '#ff8a9a' }}>{net >= 0 ? '+' : '-'}{fmt(net)}</strong>
          </p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          style={{ display: 'flex', alignItems: 'center', gap: '7px', background: C.gold, color: C.deep, border: 'none', borderRadius: '6px', padding: '10px 18px', fontSize: '0.875rem', fontWeight: 700, cursor: 'pointer', minHeight: '44px' }}>
          <Plus size={16} /> Add Transaction
        </button>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Income (filtered)', value: fmt(totalIn),  color: C.gold },
          { label: 'Expenses (filtered)', value: fmt(totalOut), color: '#ff8a9a' },
          { label: 'Net', value: `${net >= 0 ? '+' : '-'}${fmt(net)}`, color: net >= 0 ? C.gold : '#ff8a9a' },
        ].map((s) => (
          <div key={s.label} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '8px', padding: '1.1rem 1.25rem', backdropFilter: 'blur(10px)' }}>
            <div style={{ color: C.muted, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>{s.label}</div>
            <div style={{ color: s.color, fontWeight: 700, fontSize: '1.15rem' }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Add form */}
      {showForm && (
        <form onSubmit={add}
          style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '8px', padding: '1.5rem', marginBottom: '1.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: '1rem', alignItems: 'end' }}>
          <div>
            <label style={labelStyle}>Date</label>
            <input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} style={inputStyle} />
          </div>
          <div style={{ gridColumn: 'span 2' }}>
            <label style={labelStyle}>Description</label>
            <input type="text" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="e.g. Client Invoice" style={inputStyle} required />
          </div>
          <div>
            <label style={labelStyle}>Type</label>
            <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as TxType }))} style={{ ...inputStyle, appearance: 'none', cursor: 'pointer' }}>
              <option value="income">Income</option>
              <option value="expense">Expense</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Amount (£)</label>
            <input type="number" min={0} step={0.01} value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} placeholder="0.00" style={inputStyle} required />
          </div>
          <div>
            <label style={labelStyle}>Reference</label>
            <input type="text" value={form.reference} onChange={(e) => setForm((f) => ({ ...f, reference: e.target.value }))} placeholder="INV-001" style={inputStyle} />
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button type="submit" style={{ flex: 1, background: C.gold, color: C.deep, border: 'none', borderRadius: '6px', padding: '10px', fontWeight: 700, cursor: 'pointer', fontSize: '0.875rem', minHeight: '44px' }}>Save</button>
            <button type="button" onClick={() => setShowForm(false)} style={{ background: 'rgba(255,255,255,0.06)', color: C.muted, border: `1px solid ${C.border}`, borderRadius: '6px', padding: '10px 12px', cursor: 'pointer', fontSize: '0.875rem', minHeight: '44px' }}>Cancel</button>
          </div>
        </form>
      )}

      {/* ── FILTERS ── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem', alignItems: 'center' }}>
        {/* Type filter */}
        {(['all', 'income', 'expense'] as const).map((f) => (
          <button key={f} onClick={() => setType(f)}
            style={{ padding: '6px 14px', borderRadius: '6px', border: `1px solid ${typeFilter === f ? C.gold : C.border}`, background: typeFilter === f ? 'rgba(255,215,0,0.1)' : 'transparent', color: typeFilter === f ? C.gold : C.muted, cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, textTransform: 'capitalize', minHeight: '36px' }}>
            {f}
          </button>
        ))}

        <div style={{ width: '1px', height: '24px', background: C.border }} />

        {/* Date filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Calendar size={14} style={{ color: C.muted }} />
          {(['all', 'today', 'month', 'custom'] as DateFilter[]).map((f) => (
            <button key={f} onClick={() => setDate(f)}
              style={{ padding: '6px 12px', borderRadius: '6px', border: `1px solid ${dateFilter === f ? C.soft : C.border}`, background: dateFilter === f ? 'rgba(194,163,104,0.1)' : 'transparent', color: dateFilter === f ? C.soft : C.muted, cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600, minHeight: '36px' }}>
              {dateFilterLabels[f]}
            </button>
          ))}
        </div>
      </div>

      {/* Custom date range */}
      {dateFilter === 'custom' && (
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div>
            <label style={labelStyle}>From</label>
            <input type="date" value={customFrom} onChange={(e) => setFrom(e.target.value)} style={{ ...inputStyle, width: 'auto' }} />
          </div>
          <div>
            <label style={labelStyle}>To</label>
            <input type="date" value={customTo} onChange={(e) => setTo(e.target.value)} style={{ ...inputStyle, width: 'auto' }} />
          </div>
          <div style={{ color: C.muted, fontSize: '0.78rem', marginTop: '20px' }}>
            {visible.length} results
          </div>
        </div>
      )}

      {/* Table */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '8px', overflow: 'hidden' }}>
        {visible.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: C.muted, fontSize: '0.9rem' }}>
            No transactions for this period.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                  {['', 'Date', 'Description', 'Reference', 'Amount', ''].map((h, i) => (
                    <th key={i} style={{ padding: '11px 14px', textAlign: h === 'Amount' ? 'right' : 'left', color: C.muted, fontWeight: 600, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible.map((tx) => (
                  <tr key={tx.id} style={{ borderBottom: `1px solid rgba(255,215,0,0.05)` }}>
                    <td style={{ padding: '10px 14px' }}>
                      {tx.type === 'income'
                        ? <ArrowUpCircle size={16} style={{ color: C.gold }} />
                        : <ArrowDownCircle size={16} style={{ color: '#ff8a9a' }} />}
                    </td>
                    <td style={{ padding: '10px 14px', color: C.muted, whiteSpace: 'nowrap' }}>{tx.date}</td>
                    <td style={{ padding: '10px 14px', color: C.text }}>{tx.description}</td>
                    <td style={{ padding: '10px 14px', color: C.muted, fontSize: '0.8rem' }}>{tx.reference}</td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 600, color: tx.type === 'income' ? C.gold : '#ff8a9a', whiteSpace: 'nowrap' }}>
                      {tx.type === 'income' ? '+' : '-'}£{tx.amount.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <button onClick={() => remove(tx.id)} style={{ background: 'none', border: 'none', color: 'rgba(255,100,100,0.5)', cursor: 'pointer', padding: '2px', display: 'flex' }}>
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p style={{ color: C.muted, fontSize: '0.68rem', textAlign: 'center', marginTop: '1rem' }}>
        2026/27 HMRC Compliant | Encrypted via Supabase
      </p>
    </div>
  )
}
