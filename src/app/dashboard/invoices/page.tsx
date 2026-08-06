'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Cloud, CloudOff, AlertTriangle } from 'lucide-react'
import { useInvoices, fmt, type InvoiceStatus } from '@/lib/hooks/useInvoices'
import { InvoiceRow } from '@/features/invoices/InvoiceRow'
import { InvoiceForm } from '@/features/invoices/InvoiceForm'

/**
 * Accent colours arrive as Tailwind classes rather than palette strings.
 *
 * The card used to take `color?: string` and drop it into an inline style, so
 * every caller reached into `C` to pass a hex. A class keeps the value in the
 * theme where the contrast ratios are documented.
 */
function StatCard({
  label,
  value,
  accentClass = 'text-sa-white',
  sub,
}: {
  label: string
  value: string
  accentClass?: string
  sub?: string
}) {
  return (
    <div className="bg-sa-surface border border-sa-border rounded-[6px] px-[1.1rem] py-4">
      <div className="text-sa-dim text-micro uppercase tracking-[0.09em] font-semibold font-mono mb-[6px]">
        {label}
      </div>
      <div
        className={`${accentClass} text-heading font-semibold tracking-[-0.03em] tabular-nums leading-none`}
      >
        {value}
      </div>
      {sub && <div className="text-sa-dim text-micro mt-1">{sub}</div>}
    </div>
  )
}

const FILTERS: { key: InvoiceStatus | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'draft', label: 'Draft' },
  { key: 'sent', label: 'Sent' },
  { key: 'overdue', label: 'Overdue' },
  { key: 'paid', label: 'Paid' },
]

/** Panel chrome shared by the loading, empty and populated states. */
const PANEL = 'bg-sa-surface border border-sa-border rounded-[6px]'

export default function InvoicesPage() {
  const {
    invoices,
    displayed,
    loading,
    isAuthenticated,
    showForm,
    setShowForm,
    filter,
    setFilter,
    form,
    setForm,
    nextNumber,
    stats,
    add,
    update,
    remove,
  } = useInvoices()

  return (
    <div className="page-shell is-wide">
      <div className="flex items-start justify-between flex-wrap gap-4 mb-7">
        <div>
          <div className="text-sa-dim text-micro uppercase tracking-[0.12em] mb-[5px] font-mono">
            billing
          </div>
          <h1 className="text-sa-white text-h2 font-semibold tracking-[-0.03em] mt-0 mb-1">
            Invoices
          </h1>
          <p className="text-sa-muted text-caption m-0 max-w-[40ch] leading-[1.5]">
            Track sent, paid, and overdue invoices. Generate chase emails in one click.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-[5px] text-sa-muted text-micro font-mono px-[10px] py-[6px] border border-sa-border rounded-[4px]">
            {isAuthenticated ? (
              <>
                <Cloud size={12} className="text-sa-green" /> synced
              </>
            ) : (
              <>
                <CloudOff size={12} /> local only
              </>
            )}
          </div>
          <button
            onClick={() => setShowForm((o) => !o)}
            className="flex items-center gap-[6px] bg-sa-white text-sa-black border-none rounded-[4px] px-4 py-2 text-meta font-semibold cursor-pointer tracking-[-0.01em]"
          >
            <Plus size={14} strokeWidth={2.5} /> New Invoice
          </button>
        </div>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-3 mb-6">
        <StatCard
          label="Outstanding"
          value={fmt(stats.outstanding)}
          accentClass={stats.outstanding > 0 ? 'text-sa-blue' : 'text-sa-muted'}
          sub="awaiting payment"
        />
        <StatCard
          label="Overdue"
          value={fmt(stats.overdue)}
          accentClass={stats.overdue > 0 ? 'text-sa-red' : 'text-sa-muted'}
          sub={`${stats.overdueCount} invoice${stats.overdueCount !== 1 ? 's' : ''}`}
        />
        <StatCard
          label="Paid this year"
          value={fmt(stats.paid)}
          accentClass={stats.paid > 0 ? 'text-sa-green' : 'text-sa-muted'}
          sub="collected"
        />
        <StatCard
          label="Drafts"
          value={String(stats.draftCount)}
          accentClass="text-sa-muted"
          sub="not yet sent"
        />
      </div>

      <AnimatePresence>
        {stats.overdueCount > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            // The one-off rgba(248,113,113,0.06)/0.2 pair is now the shared
            // red wash. The @theme block exists so callouts stop inventing
            // their own alphas; this is a hair more visible and consistent
            // with every other red callout in the app.
            className="mb-5 px-[14px] py-[10px] bg-sa-red-tint border border-sa-red-line rounded-[4px] flex items-center justify-between gap-3 flex-wrap"
          >
            <div className="flex items-center gap-2">
              <AlertTriangle size={12} className="text-sa-red shrink-0" />
              <span className="text-sa-red text-caption">
                <strong>{stats.overdueCount}</strong> overdue invoice
                {stats.overdueCount !== 1 ? 's' : ''} · {fmt(stats.overdue)} outstanding. Click an
                invoice to copy a chase email.
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showForm && (
          <InvoiceForm
            form={form}
            setForm={setForm}
            nextNumber={nextNumber}
            onSubmit={add}
            onCancel={() => setShowForm(false)}
          />
        )}
      </AnimatePresence>

      <div className="flex gap-[0.35rem] mb-[0.85rem] flex-wrap">
        {FILTERS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            aria-pressed={filter === key}
            className={`px-3 py-[5px] rounded-[3px] border text-caption cursor-pointer transition-all duration-100 ${
              filter === key
                ? 'border-sa-line bg-sa-selected text-sa-white font-medium'
                : 'border-sa-border bg-transparent text-sa-muted'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className={`${PANEL} p-12 text-center text-sa-muted text-meta`}>Loading…</div>
      ) : displayed.length === 0 ? (
        <div className={`${PANEL} p-14 text-center`}>
          <div className="text-sa-muted text-meta mb-[6px]">
            {invoices.length === 0 ? 'No invoices yet.' : 'No invoices match this filter.'}
          </div>
          {invoices.length === 0 && (
            <div className="text-sa-dim text-caption font-mono">Create your first one above.</div>
          )}
        </div>
      ) : (
        <div className={`${PANEL} overflow-hidden`}>
          {displayed.map((inv) => (
            <InvoiceRow key={inv.id} inv={inv} onUpdate={update} onDelete={remove} />
          ))}
        </div>
      )}
    </div>
  )
}
