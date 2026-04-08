'use client'

import { useState, useEffect } from 'react'
import { Plus, Trash2 } from 'lucide-react'

const C = { bg: '#020617', deep: '#0A0F1E', card: '#0F172A', gold: '#EAB308', text: '#E5E7EB', muted: 'rgba(229,231,235,0.55)', border: 'rgba(234,179,8,0.15)' }

const CATEGORIES = ['Office & Equipment', 'Travel & Transport', 'Software & Subscriptions', 'Marketing & Advertising', 'Professional Services', 'Training & Education', 'Utilities', 'Meals (business)', 'Other']

interface Expense {
  id: string
  date: string
  description: string
  category: string
  amount: number
}

const inputStyle = { background: C.deep, border: `1px solid ${C.border}`, borderRadius: '4px', padding: '8px 11px', color: C.text, fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' as const, width: '100%' }
const labelStyle = { display: 'block', color: C.muted, fontSize: '0.72rem', textTransform: 'uppercase' as const, letterSpacing: '0.07em', marginBottom: '0.3rem' }

const STORAGE_KEY = 'easyacco_expenses'

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [form, setForm] = useState({ date: new Date().toISOString().slice(0, 10), description: '', category: CATEGORIES[0], amount: '' })
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) setExpenses(JSON.parse(saved))
    } catch {}
  }, [])

  function save(next: Expense[]) {
    setExpenses(next)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  }

  function addExpense(e: React.FormEvent) {
    e.preventDefault()
    const amount = parseFloat(form.amount)
    if (!amount || !form.description) return
    save([{ id: crypto.randomUUID(), ...form, amount }, ...expenses])
    setForm((f) => ({ ...f, description: '', amount: '' }))
    setShowForm(false)
  }

  function remove(id: string) {
    save(expenses.filter((e) => e.id !== id))
  }

  const total = expenses.reduce((s, e) => s + e.amount, 0)
  const byCategory = CATEGORIES.map((cat) => ({
    cat,
    total: expenses.filter((e) => e.category === cat).reduce((s, e) => s + e.amount, 0),
  })).filter((c) => c.total > 0).sort((a, b) => b.total - a.total)

  return (
    <div style={{ padding: 'clamp(1.5rem,4vw,2.5rem)', maxWidth: '860px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-playfair)', color: C.text, fontSize: 'clamp(1.5rem,3vw,2rem)', fontWeight: 700, marginBottom: '0.3rem' }}>
            Expense Tracker
          </h1>
          <p style={{ color: C.muted, fontSize: '0.875rem' }}>HMRC "Wholly & Exclusively" rule · {expenses.length} expenses · Total: <strong style={{ color: C.gold }}>£{total.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          style={{ display: 'flex', alignItems: 'center', gap: '7px', background: C.gold, color: C.deep, border: 'none', borderRadius: '4px', padding: '9px 18px', fontSize: '0.875rem', fontWeight: 700, cursor: 'pointer' }}>
          <Plus size={16} /> Add Expense
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <form onSubmit={addExpense}
          style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '8px', padding: '1.5rem', marginBottom: '1.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: '1rem', alignItems: 'end' }}>
          <div>
            <label style={labelStyle}>Date</label>
            <input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} style={inputStyle} />
          </div>
          <div style={{ gridColumn: 'span 2' }}>
            <label style={labelStyle}>Description</label>
            <input type="text" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="e.g. Adobe CC subscription" style={inputStyle} required />
          </div>
          <div>
            <label style={labelStyle}>Category</label>
            <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} style={{ ...inputStyle, appearance: 'none', cursor: 'pointer' }}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Amount (£)</label>
            <input type="number" min={0} step={0.01} value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} placeholder="0.00" style={inputStyle} required />
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button type="submit" style={{ flex: 1, background: C.gold, color: C.deep, border: 'none', borderRadius: '4px', padding: '9px', fontWeight: 700, cursor: 'pointer', fontSize: '0.875rem' }}>
              Save
            </button>
            <button type="button" onClick={() => setShowForm(false)} style={{ background: 'rgba(255,255,255,0.06)', color: C.muted, border: `1px solid ${C.border}`, borderRadius: '4px', padding: '9px 14px', cursor: 'pointer', fontSize: '0.875rem' }}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Category summary */}
      {byCategory.length > 0 && (
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
          {byCategory.map(({ cat, total: t }) => (
            <div key={cat} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '6px', padding: '0.6rem 1rem' }}>
              <div style={{ color: C.muted, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{cat}</div>
              <div style={{ color: C.gold, fontWeight: 700, fontSize: '0.95rem' }}>£{t.toLocaleString('en-GB', { minimumFractionDigits: 2 })}</div>
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      {expenses.length === 0 ? (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '8px', padding: '3rem', textAlign: 'center' }}>
          <p style={{ color: C.muted, fontSize: '0.9rem' }}>No expenses yet. Add your first one above.</p>
        </div>
      ) : (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '8px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                {['Date', 'Description', 'Category', 'Amount', ''].map((h) => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: h === 'Amount' ? 'right' : 'left', color: C.muted, fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {expenses.map((exp) => (
                <tr key={exp.id} style={{ borderBottom: `1px solid rgba(194,163,104,0.08)` }}>
                  <td style={{ padding: '11px 16px', color: C.muted, whiteSpace: 'nowrap' }}>{exp.date}</td>
                  <td style={{ padding: '11px 16px', color: C.text }}>{exp.description}</td>
                  <td style={{ padding: '11px 16px', color: C.muted }}>{exp.category}</td>
                  <td style={{ padding: '11px 16px', color: C.gold, fontWeight: 600, textAlign: 'right' }}>£{exp.amount.toLocaleString('en-GB', { minimumFractionDigits: 2 })}</td>
                  <td style={{ padding: '11px 16px', textAlign: 'center' }}>
                    <button onClick={() => remove(exp.id)}
                      style={{ background: 'none', border: 'none', color: 'rgba(255,100,100,0.6)', cursor: 'pointer', padding: '2px', display: 'flex' }}>
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
