'use client'

import { Sparkles, Loader2 } from 'lucide-react'
import type { ExpenseFormState } from '@/lib/hooks/useExpenses'
import { CATEGORIES } from '@/lib/hooks/useExpenses'

const C = {
  surface: '#1C1D20',
  gray:    '#222326',
  white:   '#F4F5F8',
  muted:   'rgba(244,245,248,0.42)',
  border:  'rgba(244,245,248,0.07)',
}

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

export function ExpenseForm({
  form,
  setForm,
  suggesting,
  onSubmit,
  onCancel,
  onSuggestCategory,
}: {
  form: ExpenseFormState
  setForm: React.Dispatch<React.SetStateAction<ExpenseFormState>>
  suggesting: boolean
  onSubmit: (e: React.FormEvent) => void
  onCancel: () => void
  onSuggestCategory: () => void
}) {
  return (
    <form onSubmit={onSubmit}
      style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: '6px', padding: '1.25rem', marginBottom: '1.25rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: '0.85rem', alignItems: 'end' }}>
      <div>
        <label style={labelS}>Date</label>
        <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} style={inputS} />
      </div>
      <div style={{ gridColumn: 'span 2' }}>
        <label style={labelS}>Description</label>
        <input type="text" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          placeholder="e.g. Adobe CC subscription" style={{ ...inputS, fontFamily: 'inherit' }} required />
      </div>
      <div>
        <label style={labelS}>
          Category
          <button type="button" onClick={onSuggestCategory} disabled={!form.description.trim() || suggesting}
            style={{ marginLeft: 6, background: 'transparent', border: `1px solid ${C.border}`, color: suggesting ? C.muted : C.white, borderRadius: 3, padding: '1px 6px', fontSize: '0.58rem', cursor: form.description.trim() && !suggesting ? 'pointer' : 'default', display: 'inline-flex', alignItems: 'center', gap: 3, verticalAlign: 'middle' }}>
            {suggesting ? <Loader2 size={9} style={{ animation: 'spin 1s linear infinite' }} /> : <Sparkles size={9} />}
            {suggesting ? 'thinking' : 'suggest'}
          </button>
        </label>
        <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} style={{ ...inputS, cursor: 'pointer' }}>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <div>
        <label style={labelS}>Amount (£)</label>
        <input type="number" min={0} step={0.01} value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="0.00" style={inputS} required />
      </div>
      <div style={{ display: 'flex', gap: '0.4rem' }}>
        <button type="submit" style={{ flex: 1, background: C.white, color: '#181818', border: 'none', borderRadius: '4px', padding: '9px', fontWeight: 600, cursor: 'pointer', fontSize: '0.8rem', minHeight: '40px', letterSpacing: '-0.01em' }}>
          Save
        </button>
        <button type="button" onClick={onCancel} style={{ background: 'transparent', color: C.muted, border: `1px solid ${C.border}`, borderRadius: '4px', padding: '9px 12px', cursor: 'pointer', fontSize: '0.8rem', minHeight: '40px' }}>
          Cancel
        </button>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </form>
  )
}
