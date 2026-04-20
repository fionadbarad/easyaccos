'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Trash2, Copy, Check, FileText, Clock, AlertTriangle,
  CheckCircle2, ChevronDown, Undo2,
} from 'lucide-react'
import type { Invoice, InvoiceStatus } from '@/lib/validators'
import {
  vatTotal, daysOverdue, daysToDue, fmtDec, chaseEmail,
} from '@/lib/hooks/useInvoices'

import { C } from '@/styles/palette'
function today() { return new Date().toISOString().slice(0, 10) }

const STATUS_CONFIG: Record<InvoiceStatus, { label: string; color: string; bg: string; Icon: React.ElementType }> = {
  draft:   { label: 'Draft',   color: C.muted, bg: 'rgba(244,245,248,0.05)', Icon: FileText      },
  sent:    { label: 'Sent',    color: C.blue,  bg: 'rgba(147,197,253,0.08)', Icon: Clock         },
  paid:    { label: 'Paid',    color: C.green, bg: 'rgba(74,222,128,0.08)',  Icon: CheckCircle2  },
  overdue: { label: 'Overdue', color: C.red,   bg: 'rgba(248,113,113,0.08)', Icon: AlertTriangle },
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

export function InvoiceRow({ inv, onUpdate, onDelete }: {
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
