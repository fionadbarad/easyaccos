'use client'

import { useState, useEffect } from 'react'
import { Plus, Trash2, ArrowUpCircle, ArrowDownCircle } from 'lucide-react'

const C = { bg: '#1A2342', deep: '#0F1628', card: '#4A4066', gold: '#C2A368', text: '#E4D3B4', muted: 'rgba(228,211,180,0.55)', border: 'rgba(194,163,104,0.2)' }

type TxType = 'income' | 'expense'

interface Transaction {
  id: string
  date: string
  description: string
  type: TxType
  amount: number
  reference: string
}

const inputStyle = { background: C.deep, border: `1px solid ${C.border}`, borderRadius: '4px', padding: '8px 11px', color: C.text, fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' as const, width: '100%' }
const labelStyle = { display: 'block', color: C.muted, fontSize: '0.72rem', textTransform: 'uppercase' as const, letterSpacing: '0.07em', marginBottom: '0.3rem' }
const STORAGE_KEY = 'easyacco_transactions'

const SEED: Transaction[] = [
  { id: '1', date: '2026-03-01', description: 'Client Project — Acme Corp', type: 'income',  amount: 2400, reference: 'INV-001' },
  { id: '2', date: '2026-03-05', description: 'Adobe Creative Cloud',       type: 'expense', amount:  54.99, reference: 'SUB-001' },
  { id: '3', date: '2026-03-12', description: 'Consulting — Beta Ltd',       type: 'income',  amount: 1800, reference: 'INV-002' },
  { id: '4', date: '2026-03-15', description: 'Home Office — Internet',      type: 'expense', amount:  45, reference: 'UTIL-001' },
  { id: '5', date: '2026-03-20', description: 'Freelance Writing Project',   type: 'income',  amount:  750, reference: 'INV-003' },
]

export default function TransactionsPage() {
  const [txs, setTxs] = useState<Transaction[]>([])
  const [filter, setFilter] = useState<TxType | 'all'>('all')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ date: new Date().toISOString().slice(0, 10), description: '', type: 'income' as TxType, amount: '', reference: '' })

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      setTxs(saved ? JSON.parse(saved) : SEED)
    } catch { setTxs(SEED) }
  }, [])

  function persist(next: Transaction[]) { setTxs(next); localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) }

  function add(e: React.FormEvent) {
    e.preventDefault()
    const amount = parseFloat(form.amount)
    if (!amount || !form.description) return
    persist([{ id: crypto.randomUUID(), ...form, amount }, ...txs])
    setForm((f) => ({ ...f, description: '', amount: '', reference: '' }))
    setShowForm(false)
  }

  function remove(id: string) { persist(txs.filter((t) => t.id !== id)) }

  const visible = txs.filter((t) => filter === 'all' || t.type === filter)
  const totalIn  = txs.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const totalOut = txs.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  const net = totalIn - totalOut

  const fmt = (n: number) => `£${Math.abs(n).toLocaleString('en-GB', { minimumFractionDigits: 2 })}`

  return (
    <div style={{ padding: 'clamp(1.5rem,4vw,2.5rem)', maxWidth: '900px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-playfair)', color: C.text, fontSize: 'clamp(1.5rem,3vw,2rem)', fontWeight: 700, marginBottom: '0.3rem' }}>Transactions</h1>
          <p style={{ color: C.muted, fontSize: '0.875rem' }}>{txs.length} records · Net: <strong style={{ color: net >= 0 ? C.gold : '#ff8a9a' }}>{net >= 0 ? '+' : '-'}{fmt(net)}</strong></p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          style={{ display: 'flex', alignItems: 'center', gap: '7px', background: C.gold, color: C.deep, border: 'none', borderRadius: '4px', padding: '9px 18px', fontSize: '0.875rem', fontWeight: 700, cursor: 'pointer' }}>
          <Plus size={16} /> Add Transaction
        </button>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Total Income', value: fmt(totalIn), color: C.gold },
          { label: 'Total Expenses', value: fmt(totalOut), color: '#ff8a9a' },
          { label: 'Net Profit', value: `${net >= 0 ? '+' : '-'}${fmt(net)}`, color: net >= 0 ? C.gold : '#ff8a9a' },
        ].map((s) => (
          <div key={s.label} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '6px', padding: '1.1rem 1.25rem' }}>
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
            <button type="submit" style={{ flex: 1, background: C.gold, color: C.deep, border: 'none', borderRadius: '4px', padding: '9px', fontWeight: 700, cursor: 'pointer', fontSize: '0.875rem' }}>Save</button>
            <button type="button" onClick={() => setShowForm(false)} style={{ background: 'rgba(255,255,255,0.06)', color: C.muted, border: `1px solid ${C.border}`, borderRadius: '4px', padding: '9px 12px', cursor: 'pointer', fontSize: '0.875rem' }}>Cancel</button>
          </div>
        </form>
      )}

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        {(['all', 'income', 'expense'] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            style={{ padding: '6px 16px', borderRadius: '4px', border: `1px solid ${filter === f ? C.gold : C.border}`, background: filter === f ? 'rgba(194,163,104,0.12)' : 'transparent', color: filter === f ? C.gold : C.muted, cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, textTransform: 'capitalize' }}>
            {f}
          </button>
        ))}
      </div>

      {/* Table */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '8px', overflow: 'hidden' }}>
        {visible.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: C.muted, fontSize: '0.9rem' }}>No transactions yet.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                {['', 'Date', 'Description', 'Reference', 'Amount', ''].map((h, i) => (
                  <th key={i} style={{ padding: '11px 14px', textAlign: h === 'Amount' ? 'right' : 'left', color: C.muted, fontWeight: 600, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.map((tx) => (
                <tr key={tx.id} style={{ borderBottom: `1px solid rgba(194,163,104,0.07)` }}>
                  <td style={{ padding: '10px 14px' }}>
                    {tx.type === 'income'
                      ? <ArrowUpCircle size={16} style={{ color: C.gold }} />
                      : <ArrowDownCircle size={16} style={{ color: '#ff8a9a' }} />}
                  </td>
                  <td style={{ padding: '10px 14px', color: C.muted, whiteSpace: 'nowrap' }}>{tx.date}</td>
                  <td style={{ padding: '10px 14px', color: C.text }}>{tx.description}</td>
                  <td style={{ padding: '10px 14px', color: C.muted, fontSize: '0.8rem' }}>{tx.reference}</td>
                  <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 600, color: tx.type === 'income' ? C.gold : '#ff8a9a' }}>
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
        )}
      </div>
    </div>
  )
}
