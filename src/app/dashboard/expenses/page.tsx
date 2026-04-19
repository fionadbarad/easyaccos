'use client'

import { useState } from 'react'
import { Plus, Trash2, CloudOff, Cloud, Sparkles, Loader2 } from 'lucide-react'
import { useUserData } from '@/lib/use-user-data'
import ReceiptScanner, { type ReceiptExtract } from '@/components/ReceiptScanner'

// ── Dark mono palette — matches dashboard ─────────────────────────────────
const C = {
  bg:      '#181818',
  surface: '#1C1D20',
  gray:    '#222326',
  white:   '#F4F5F8',
  muted:   'rgba(244,245,248,0.42)',
  border:  'rgba(244,245,248,0.07)',
  green:   '#4ADE80',
  red:     '#F87171',
  amber:   '#FBBF24',
}

const CATEGORIES = [
  'Office & Equipment',
  'Travel & Transport',
  'Software & Subscriptions',
  'Marketing & Advertising',
  'Professional Services',
  'Training & Education',
  'Utilities',
  'Meals (business)',
  'Other',
]

interface Expense {
  id: string
  date: string
  description: string
  category: string
  amount: number
}

const SEED: Expense[] = []

const inputS: React.CSSProperties = {
  background: C.gray, border: `1px solid ${C.border}`, borderRadius: '4px',
  padding: '9px 11px', color: C.white, fontSize: '0.84rem', outline: 'none',
  boxSizing: 'border-box', width: '100%',
  fontFamily: 'var(--font-geist-mono), monospace',
}
const labelS: React.CSSProperties = {
  display: 'block', color: C.muted, fontSize: '0.62rem',
  textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px', fontWeight: 600,
}

function toISODate(d: Date) { return d.toISOString().slice(0, 10) }

export default function ExpensesPage() {
  const { items: expenses, persist, loading, isAuthenticated } = useUserData<Expense>(
    'user_expenses', 'easyacco_expenses', SEED,
  )
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    date: toISODate(new Date()), description: '', category: CATEGORIES[0], amount: '',
  })
  const [suggesting, setSuggesting] = useState(false)

  function onReceiptExtract(data: ReceiptExtract) {
    setForm((f) => ({
      ...f,
      description: data.description || f.description,
      amount: data.amount != null ? data.amount.toFixed(2) : f.amount,
      date: data.date || f.date,
    }))
    setShowForm(true)
  }

  async function suggestCategory() {
    if (!form.description.trim() || suggesting) return
    setSuggesting(true)
    try {
      const res = await fetch('/api/ai/categorise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: form.description,
          amount: form.amount ? parseFloat(form.amount) : undefined,
        }),
      })
      const data = await res.json()
      if (data.category && CATEGORIES.includes(data.category)) {
        setForm((f) => ({ ...f, category: data.category }))
      }
    } catch {
      // silent — keep existing category
    } finally {
      setSuggesting(false)
    }
  }

  async function addExpense(e: React.FormEvent) {
    e.preventDefault()
    const amount = parseFloat(form.amount)
    if (!amount || !form.description.trim()) return
    await persist([{ id: crypto.randomUUID(), ...form, amount }, ...expenses])
    setForm((f) => ({ ...f, description: '', amount: '' }))
    setShowForm(false)
  }

  async function remove(id: string) {
    await persist(expenses.filter((e) => e.id !== id))
  }

  const total      = expenses.reduce((s, e) => s + e.amount, 0)
  const byCategory = CATEGORIES
    .map((cat) => ({ cat, total: expenses.filter((e) => e.category === cat).reduce((s, e) => s + e.amount, 0) }))
    .filter((c) => c.total > 0)
    .sort((a, b) => b.total - a.total)

  const chipStyle = (active: boolean): React.CSSProperties => ({
    padding: '5px 12px', borderRadius: '3px',
    border: `1px solid ${active ? 'rgba(244,245,248,0.2)' : C.border}`,
    background: active ? 'rgba(244,245,248,0.07)' : 'transparent',
    color: active ? C.white : C.muted,
    cursor: 'default', fontSize: '0.72rem', fontWeight: active ? 500 : 400,
    fontFamily: 'var(--font-geist-mono), monospace',
  })

  return (
    <div style={{ padding: 'clamp(1.5rem,4vw,2.5rem)', maxWidth: '900px' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.75rem' }}>
        <div>
          <div style={{ color: C.muted, fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '5px', fontFamily: 'var(--font-geist-mono), monospace' }}>
            expenses
          </div>
          <h1 style={{ color: C.white, fontSize: 'clamp(1.4rem,3vw,1.9rem)', fontWeight: 600, letterSpacing: '-0.03em', margin: 0 }}>
            Expense Tracker
          </h1>
          <p style={{ color: C.muted, fontSize: '0.75rem', marginTop: '4px', fontFamily: 'var(--font-geist-mono), monospace' }}>
            {loading ? '—' : `${expenses.length} records · total `}
            {!loading && <span style={{ color: C.white }}>£{total.toLocaleString('en-GB', { minimumFractionDigits: 2 })}</span>}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {/* Sync status */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: C.muted, fontSize: '0.68rem', fontFamily: 'var(--font-geist-mono), monospace', padding: '6px 10px', border: `1px solid ${C.border}`, borderRadius: '4px' }}>
            {isAuthenticated
              ? <><Cloud size={11} style={{ color: C.green }} /> synced</>
              : <><CloudOff size={11} /> local only</>}
          </div>
          <ReceiptScanner onExtract={onReceiptExtract} />
          <button onClick={() => setShowForm(!showForm)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: C.white, color: C.bg, border: 'none', borderRadius: '4px', padding: '8px 16px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', minHeight: '36px', letterSpacing: '-0.01em' }}>
            <Plus size={14} strokeWidth={2.5} /> Add Expense
          </button>
        </div>
      </div>

      {/* ── Guest sync nudge ── */}
      {!loading && !isAuthenticated && expenses.length > 0 && (
        <div style={{ background: 'rgba(251,191,36,0.05)', border: '1px solid rgba(251,191,36,0.18)', borderRadius: '4px', padding: '0.7rem 1rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
          <span style={{ color: C.amber, fontSize: '0.75rem' }}>Data is saved in this browser only — sign in to sync across devices.</span>
          <a href="/auth/login" style={{ color: C.amber, fontSize: '0.72rem', fontWeight: 600, textDecoration: 'none', borderBottom: '1px solid rgba(251,191,36,0.4)' }}>Sign in →</a>
        </div>
      )}

      {/* ── Add form ── */}
      {showForm && (
        <form onSubmit={addExpense}
          style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: '6px', padding: '1.25rem', marginBottom: '1.25rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: '0.85rem', alignItems: 'end' }}>
          <div>
            <label style={labelS}>Date</label>
            <input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} style={inputS} />
          </div>
          <div style={{ gridColumn: 'span 2' }}>
            <label style={labelS}>Description</label>
            <input type="text" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="e.g. Adobe CC subscription" style={{ ...inputS, fontFamily: 'inherit' }} required />
          </div>
          <div>
            <label style={labelS}>
              Category
              <button type="button" onClick={suggestCategory}
                disabled={!form.description.trim() || suggesting}
                title="Suggest a category using AI"
                style={{ marginLeft: 6, background: 'transparent', border: `1px solid ${C.border}`, color: suggesting ? C.muted : C.white, borderRadius: 3, padding: '1px 6px', fontSize: '0.58rem', cursor: form.description.trim() && !suggesting ? 'pointer' : 'default', display: 'inline-flex', alignItems: 'center', gap: 3, verticalAlign: 'middle' }}>
                {suggesting ? <Loader2 size={9} style={{ animation: 'spin 1s linear infinite' }} /> : <Sparkles size={9} />}
                {suggesting ? 'thinking' : 'suggest'}
              </button>
            </label>
            <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              style={{ ...inputS, cursor: 'pointer' }}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label style={labelS}>Amount (£)</label>
            <input type="number" min={0} step={0.01} value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} placeholder="0.00" style={inputS} required />
          </div>
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            <button type="submit" style={{ flex: 1, background: C.white, color: C.bg, border: 'none', borderRadius: '4px', padding: '9px', fontWeight: 600, cursor: 'pointer', fontSize: '0.8rem', minHeight: '40px', letterSpacing: '-0.01em' }}>
              Save
            </button>
            <button type="button" onClick={() => setShowForm(false)}
              style={{ background: 'transparent', color: C.muted, border: `1px solid ${C.border}`, borderRadius: '4px', padding: '9px 12px', cursor: 'pointer', fontSize: '0.8rem', minHeight: '40px' }}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* ── Category breakdown chips ── */}
      {byCategory.length > 0 && (
        <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
          {byCategory.map(({ cat, total: t }) => (
            <div key={cat} style={chipStyle(false)}>
              {cat} · £{t.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
            </div>
          ))}
        </div>
      )}

      {/* ── Table ── */}
      {loading ? (
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: '6px', padding: '3rem', textAlign: 'center', color: C.muted, fontSize: '0.84rem' }}>
          Loading…
        </div>
      ) : expenses.length === 0 ? (
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: '6px', padding: '3rem', textAlign: 'center' }}>
          <p style={{ color: C.muted, fontSize: '0.84rem', margin: 0 }}>No expenses yet. Add your first one above.</p>
          <p style={{ color: 'rgba(244,245,248,0.2)', fontSize: '0.72rem', marginTop: '6px', fontFamily: 'var(--font-geist-mono), monospace' }}>
            HMRC "wholly and exclusively" rule applies
          </p>
        </div>
      ) : (
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: '6px', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                  {['Date', 'Description', 'Category', 'Amount', ''].map((h, i) => (
                    <th key={i} style={{
                      padding: '10px 13px',
                      textAlign: h === 'Amount' ? 'right' : 'left',
                      color: C.muted, fontWeight: 600, fontSize: '0.62rem',
                      textTransform: 'uppercase', letterSpacing: '0.07em', whiteSpace: 'nowrap',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {expenses.map((exp, idx) => (
                  <tr key={exp.id} style={{ borderBottom: idx < expenses.length - 1 ? `1px solid rgba(244,245,248,0.04)` : 'none' }}>
                    <td style={{ padding: '9px 13px', color: C.muted, whiteSpace: 'nowrap', fontFamily: 'var(--font-geist-mono), monospace', fontSize: '0.75rem' }}>{exp.date}</td>
                    <td style={{ padding: '9px 13px', color: C.white }}>{exp.description}</td>
                    <td style={{ padding: '9px 13px', color: C.muted, fontSize: '0.75rem' }}>{exp.category}</td>
                    <td style={{ padding: '9px 13px', textAlign: 'right', color: C.red, fontWeight: 500, whiteSpace: 'nowrap', fontFamily: 'var(--font-geist-mono), monospace', fontVariantNumeric: 'tabular-nums' }}>
                      -£{exp.amount.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
                    </td>
                    <td style={{ padding: '9px 13px', width: '32px' }}>
                      <button onClick={() => remove(exp.id)}
                        style={{ background: 'none', border: 'none', color: 'rgba(248,113,113,0.3)', cursor: 'pointer', padding: '2px', display: 'flex', transition: 'color 0.1s' }}
                        onMouseEnter={(e) => (e.currentTarget as HTMLButtonElement).style.color = C.red}
                        onMouseLeave={(e) => (e.currentTarget as HTMLButtonElement).style.color = 'rgba(248,113,113,0.3)'}>
                        <Trash2 size={13} strokeWidth={1.5} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p style={{ color: 'rgba(244,245,248,0.18)', fontSize: '0.62rem', marginTop: '0.75rem', textAlign: 'right', fontFamily: 'var(--font-geist-mono), monospace' }}>
        HMRC "wholly and exclusively" rule · 2026/27
      </p>
    </div>
  )
}
