'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Trash2,
  Copy,
  Check,
  FileText,
  Clock,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Undo2,
} from 'lucide-react'
import type { Invoice, InvoiceStatus } from '@/lib/validators'
import { vatTotal, daysOverdue, daysToDue, fmtDec, chaseEmail } from '@/lib/hooks/useInvoices'

function today() {
  return new Date().toISOString().slice(0, 10)
}

const STATUS_CLASSES: Record<
  InvoiceStatus,
  { label: string; className: string; Icon: React.ElementType }
> = {
  draft: {
    label: 'Draft',
    className: 'text-sa-muted bg-sa-hover',
    Icon: FileText,
  },
  sent: { label: 'Sent', className: 'text-sa-blue bg-sa-blue-tint', Icon: Clock },
  paid: {
    label: 'Paid',
    className: 'text-sa-green bg-sa-green-tint',
    Icon: CheckCircle2,
  },
  overdue: {
    label: 'Overdue',
    className: 'text-sa-red bg-sa-red-tint',
    Icon: AlertTriangle,
  },
}

function StatusBadge({ status }: { status: InvoiceStatus }) {
  const { label, className, Icon } = STATUS_CLASSES[status]
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-[3px] rounded-[3px] text-micro font-semibold font-mono tracking-[0.04em] whitespace-nowrap ${className}`}
    >
      <Icon size={12} strokeWidth={2} />
      {label}
    </span>
  )
}

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  function copy() {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button
      onClick={copy}
      className={`flex items-center gap-[5px] bg-transparent border border-sa-border rounded-[4px] px-[10px] py-[6px] text-caption cursor-pointer transition-all duration-150 font-mono ${copied ? 'text-sa-green' : 'text-sa-muted'}`}
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
      {copied ? 'Copied' : 'Copy email'}
    </button>
  )
}

export function InvoiceRow({
  inv,
  onUpdate,
  onDelete,
}: {
  inv: Invoice
  onUpdate: (id: string, patch: Partial<Invoice>) => void
  onDelete: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const overdue = inv.status === 'overdue'
  const total = vatTotal(inv)
  const daysLeft = daysToDue(inv)

  return (
    <div className="border-b border-sa-border">
      <div
        onClick={() => setOpen((o) => !o)}
        className="grid grid-cols-[1fr_auto_auto_auto] gap-4 items-center px-[1.1rem] py-[0.9rem] cursor-pointer transition-[background] duration-100 hover:bg-sa-tint"
      >
        <div>
          <div className="flex items-center gap-2 mb-[3px] flex-wrap">
            <span className="text-sa-white text-body font-medium">{inv.client}</span>
            <span className="text-sa-dim text-caption font-mono">#{inv.number}</span>
            <StatusBadge status={inv.status} />
          </div>
          <div className="text-sa-muted text-caption">
            {inv.description}
            {inv.status === 'sent' && !overdue && (
              <span className={`font-mono ml-2 ${daysLeft <= 7 ? 'text-sa-amber' : 'text-sa-dim'}`}>
                · due in {daysLeft}d
              </span>
            )}
            {overdue && (
              <span className="text-sa-red font-mono ml-2">· {daysOverdue(inv)}d overdue</span>
            )}
          </div>
        </div>

        <div className="text-right">
          <div
            className={`text-body font-semibold font-mono tabular-nums ${inv.status === 'paid' ? 'text-sa-green' : 'text-sa-white'}`}
          >
            {fmtDec(total)}
          </div>
          {inv.vat && <div className="text-sa-dim text-micro font-mono">inc. VAT</div>}
        </div>

        <div className="text-sa-dim text-micro font-mono whitespace-nowrap">{inv.date}</div>

        <ChevronDown
          size={12}
          className={`text-sa-dim transition-transform duration-200 flex-shrink-0 ${open ? 'rotate-180' : ''}`}
        />
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div className="px-[1.1rem] pb-[1.1rem] flex flex-col gap-[0.85rem]">
              <div className="bg-sa-gray rounded-[4px] px-4 py-3 grid grid-cols-[repeat(auto-fit,minmax(120px,1fr))] gap-3">
                <div>
                  <div className="text-sa-dim text-micro uppercase tracking-[0.08em] font-mono mb-[3px]">
                    Net
                  </div>
                  <div className="text-sa-white font-mono tabular-nums">{fmtDec(inv.amount)}</div>
                </div>
                {inv.vat && (
                  <div>
                    <div className="text-sa-dim text-micro uppercase tracking-[0.08em] font-mono mb-[3px]">
                      VAT (20%)
                    </div>
                    <div className="text-sa-white font-mono tabular-nums">
                      {fmtDec(inv.amount * 0.2)}
                    </div>
                  </div>
                )}
                <div>
                  <div className="text-sa-dim text-micro uppercase tracking-[0.08em] font-mono mb-[3px]">
                    Total due
                  </div>
                  <div className="text-sa-white font-semibold font-mono tabular-nums">
                    {fmtDec(total)}
                  </div>
                </div>
                <div>
                  <div className="text-sa-dim text-micro uppercase tracking-[0.08em] font-mono mb-[3px]">
                    Due date
                  </div>
                  <div className={`font-mono ${overdue ? 'text-sa-red' : 'text-sa-white'}`}>
                    {inv.dueDate}
                  </div>
                </div>
              </div>

              <div className="flex gap-2 flex-wrap items-center">
                {inv.status === 'draft' && (
                  <button
                    onClick={() => onUpdate(inv.id, { status: 'sent', sentDate: today() })}
                    className="bg-sa-white text-sa-black border-none rounded-[4px] px-[14px] py-[7px] text-caption font-semibold cursor-pointer tracking-[-0.01em]"
                  >
                    Mark as Sent
                  </button>
                )}
                {(inv.status === 'sent' || overdue) && (
                  <button
                    onClick={() => onUpdate(inv.id, { status: 'paid', paidDate: today() })}
                    className="bg-sa-green text-sa-black border-none rounded-[4px] px-[14px] py-[7px] text-caption font-semibold cursor-pointer tracking-[-0.01em]"
                  >
                    Mark as Paid
                  </button>
                )}
                {inv.status === 'sent' && (
                  <button
                    onClick={() => onUpdate(inv.id, { status: 'overdue' })}
                    className="bg-transparent text-sa-red border border-sa-red-line rounded-[4px] px-3 py-[6px] text-caption cursor-pointer inline-flex items-center gap-[5px]"
                  >
                    <AlertTriangle size={12} /> Mark Overdue
                  </button>
                )}
                {overdue && (
                  <button
                    onClick={() => onUpdate(inv.id, { status: 'sent' })}
                    className="bg-transparent text-sa-muted border border-sa-border rounded-[4px] px-3 py-[6px] text-caption cursor-pointer inline-flex items-center gap-[5px]"
                  >
                    <Undo2 size={12} /> Revert to Sent
                  </button>
                )}
                {inv.status === 'paid' && (
                  <span className="text-sa-green text-caption font-mono">
                    ✓ Paid {inv.paidDate ?? ''}
                  </span>
                )}
                {overdue && <CopyBtn text={chaseEmail(inv)} />}
                <button
                  onClick={() => onDelete(inv.id)}
                  className="ml-auto bg-transparent border border-sa-border rounded-[4px] px-[10px] py-[6px] text-sa-red/60 text-caption cursor-pointer flex items-center gap-1 transition-all duration-150 hover:text-sa-red hover:border-sa-red-line"
                >
                  <Trash2 size={12} /> Delete
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
