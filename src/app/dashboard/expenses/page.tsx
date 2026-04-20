'use client'

import { useState, useMemo, useEffect } from 'react'
import { Plus, Trash2, CloudOff, Cloud, Sparkles, Loader2, Camera, X, CheckCircle2 } from 'lucide-react'
import { useUserData } from '@/lib/use-user-data'
import ReceiptScanner, { type ReceiptExtract } from '@/components/ReceiptScanner'
import { FilterBar, emptyFilter, matchesRange, matchesCategories, matchesQuery, type FilterState } from '@/components/tracker/FilterBar'
import { SortableTable, type ColumnDef } from '@/components/tracker/SortableTable'

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
  blue:    '#93C5FD',
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
  ocrScanned?: boolean
}

// Pending scan: OCR extract waiting for user to verify before saving
interface PendingScan {
  extract: ReceiptExtract
  form: { date: string; description: string; category: string; amount: string }
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

// ── Receipt Verify Modal ──────────────────────────────────────────────────────
function ReceiptVerifyModal({
  scan,
  onConfirm,
  onCancel,
}: {
  scan: PendingScan
  onConfirm: (form: PendingScan['form']) => void
  onCancel: () => void
}) {
  const [form, setForm] = useState(scan.form)
  const [suggesting, setSuggesting] = useState(false)
  const isImage = scan.extract.fileType.startsWith('image/')

  async function suggestCategory() {
    if (!form.description.trim() || suggesting) return
    setSuggesting(true)
    try {
      const res = await fetch('/api/ai/categorise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: form.description, amount: form.amount ? parseFloat(form.amount) : undefined }),
      })
      const data = await res.json()
      if (data.category && CATEGORIES.includes(data.category)) {
        setForm((f) => ({ ...f, category: data.category }))
      }
    } catch { /* silent */ } finally { setSuggesting(false) }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 60, padding: '1rem',
    }}>
      <div style={{
        background: C.surface, border: `1px solid ${C.border}`, borderRadius: '8px',
        width: '100%', maxWidth: '860px', maxHeight: '90vh',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.25rem', borderBottom: `1px solid ${C.border}` }}>
          <div>
            <div style={{ color: C.muted, fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'var(--font-geist-mono), monospace', marginBottom: '2px' }}>
              OCR · Split-View Verification
            </div>
            <h3 style={{ color: C.white, fontSize: '0.95rem', fontWeight: 600, margin: 0 }}>
              Verify Receipt Details
            </h3>
          </div>
          <button onClick={onCancel} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', padding: '4px' }}>
            <X size={16} />
          </button>
        </div>

        {/* Body — split view */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', flex: 1, overflow: 'hidden', minHeight: 0 }}>
          {/* Left: receipt image */}
          <div style={{ borderRight: `1px solid ${C.border}`, overflowY: 'auto', background: C.bg, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '1rem' }}>
            {isImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={scan.extract.imageUrl}
                alt="Receipt"
                style={{ maxWidth: '100%', borderRadius: '4px', border: `1px solid ${C.border}` }}
              />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '200px', color: C.muted, gap: '0.75rem' }}>
                <Camera size={32} strokeWidth={1.2} />
                <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-geist-mono), monospace' }}>PDF receipt</span>
              </div>
            )}
          </div>

          {/* Right: editable fields */}
          <div style={{ overflowY: 'auto', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>

            {/* Extracted date badge */}
            {scan.extract.date && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(147,197,253,0.08)', border: '1px solid rgba(147,197,253,0.2)', borderRadius: '4px', padding: '5px 10px', alignSelf: 'flex-start' }}>
                <Camera size={10} style={{ color: C.blue }} />
                <span style={{ color: C.blue, fontSize: '0.68rem', fontFamily: 'var(--font-geist-mono), monospace' }}>
                  Extracted date: {scan.extract.date}
                </span>
              </div>
            )}

            <div>
              <label style={labelS}>Date</label>
              <input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} style={inputS} />
            </div>

            <div>
              <label style={labelS}>Description</label>
              <input
                type="text" value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                style={{ ...inputS, fontFamily: 'inherit' }}
              />
            </div>

            <div>
              <label style={labelS}>
                Category
                <button type="button" onClick={suggestCategory}
                  disabled={!form.description.trim() || suggesting}
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
              <input
                type="number" min={0} step={0.01} value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                placeholder="0.00" style={inputS}
              />
            </div>

            {/* Raw OCR text (collapsible) */}
            <details style={{ marginTop: 'auto' }}>
              <summary style={{ color: C.muted, fontSize: '0.68rem', cursor: 'pointer', fontFamily: 'var(--font-geist-mono), monospace', letterSpacing: '0.04em' }}>
                Raw OCR text
              </summary>
              <pre style={{ color: 'rgba(244,245,248,0.3)', fontSize: '0.65rem', marginTop: '0.5rem', whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: 'var(--font-geist-mono), monospace', maxHeight: '120px', overflowY: 'auto', background: C.bg, border: `1px solid ${C.border}`, borderRadius: '4px', padding: '0.5rem' }}>
                {scan.extract.raw || '(empty)'}
              </pre>
            </details>
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', padding: '0.875rem 1.25rem', borderTop: `1px solid ${C.border}` }}>
          <button onClick={onCancel}
            style={{ background: 'transparent', color: C.muted, border: `1px solid ${C.border}`, borderRadius: '4px', padding: '8px 16px', cursor: 'pointer', fontSize: '0.8rem' }}>
            Cancel
          </button>
          <button onClick={() => onConfirm(form)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: C.white, color: C.bg, border: 'none', borderRadius: '4px', padding: '8px 18px', fontWeight: 600, cursor: 'pointer', fontSize: '0.8rem' }}>
            <CheckCircle2 size={13} /> Confirm & Add
          </button>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ExpensesPage() {
  const { items: expenses, persist, loading, isAuthenticated } = useUserData<Expense>(
    'user_expenses', 'easyacco_expenses', SEED,
  )
  const [showForm, setShowForm]       = useState(false)
  const [form, setForm]               = useState({ date: toISODate(new Date()), description: '', category: CATEGORIES[0], amount: '' })
  const [suggesting, setSuggesting]   = useState(false)
  const [filter, setFilter]           = useState<FilterState>(emptyFilter())
  const [pendingScan, setPendingScan] = useState<PendingScan | null>(null)

  // Revoke blob URL when modal closes without confirming
  useEffect(() => {
    if (!pendingScan) return
    return () => {
      URL.revokeObjectURL(pendingScan.extract.imageUrl)
    }
  }, [pendingScan])

  const filtered = useMemo(() => {
    return expenses.filter(e =>
      matchesRange(e.date, filter.range)
      && matchesCategories(e.category, filter.categories)
      && matchesQuery(`${e.description} ${e.category}`, filter.query),
    )
  }, [expenses, filter])

  function onReceiptExtract(data: ReceiptExtract) {
    // Open the split-view verification modal instead of pre-filling the form
    setPendingScan({
      extract: data,
      form: {
        date: data.date || toISODate(new Date()),
        description: data.description || '',
        category: CATEGORIES[0],
        amount: data.amount != null ? data.amount.toFixed(2) : '',
      },
    })
  }

  async function confirmScan(confirmedForm: PendingScan['form']) {
    const amount = parseFloat(confirmedForm.amount)
    if (!amount || !confirmedForm.description.trim()) return
    await persist([
      { id: crypto.randomUUID(), ...confirmedForm, amount, ocrScanned: true },
      ...expenses,
    ])
    // Revoke blob URL now that we're done with it
    if (pendingScan) URL.revokeObjectURL(pendingScan.extract.imageUrl)
    setPendingScan(null)
  }

  function cancelScan() {
    if (pendingScan) URL.revokeObjectURL(pendingScan.extract.imageUrl)
    setPendingScan(null)
  }

  async function suggestCategory() {
    if (!form.description.trim() || suggesting) return
    setSuggesting(true)
    try {
      const res = await fetch('/api/ai/categorise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: form.description, amount: form.amount ? parseFloat(form.amount) : undefined }),
      })
      const data = await res.json()
      if (data.category && CATEGORIES.includes(data.category)) {
        setForm((f) => ({ ...f, category: data.category }))
      }
    } catch { /* silent */ } finally { setSuggesting(false) }
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

  const total      = filtered.reduce((s, e) => s + e.amount, 0)
  const byCategory = CATEGORIES
    .map((cat) => ({ cat, total: filtered.filter((e) => e.category === cat).reduce((s, e) => s + e.amount, 0) }))
    .filter((c) => c.total > 0)
    .sort((a, b) => b.total - a.total)

  const columns: ColumnDef<Expense>[] = [
    {
      key: 'date', header: 'Date', sortable: true,
      accessor: (e) => e.date,
      render: (e) => (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
          <span style={{ color: C.muted, fontFamily: 'var(--font-geist-mono), monospace', fontSize: '0.75rem' }}>{e.date}</span>
          {e.ocrScanned && (
            <span title="Scanned via OCR" style={{ display: 'inline-flex', alignItems: 'center', color: C.blue, opacity: 0.8 }}>
              <Camera size={10} strokeWidth={1.5} />
            </span>
          )}
        </span>
      ),
    },
    {
      key: 'description', header: 'Description', sortable: true,
      accessor: (e) => e.description,
    },
    {
      key: 'category', header: 'Category', sortable: true,
      accessor: (e) => e.category,
      render: (e) => <span style={{ color: C.muted, fontSize: '0.75rem' }}>{e.category}</span>,
    },
    {
      key: 'amount', header: 'Amount', sortable: true, align: 'right',
      accessor: (e) => e.amount,
      render: (e) => (
        <span style={{ color: C.red, fontWeight: 500, fontFamily: 'var(--font-geist-mono), monospace', fontVariantNumeric: 'tabular-nums' }}>
          -£{e.amount.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      key: 'del', header: '', align: 'right', width: 40,
      accessor: () => '',
      render: (e) => (
        <button onClick={() => remove(e.id)} aria-label="Delete expense"
          style={{ background: 'none', border: 'none', color: 'rgba(248,113,113,0.4)', cursor: 'pointer', padding: 2, display: 'inline-flex' }}>
          <Trash2 size={13} strokeWidth={1.5} />
        </button>
      ),
    },
  ]

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

      {/* Split-view verification modal */}
      {pendingScan && (
        <ReceiptVerifyModal
          scan={pendingScan}
          onConfirm={confirmScan}
          onCancel={cancelScan}
        />
      )}

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
            {loading
              ? '—'
              : `${filtered.length}${filtered.length !== expenses.length ? ` of ${expenses.length}` : ''} records · total `}
            {!loading && <span style={{ color: C.white }}>£{total.toLocaleString('en-GB', { minimumFractionDigits: 2 })}</span>}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
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

      {/* ── Filter bar ── */}
      {!loading && expenses.length > 0 && (
        <FilterBar value={filter} onChange={setFilter} categories={CATEGORIES} />
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
        <SortableTable
          rows={filtered}
          columns={columns}
          initialSort={{ key: 'date', dir: 'desc' }}
          empty="No expenses match these filters."
        />
      )}

      {/* OCR legend */}
      {expenses.some((e) => e.ocrScanned) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '0.6rem', color: 'rgba(147,197,253,0.5)', fontSize: '0.62rem', fontFamily: 'var(--font-geist-mono), monospace' }}>
          <Camera size={9} /> = scanned via OCR
        </div>
      )}

      <p style={{ color: 'rgba(244,245,248,0.18)', fontSize: '0.62rem', marginTop: '0.75rem', textAlign: 'right', fontFamily: 'var(--font-geist-mono), monospace' }}>
        HMRC "wholly and exclusively" rule · 2026/27
      </p>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
