'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Cloud, CloudOff, AlertTriangle } from 'lucide-react'
import { useInvoices, fmt, type InvoiceStatus } from '@/lib/hooks/useInvoices'
import { InvoiceRow } from '@/features/invoices/InvoiceRow'
import { InvoiceForm } from '@/features/invoices/InvoiceForm'

function StatCard({ label, value, color = 'var(--sa-white)', sub }: { label: string; value: string; color?: string; sub?: string }) {
  return (
    <div className="bg-[var(--sa-surface)] border border-[var(--sa-border)] rounded-[6px] px-[1.1rem] py-[1rem]">
      <div className="text-[rgba(244,245,248,0.18)] text-[0.58rem] uppercase tracking-[0.09em] font-semibold font-mono mb-[6px]">{label}</div>
      <div className="text-[1.35rem] font-semibold tracking-[-0.03em] tabular-nums leading-[1]" style={{ color }}>{value}</div>
      {sub && <div className="text-[rgba(244,245,248,0.18)] text-[0.65rem] mt-[4px]">{sub}</div>}
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
    <div className="p-[clamp(1.5rem,4vw,2.5rem)] max-w-[960px]">
      <div className="flex items-start justify-between flex-wrap gap-[1rem] mb-[1.75rem]">
        <div>
          <div className="text-[rgba(244,245,248,0.18)] text-[0.6rem] uppercase tracking-[0.12em] mb-[5px] font-mono">billing</div>
          <h1 className="text-[var(--sa-white)] text-[clamp(1.4rem,3vw,1.9rem)] font-semibold tracking-[-0.03em] m-0 mb-[4px]">
            Invoices
          </h1>
          <p className="text-[rgba(244,245,248,0.42)] text-[0.78rem] m-0 max-w-[40ch] leading-[1.5]">
            Track sent, paid, and overdue invoices. Generate chase emails in one click.
          </p>
        </div>
        <div className="flex items-center gap-[0.5rem]">
          <div className="flex items-center gap-[5px] text-[rgba(244,245,248,0.42)] text-[0.68rem] font-mono px-[10px] py-[6px] border border-[var(--sa-border)] rounded-[4px]">
            {isAuthenticated ? <><Cloud size={11} className="text-[#4ADE80]" /> synced</> : <><CloudOff size={11} /> local only</>}
          </div>
          <button onClick={() => setShowForm(o => !o)}
            className="flex items-center gap-[6px] bg-[var(--sa-white)] text-[var(--sa-black)] border-none rounded-[4px] px-[16px] py-[8px] text-[0.8rem] font-semibold cursor-pointer tracking-[-0.01em]">
            <Plus size={14} strokeWidth={2.5} /> New Invoice
          </button>
        </div>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-[0.75rem] mb-[1.5rem]">
        <StatCard label="Outstanding"    value={fmt(stats.outstanding)} color={stats.outstanding > 0 ? '#93C5FD'  : 'rgba(244,245,248,0.42)'} sub="awaiting payment" />
        <StatCard label="Overdue"        value={fmt(stats.overdue)}     color={stats.overdue     > 0 ? '#F87171'   : 'rgba(244,245,248,0.42)'} sub={`${stats.overdueCount} invoice${stats.overdueCount !== 1 ? 's' : ''}`} />
        <StatCard label="Paid this year" value={fmt(stats.paid)}        color={stats.paid        > 0 ? '#4ADE80' : 'rgba(244,245,248,0.42)'} sub="collected" />
        <StatCard label="Drafts"         value={String(stats.draftCount)} color="rgba(244,245,248,0.42)" sub="not yet sent" />
      </div>

      <AnimatePresence>
        {stats.overdueCount > 0 && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="mb-[1.25rem] px-[14px] py-[10px] bg-[rgba(248,113,113,0.06)] border border-[rgba(248,113,113,0.2)] rounded-[4px] flex items-center justify-between gap-[0.75rem] flex-wrap">
            <div className="flex items-center gap-[8px]">
              <AlertTriangle size={13} className="text-[#F87171] shrink-0" />
              <span className="text-[#F87171] text-[0.78rem]">
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

      <div className="flex gap-[0.35rem] mb-[0.85rem] flex-wrap">
        {FILTERS.map(({ key, label }) => (
          <button key={key} onClick={() => setFilter(key)}
            className={`px-[12px] py-[5px] rounded-[3px] border text-[0.75rem] cursor-pointer transition-all duration-[100ms] ${filter === key ? 'border-[rgba(244,245,248,0.2)] bg-[var(--sa-border)] text-[var(--sa-white)] font-medium' : 'border-[var(--sa-border)] bg-transparent text-[rgba(244,245,248,0.42)] font-normal'}`}>
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="bg-[var(--sa-surface)] border border-[var(--sa-border)] rounded-[6px] p-[3rem] text-center text-[rgba(244,245,248,0.42)] text-[0.84rem]">Loading…</div>
      ) : displayed.length === 0 ? (
        <div className="bg-[var(--sa-surface)] border border-[var(--sa-border)] rounded-[6px] p-[3.5rem] text-center">
          <div className="text-[rgba(244,245,248,0.42)] text-[0.84rem] mb-[6px]">{invoices.length === 0 ? 'No invoices yet.' : 'No invoices match this filter.'}</div>
          {invoices.length === 0 && <div className="text-[rgba(244,245,248,0.18)] text-[0.72rem] font-mono">Create your first one above.</div>}
        </div>
      ) : (
        <div className="bg-[var(--sa-surface)] border border-[var(--sa-border)] rounded-[6px] overflow-hidden">
          {displayed.map(inv => (
            <InvoiceRow key={inv.id} inv={inv} onUpdate={update} onDelete={remove} />
          ))}
        </div>
      )}
    </div>
  )
}
