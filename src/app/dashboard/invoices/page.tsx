'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Cloud, CloudOff, AlertTriangle } from 'lucide-react'
import { useInvoices, fmt, type InvoiceStatus } from '@/lib/hooks/useInvoices'
import { InvoiceRow } from '@/features/invoices/InvoiceRow'
import { InvoiceForm } from '@/features/invoices/InvoiceForm'
import { SkeletonRows } from '@/components/ui/Skeleton'

import { C } from '@/styles/palette'
function StatCard({ label, value, color = C.white, sub }: { label: string; value: string; color?: string; sub?: string }) {
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: '6px', padding: '1rem 1.1rem' }}>
      <div style={{ color: C.dim, fontSize: '0.58rem', textTransform: 'uppercase', letterSpacing: '0.09em', fontWeight: 600, fontFamily: 'var(--font-geist-mono), monospace', marginBottom: '6px' }}>{label}</div>
      <div style={{ color, fontSize: '1.35rem', fontWeight: 600, letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ color: C.dim, fontSize: '0.65rem', marginTop: '4px' }}>{sub}</div>}
    </div>
  )
}

const FILTERS: { key: InvoiceStatus | 'all'; label: string }[] = [
  { key: 'all',     label: 'All' },
  { key: 'draft',   label: 'Draft' },
  { key: 'sent',    label: 'Sent' },
  { key: 'overdue', label: 'Overdue' },
  { key: 'paid',    label: 'Paid' },
]

export default function InvoicesPage() {
  const {
    invoices, displayed, loading, isAuthenticated,
    showForm, setShowForm,
    filter, setFilter,
    form, setForm,
    nextNumber, stats,
    add, update, remove,
  } = useInvoices()

  return (
    <div style={{ padding: 'clamp(1.5rem, 4vw, 2.5rem)', maxWidth: '960px' }}>
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

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <StatCard label="Outstanding"    value={fmt(stats.outstanding)} color={stats.outstanding > 0 ? C.blue  : C.muted} sub="awaiting payment" />
        <StatCard label="Overdue"        value={fmt(stats.overdue)}     color={stats.overdue     > 0 ? C.red   : C.muted} sub={`${stats.overdueCount} invoice${stats.overdueCount !== 1 ? 's' : ''}`} />
        <StatCard label="Paid this year" value={fmt(stats.paid)}        color={stats.paid        > 0 ? C.green : C.muted} sub="collected" />
        <StatCard label="Drafts"         value={String(stats.draftCount)} color={C.muted} sub="not yet sent" />
      </div>

      <AnimatePresence>
        {stats.overdueCount > 0 && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{ marginBottom: '1.25rem', padding: '10px 14px', background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertTriangle size={13} style={{ color: C.red, flexShrink: 0 }} />
              <span style={{ color: C.red, fontSize: '0.78rem' }}>
                <strong>{stats.overdueCount}</strong> overdue invoice{stats.overdueCount !== 1 ? 's' : ''} · {fmt(stats.overdue)} outstanding. Click an invoice to copy a chase email.
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showForm && (
          <InvoiceForm
            form={form} setForm={setForm} nextNumber={nextNumber}
            onSubmit={add}
            onCancel={() => setShowForm(false)}
          />
        )}
      </AnimatePresence>

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

      {loading ? (
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: '6px', padding: '1rem 1.1rem' }}><SkeletonRows count={6} /></div>
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
