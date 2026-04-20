'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, Trash2, Cloud, CloudOff, Copy, Check,
  FileText, Clock, AlertTriangle, CheckCircle2, ChevronDown, Undo2,
} from 'lucide-react'
import { useUserData } from '@/lib/use-user-data'

const C = {
  bg:      '#181818',
  surface: '#1C1D20',
  gray:    '#222326',
  white:   '#F4F5F8',
  muted:   'rgba(244,245,248,0.42)',
  dim:     'rgba(244,245,248,0.18)',
  border:  'rgba(244,245,248,0.07)',
  green:   '#4ADE80',
  red:     '#F87171',
  amber:   '#FBBF24',
  blue:    '#93C5FD',
}

// ── Types ─────────────────────────────────────────────────────────────────────
type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue'

interface Invoice {
  id:          string
  number:      string
  client:      string
  description: string
  date:        string
  dueDate:     string
  amount:      number
  vat:         boolean
  status:      InvoiceStatus
  sentDate?:   string
  paidDate?:   string
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function today()   { return new Date().toISOString().slice(0, 10) }
function in30()    { const d = new Date(); d.setDate(d.getDate() + 30); return d.toISOString().slice(0, 10) }
function fmt(n: number) { return '£' + Math.round(n).toLocaleString('en-GB') }
function fmtDec(n: number) { return '£' + n.toLocaleString('en-GB', { minimumFractionDigits: 2 }) }

function vatTotal(inv: Invoice)  { return inv.vat ? inv.amount * 1.2 : inv.amount }
function isPastDue(inv: Invoice) {
  return (inv.status === 'sent' || inv.status === 'overdue')
    && new Date(inv.dueDate) < new Date(today())
}
function daysOverdue(inv: Invoice) {
  return Math.ceil((new Date().getTime() - new Date(inv.dueDate).getTime()) / 86400000)
}
function daysToDue(inv: Invoice) {
  return Math.ceil((new Date(inv.dueDate).getTime() - new Date().getTime()) / 86400000)
}

// ── Status badge ──────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<InvoiceStatus, { label: string; color: string; bg: string; Icon: React.ElementType }> = {
  draft:   { label: 'Draft',   color: C.muted,  bg: 'rgba(244,245,248,0.05)', Icon: FileText      },
  sent:    { label: 'Sent',    color: C.blue,   bg: 'rgba(147,197,253,0.08)', Icon: Clock         },
  paid:    { label: 'Paid',    color: C.green,  bg: 'rgba(74,222,128,0.08)',  Icon: CheckCircle2  },
  overdue: { label: 'Overdue', color: C.red,    bg: 'rgba(248,113,113,0.08)', Icon: AlertTriangle },
}

function StatusBadge({ status }: { status: InvoiceStatus }) {
  const { label, color, bg, Icon } = STATUS_CONFIG[status]
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 8px', borderRadius: '3px', background: bg, color, fontSize: '0.7rem', fontWeight: 600, fontFamily: 'var(--font-geist-mono), monospace', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
      <Icon size={10} strokeWidth={2} />
      {label}
    </span>
  )
}

// ── Chase email generator ─────────────────────────────────────────────────────
function chaseEmail(inv: Invoice): string {
  const days = daysOverdue(inv)
  const total = fmtDec(vatTotal(inv))
  return `Subject: Payment Reminder — Invoice ${inv.number} (${days} days overdue)

Dear ${inv.client},

I hope this message finds you well.

I'm writing to follow up on Invoice ${inv.number} for ${total}, which was due on ${inv.dueDate} and is now ${days} day${days === 1 ? '' : 's'} overdue.

Could you please let me know when I can expect payment, or if there are any issues with the invoice I can help resolve?

Invoice details:
  Invoice number: ${inv.number}
  Description:    ${inv.description}
  Amount due:     ${total}
  Due date:       ${inv.dueDate}

If payment has already been sent, please disregard this message.

Many thanks,
[Your name]`
}

// ── Input / label styles ──────────────────────────────────────────────────────
const inputS: React.CSSProperties = {
  width: '100%', background: C.gray, border: `1px solid ${C.border}`,
  borderRadius: '4px', padding: '9px 11px', color: C.white,
  fontSize: '0.84rem', outline: 'none', boxSizing: 'border-box',
}
const labelS: React.CSSProperties = {
  display: 'block', color: C.dim, fontSize: '0.6rem',
  textTransform: 'uppercase', letterSpacing: '0.09em',
  marginBottom: '4px', fontWeight: 600, fontFamily: 'var(--font-geist-mono), monospace',
}

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, color = C.white, sub }: { label: string; value: string; color?: string; sub?: string }) {
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: '6px', padding: '1rem 1.1rem' }}>
      <div style={{ color: C.dim, fontSize: '0.58rem', textTransform: 'uppercase', letterSpacing: '0.09em', fontWeight: 600, fontFamily: 'var(--font-geist-mono), monospace', marginBottom: '6px' }}>{label}</div>
      <div style={{ color, fontSize: '1.35rem', fontWeight: 600, letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ color: C.dim, fontSize: '0.65rem', marginTop: '4px' }}>{sub}</div>}
    </div>
  )
}

// ── Copy button ───────────────────────────────────────────────────────────────
function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  function copy() {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button onClick={copy}
      style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'none', border: `1px solid ${C.border}`, borderRadius: '4px', padding: '6px 10px', color: copied ? C.green : C.muted, fontSize: '0.72rem', cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'var(--font-geist-mono), monospace' }}>
      {copied ? <Check size={11} /> : <Copy size={11} />}
      {copied ? 'Copied' : 'Copy email'}
    </button>
  )
}

// ── Invoice row ───────────────────────────────────────────────────────────────
function InvoiceRow({ inv, onUpdate, onDelete }: {
  inv: Invoice
  onUpdate: (id: string, patch: Partial<Invoice>) => void
  onDelete: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const overdue  = inv.status === 'overdue'
  const total    = vatTotal(inv)
  const daysLeft = daysToDue(inv)

  return (
    <div style={{ borderBottom: `1px solid ${C.border}` }}>
      {/* Row summary */}
      <div
        onClick={() => setOpen(o => !o)}
        style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto', gap: '1rem', alignItems: 'center', padding: '0.9rem 1.1rem', cursor: 'pointer', transition: 'background 0.1s' }}
        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(244,245,248,0.02)'}
        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px', flexWrap: 'wrap' }}>
            <span style={{ color: C.white, fontSize: '0.85rem', fontWeight: 500 }}>{inv.client}</span>
            <span style={{ color: C.dim, fontSize: '0.72rem', fontFamily: 'var(--font-geist-mono), monospace' }}>#{inv.number}</span>
            <StatusBadge status={inv.status} />
          </div>
          <div style={{ color: C.muted, fontSize: '0.75rem' }}>
            {inv.description}
            {inv.status === 'sent' && !overdue && (
              <span style={{ color: daysLeft <= 7 ? C.amber : C.dim, fontFamily: 'var(--font-geist-mono), monospace', marginLeft: '8px' }}>
                · due in {daysLeft}d
              </span>
            )}
            {overdue && (
              <span style={{ color: C.red, fontFamily: 'var(--font-geist-mono), monospace', marginLeft: '8px' }}>
                · {daysOverdue(inv)}d overdue
              </span>
            )}
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div style={{ color: inv.status === 'paid' ? C.green : C.white, fontSize: '0.9rem', fontWeight: 600, fontFamily: 'var(--font-geist-mono), monospace', fontVariantNumeric: 'tabular-nums' }}>
            {fmtDec(total)}
          </div>
          {inv.vat && <div style={{ color: C.dim, fontSize: '0.62rem', fontFamily: 'var(--font-geist-mono), monospace' }}>inc. VAT</div>}
        </div>

        <div style={{ color: C.dim, fontSize: '0.7rem', fontFamily: 'var(--font-geist-mono), monospace', whiteSpace: 'nowrap' }}>
          {inv.date}
        </div>

        <ChevronDown size={13} style={{ color: C.dim, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }} />
      </div>

      {/* Expanded detail */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ padding: '0 1.1rem 1.1rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>

              {/* Amount breakdown */}
              <div style={{ background: C.gray, borderRadius: '4px', padding: '0.75rem 1rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '0.75rem' }}>
                <div>
                  <div style={{ color: C.dim, fontSize: '0.58rem', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'var(--font-geist-mono), monospace', marginBottom: '3px' }}>Net</div>
                  <div style={{ color: C.white, fontFamily: 'var(--font-geist-mono), monospace', fontVariantNumeric: 'tabular-nums' }}>{fmtDec(inv.amount)}</div>
                </div>
                {inv.vat && (
                  <div>
                    <div style={{ color: C.dim, fontSize: '0.58rem', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'var(--font-geist-mono), monospace', marginBottom: '3px' }}>VAT (20%)</div>
                    <div style={{ color: C.white, fontFamily: 'var(--font-geist-mono), monospace', fontVariantNumeric: 'tabular-nums' }}>{fmtDec(inv.amount * 0.2)}</div>
                  </div>
                )}
                <div>
                  <div style={{ color: C.dim, fontSize: '0.58rem', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'var(--font-geist-mono), monospace', marginBottom: '3px' }}>Total due</div>
                  <div style={{ color: C.white, fontWeight: 600, fontFamily: 'var(--font-geist-mono), monospace', fontVariantNumeric: 'tabular-nums' }}>{fmtDec(total)}</div>
                </div>
                <div>
                  <div style={{ color: C.dim, fontSize: '0.58rem', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'var(--font-geist-mono), monospace', marginBottom: '3px' }}>Due date</div>
                  <div style={{ color: overdue ? C.red : C.white, fontFamily: 'var(--font-geist-mono), monospace' }}>{inv.dueDate}</div>
                </div>
              </div>

              {/* Status actions */}
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                {inv.status === 'draft' && (
                  <button onClick={() => onUpdate(inv.id, { status: 'sent', sentDate: today() })}
                    style={{ background: C.white, color: C.bg, border: 'none', borderRadius: '4px', padding: '7px 14px', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', letterSpacing: '-0.01em' }}>
                    Mark as Sent
                  </button>
                )}
                {(inv.status === 'sent' || overdue) && (
                  <button onClick={() => onUpdate(inv.id, { status: 'paid', paidDate: today() })}
                    style={{ background: C.green, color: C.bg, border: 'none', borderRadius: '4px', padding: '7px 14px', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', letterSpacing: '-0.01em' }}>
                    Mark as Paid
                  </button>
                )}
                {inv.status === 'sent' && (
                  <button onClick={() => onUpdate(inv.id, { status: 'overdue' })}
                    style={{ background: 'transparent', color: C.red, border: `1px solid rgba(248,113,113,0.3)`, borderRadius: '4px', padding: '6px 12px', fontSize: '0.75rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                    <AlertTriangle size={11} /> Mark Overdue
                  </button>
                )}
                {overdue && (
                  <button onClick={() => onUpdate(inv.id, { status: 'sent' })}
                    style={{ background: 'transparent', color: C.muted, border: `1px solid ${C.border}`, borderRadius: '4px', padding: '6px 12px', fontSize: '0.75rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                    <Undo2 size={11} /> Revert to Sent
                  </button>
                )}
                {inv.status === 'paid' && (
                  <span style={{ color: C.green, fontSize: '0.78rem', fontFamily: 'var(--font-geist-mono), monospace' }}>
                    ✓ Paid {inv.paidDate ?? ''}
                  </span>
                )}
                {overdue && <CopyBtn text={chaseEmail(inv)} />}
                <button onClick={() => onDelete(inv.id)}
                  style={{ marginLeft: 'auto', background: 'none', border: `1px solid ${C.border}`, borderRadius: '4px', padding: '6px 10px', color: 'rgba(248,113,113,0.5)', fontSize: '0.72rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', transition: 'all 0.15s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = C.red; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(248,113,113,0.3)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(248,113,113,0.5)'; (e.currentTarget as HTMLElement).style.borderColor = C.border }}>
                  <Trash2 size={11} /> Delete
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ── PAGE ──────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
export default function InvoicesPage() {
  const { items: invoices, persist, loading, isAuthenticated } = useUserData<Invoice>(
    'user_invoices', 'ea_invoices', [],
  )

  const [showForm, setShowForm] = useState(false)
  const [filter,   setFilter]   = useState<InvoiceStatus | 'all'>('all')
  const [form, setForm] = useState({
    client: '', number: '', description: '', date: today(), dueDate: in30(), amount: '', vat: false,
  })

  // ── Next invoice number ────────────────────────────────────────────────────
  const nextNumber = useMemo(() => {
    const nums = invoices.map(i => parseInt(i.number.replace(/\D/g, ''), 10)).filter(Boolean)
    const max  = nums.length ? Math.max(...nums) : 0
    return String(max + 1).padStart(4, '0')
  }, [invoices])

  // ── Sweep: flip sent → overdue for any past-due invoices, persisted. ──────
  const sweptRef = useRef(false)
  useEffect(() => {
    if (loading || sweptRef.current) return
    const needsFlip = invoices.some(i => i.status === 'sent' && isPastDue(i))
    if (!needsFlip) { sweptRef.current = true; return }
    sweptRef.current = true
    const next = invoices.map(i =>
      i.status === 'sent' && isPastDue(i) ? { ...i, status: 'overdue' as InvoiceStatus } : i,
    )
    void persist(next)
  }, [loading, invoices, persist])

  // ── Stats (trust persisted status) ────────────────────────────────────────
  const stats = useMemo(() => {
    const sent    = invoices.filter(i => i.status === 'sent')
    const overdue = invoices.filter(i => i.status === 'overdue')
    const paid    = invoices.filter(i => i.status === 'paid')
    const draft   = invoices.filter(i => i.status === 'draft')
    return {
      outstanding: sent.reduce((s, i) => s + vatTotal(i), 0),
      overdue:     overdue.reduce((s, i) => s + vatTotal(i), 0),
      paid:        paid.reduce((s, i) => s + vatTotal(i), 0),
      draftCount:  draft.length,
      overdueCount: overdue.length,
    }
  }, [invoices])

  const displayed = useMemo(() => {
    if (filter === 'all') return invoices
    return invoices.filter(i => i.status === filter)
  }, [invoices, filter])

  // ── Mutations ──────────────────────────────────────────────────────────────
  async function add(e: React.FormEvent) {
    e.preventDefault()
    const amount = parseFloat(form.amount)
    if (!amount || !form.client.trim()) return
    const inv: Invoice = {
      id: crypto.randomUUID(), status: 'draft',
      client: form.client, number: form.number || nextNumber,
      description: form.description, date: form.date,
      dueDate: form.dueDate, amount, vat: form.vat,
    }
    await persist([inv, ...invoices])
    setForm({ client: '', number: '', description: '', date: today(), dueDate: in30(), amount: '', vat: false })
    setShowForm(false)
  }

  async function update(id: string, patch: Partial<Invoice>) {
    await persist(invoices.map(i => i.id === id ? { ...i, ...patch } : i))
  }

  async function remove(id: string) {
    await persist(invoices.filter(i => i.id !== id))
  }

  const FILTERS: { key: InvoiceStatus | 'all'; label: string }[] = [
    { key: 'all',     label: 'All' },
    { key: 'draft',   label: 'Draft' },
    { key: 'sent',    label: 'Sent' },
    { key: 'overdue', label: 'Overdue' },
    { key: 'paid',    label: 'Paid' },
  ]

  return (
    <div style={{ padding: 'clamp(1.5rem, 4vw, 2.5rem)', maxWidth: '960px' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.75rem' }}>
        <div>
          <div style={{ color: C.dim, fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '5px', fontFamily: 'var(--font-geist-mono), monospace' }}>billing</div>
          <h1 style={{ color: C.white, fontSize: 'clamp(1.4rem, 3vw, 1.9rem)', fontWeight: 600, letterSpacing: '-0.03em', margin: '0 0 4px' }}>
            Invoices
          </h1>
          <p style={{ color: C.muted, fontSize: '0.78rem', margin: 0, maxWidth: '40ch', lineHeight: 1.5 }}>
            Track sent, paid, and overdue invoices. Generate chase emails in one click.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: C.muted, fontSize: '0.68rem', fontFamily: 'var(--font-geist-mono), monospace', padding: '6px 10px', border: `1px solid ${C.border}`, borderRadius: '4px' }}>
            {isAuthenticated ? <><Cloud size={11} style={{ color: C.green }} /> synced</> : <><CloudOff size={11} /> local only</>}
          </div>
          <button onClick={() => setShowForm(o => !o)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: C.white, color: C.bg, border: 'none', borderRadius: '4px', padding: '8px 16px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', letterSpacing: '-0.01em' }}>
            <Plus size={14} strokeWidth={2.5} /> New Invoice
          </button>
        </div>
      </div>

      {/* ── Stats ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <StatCard label="Outstanding"    value={fmt(stats.outstanding)} color={stats.outstanding > 0 ? C.blue  : C.muted} sub={`awaiting payment`} />
        <StatCard label="Overdue"        value={fmt(stats.overdue)}     color={stats.overdue     > 0 ? C.red   : C.muted} sub={`${stats.overdueCount} invoice${stats.overdueCount !== 1 ? 's' : ''}`} />
        <StatCard label="Paid this year" value={fmt(stats.paid)}        color={stats.paid        > 0 ? C.green : C.muted} sub="collected" />
        <StatCard label="Drafts"         value={String(stats.draftCount)} color={C.muted} sub="not yet sent" />
      </div>

      {/* ── Overdue alert ── */}
      <AnimatePresence>
        {stats.overdueCount > 0 && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{ marginBottom: '1.25rem', padding: '10px 14px', background: 'rgba(248,113,113,0.06)', border: `1px solid rgba(248,113,113,0.2)`, borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertTriangle size={13} style={{ color: C.red, flexShrink: 0 }} />
              <span style={{ color: C.red, fontSize: '0.78rem' }}>
                <strong>{stats.overdueCount}</strong> overdue invoice{stats.overdueCount !== 1 ? 's' : ''} · {fmt(stats.overdue)} outstanding. Click an invoice to copy a chase email.
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── New invoice form ── */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            style={{ marginBottom: '1.25rem' }}>
            <form onSubmit={add}
              style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: '6px', padding: '1.25rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.85rem', alignItems: 'end' }}>
              <div>
                <label style={labelS}>Client name</label>
                <input value={form.client} onChange={e => setForm(f => ({ ...f, client: e.target.value }))}
                  placeholder="Acme Ltd" style={{ ...inputS, fontFamily: 'inherit' }} required />
              </div>
              <div>
                <label style={labelS}>Invoice #</label>
                <input value={form.number} onChange={e => setForm(f => ({ ...f, number: e.target.value }))}
                  placeholder={nextNumber} style={inputS} />
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={labelS}>Description / services</label>
                <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Web development — April 2026" style={{ ...inputS, fontFamily: 'inherit' }} />
              </div>
              <div>
                <label style={labelS}>Invoice date</label>
                <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} style={inputS} />
              </div>
              <div>
                <label style={labelS}>Due date</label>
                <input type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} style={inputS} />
              </div>
              <div>
                <label style={labelS}>Net amount (£)</label>
                <input type="number" min={0} step={0.01} value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                  placeholder="0.00" style={inputS} required />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={labelS}>VAT</label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={form.vat} onChange={e => setForm(f => ({ ...f, vat: e.target.checked }))}
                    style={{ width: '14px', height: '14px', accentColor: C.white, cursor: 'pointer' }} />
                  <span style={{ color: C.muted, fontSize: '0.82rem' }}>Add 20% VAT</span>
                </label>
              </div>
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                <button type="submit" style={{ flex: 1, background: C.white, color: C.bg, border: 'none', borderRadius: '4px', padding: '9px', fontWeight: 600, cursor: 'pointer', fontSize: '0.8rem', minHeight: '40px', letterSpacing: '-0.01em' }}>
                  Create
                </button>
                <button type="button" onClick={() => setShowForm(false)}
                  style={{ background: 'transparent', color: C.muted, border: `1px solid ${C.border}`, borderRadius: '4px', padding: '9px 12px', cursor: 'pointer', fontSize: '0.8rem', minHeight: '40px' }}>
                  Cancel
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Filter tabs ── */}
      <div style={{ display: 'flex', gap: '0.35rem', marginBottom: '0.85rem', flexWrap: 'wrap' }}>
        {FILTERS.map(({ key, label }) => (
          <button key={key} onClick={() => setFilter(key)}
            style={{
              padding: '5px 12px', borderRadius: '3px', border: `1px solid ${filter === key ? 'rgba(244,245,248,0.2)' : C.border}`,
              background: filter === key ? 'rgba(244,245,248,0.07)' : 'transparent',
              color: filter === key ? C.white : C.muted, fontSize: '0.75rem', cursor: 'pointer', fontWeight: filter === key ? 500 : 400,
              transition: 'all 0.1s',
            }}>
            {label}
          </button>
        ))}
      </div>

      {/* ── Invoice list ── */}
      {loading ? (
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: '6px', padding: '3rem', textAlign: 'center', color: C.muted, fontSize: '0.84rem' }}>Loading…</div>
      ) : displayed.length === 0 ? (
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: '6px', padding: '3.5rem', textAlign: 'center' }}>
          <div style={{ color: C.muted, fontSize: '0.84rem', marginBottom: '6px' }}>{invoices.length === 0 ? 'No invoices yet.' : 'No invoices match this filter.'}</div>
          {invoices.length === 0 && <div style={{ color: C.dim, fontSize: '0.72rem', fontFamily: 'var(--font-geist-mono), monospace' }}>Create your first one above.</div>}
        </div>
      ) : (
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: '6px', overflow: 'hidden' }}>
          {displayed.map(inv => (
            <InvoiceRow key={inv.id} inv={inv} onUpdate={update} onDelete={remove} />
          ))}
        </div>
      )}
    </div>
  )
}
