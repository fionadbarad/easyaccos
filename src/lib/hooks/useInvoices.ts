'use client'

import { useState, useMemo, useEffect } from 'react'
import { useUserData } from '@/lib/use-user-data'
import type { Invoice, InvoiceStatus, VatTreatment } from '@/lib/validators'

export type { Invoice, InvoiceStatus, VatTreatment }

export interface InvoiceFormState {
  client: string
  number: string
  description: string
  date: string
  dueDate: string
  amount: string
  vatTreatment: VatTreatment
}

function today() {
  return new Date().toISOString().slice(0, 10)
}
function in30() {
  const d = new Date()
  d.setDate(d.getDate() + 30)
  return d.toISOString().slice(0, 10)
}

/** UK VAT rate applied to each treatment, as a fraction of the net amount. */
export const VAT_RATES: Record<VatTreatment, number> = {
  standard: 0.2,
  reduced: 0.05,
  zero: 0,
  exempt: 0,
  reverse_charge: 0,
  none: 0,
}

export const VAT_TREATMENT_LABELS: Record<VatTreatment, string> = {
  standard: 'Standard rate (20%)',
  reduced: 'Reduced rate (5%)',
  zero: 'Zero-rated (0%)',
  exempt: 'Exempt',
  reverse_charge: 'Reverse charge',
  none: 'No VAT',
}

/**
 * Whether the supply counts as taxable turnover on a VAT return.
 *
 * Zero-rated and reverse-charge supplies charge no VAT but are still taxable
 * and belong in the turnover boxes. Exempt supplies are outside the scope and
 * do not. Both charge £0, which is exactly why the distinction has to be
 * carried explicitly rather than inferred from the amount (TAX-4).
 */
export function isTaxableSupply(inv: Invoice): boolean {
  const t = vatTreatmentOf(inv)
  return t !== 'exempt' && t !== 'none'
}

/**
 * The invoice's VAT treatment. Invoices saved before the field existed fall
 * back to the old boolean, so their totals are unchanged.
 */
export function vatTreatmentOf(inv: Invoice): VatTreatment {
  return inv.vatTreatment ?? (inv.vat ? 'standard' : 'none')
}

/** VAT rate for this invoice, as a fraction (0.2 for standard). */
export function vatRate(inv: Invoice): number {
  return VAT_RATES[vatTreatmentOf(inv)]
}

/** The VAT element alone, rounded to whole pence. */
export function vatAmount(inv: Invoice) {
  return Math.round(inv.amount * vatRate(inv) * 100) / 100
}

/**
 * VAT-inclusive total. Rounded to whole pence so downstream sums and fmtDec
 * never surface sub-penny artefacts.
 */
export function vatTotal(inv: Invoice) {
  return Math.round((inv.amount + vatAmount(inv)) * 100) / 100
}

export function isPastDue(inv: Invoice) {
  return (
    (inv.status === 'sent' || inv.status === 'overdue') && new Date(inv.dueDate) < new Date(today())
  )
}

export function daysOverdue(inv: Invoice) {
  return Math.ceil((new Date().getTime() - new Date(inv.dueDate).getTime()) / 86400000)
}

export function daysToDue(inv: Invoice) {
  return Math.ceil((new Date(inv.dueDate).getTime() - new Date().getTime()) / 86400000)
}

export { fmtDec, fmtGBP as fmt } from '@/lib/formatters'
import { fmtDec } from '@/lib/formatters'

export function chaseEmail(inv: Invoice): string {
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

export function makeBlankForm(): InvoiceFormState {
  return {
    client: '',
    number: '',
    description: '',
    date: today(),
    dueDate: in30(),
    amount: '',
    vatTreatment: 'none',
  }
}

export function useInvoices() {
  const {
    items: invoices,
    persist,
    loading,
    isAuthenticated,
  } = useUserData<Invoice>('user_invoices', 'ea_invoices', [])
  const [showForm, setShowForm] = useState(false)
  const [filter, setFilter] = useState<InvoiceStatus | 'all'>('all')
  const [form, setForm] = useState<InvoiceFormState>(makeBlankForm)

  const nextNumber = useMemo(() => {
    const nums = invoices.map((i) => parseInt(i.number.replace(/\D/g, ''), 10)).filter(Boolean)
    return String((nums.length ? Math.max(...nums) : 0) + 1).padStart(4, '0')
  }, [invoices])

  // Auto-flip overdue invoices on every render — no ref, no stale state.
  useEffect(() => {
    if (loading) return
    const needsFlip = invoices.some((i) => i.status === 'sent' && isPastDue(i))
    if (!needsFlip) return
    void persist(
      invoices.map((i) =>
        i.status === 'sent' && isPastDue(i) ? { ...i, status: 'overdue' as InvoiceStatus } : i,
      ),
    )
  }, [loading, invoices, persist])

  const stats = useMemo(() => {
    const sent = invoices.filter((i) => i.status === 'sent')
    const overdue = invoices.filter((i) => i.status === 'overdue')
    const paid = invoices.filter((i) => i.status === 'paid')
    const draft = invoices.filter((i) => i.status === 'draft')
    return {
      outstanding: sent.reduce((s, i) => s + vatTotal(i), 0),
      overdue: overdue.reduce((s, i) => s + vatTotal(i), 0),
      paid: paid.reduce((s, i) => s + vatTotal(i), 0),
      draftCount: draft.length,
      overdueCount: overdue.length,
    }
  }, [invoices])

  const displayed = useMemo(
    () => (filter === 'all' ? invoices : invoices.filter((i) => i.status === filter)),
    [invoices, filter],
  )

  async function add(e: React.FormEvent) {
    e.preventDefault()
    const amount = parseFloat(form.amount)
    if (!amount || !form.client.trim()) return
    const inv: Invoice = {
      id: crypto.randomUUID(),
      status: 'draft',
      client: form.client,
      number: form.number || nextNumber,
      description: form.description,
      date: form.date,
      dueDate: form.dueDate,
      amount,
      vatTreatment: form.vatTreatment,
      // Kept in step so anything still reading the old flag (and the existing
      // Supabase column) stays correct for newly created invoices.
      vat: form.vatTreatment === 'standard',
    }
    await persist([inv, ...invoices])
    setForm(makeBlankForm())
    setShowForm(false)
  }

  async function update(id: string, patch: Partial<Invoice>) {
    await persist(invoices.map((i) => (i.id === id ? { ...i, ...patch } : i)))
  }

  async function remove(id: string) {
    await persist(invoices.filter((i) => i.id !== id))
  }

  return {
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
  }
}
