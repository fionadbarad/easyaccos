'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { useUserData } from '@/lib/use-user-data'
import type { Invoice, InvoiceStatus } from '@/lib/validators'

export type { Invoice, InvoiceStatus }

export interface InvoiceFormState {
  client: string
  number: string
  description: string
  date: string
  dueDate: string
  amount: string
  vat: boolean
}

function today() { return new Date().toISOString().slice(0, 10) }
function in30()  { const d = new Date(); d.setDate(d.getDate() + 30); return d.toISOString().slice(0, 10) }

export function vatTotal(inv: Invoice)  { return inv.vat ? inv.amount * 1.2 : inv.amount }

export function isPastDue(inv: Invoice) {
  return (inv.status === 'sent' || inv.status === 'overdue')
    && new Date(inv.dueDate) < new Date(today())
}

export function daysOverdue(inv: Invoice) {
  return Math.ceil((new Date().getTime() - new Date(inv.dueDate).getTime()) / 86400000)
}

export function daysToDue(inv: Invoice) {
  return Math.ceil((new Date(inv.dueDate).getTime() - new Date().getTime()) / 86400000)
}

export function fmtDec(n: number) { return '£' + n.toLocaleString('en-GB', { minimumFractionDigits: 2 }) }
export function fmt(n: number)    { return '£' + Math.round(n).toLocaleString('en-GB') }

export function chaseEmail(inv: Invoice): string {
  const days  = daysOverdue(inv)
  const total = fmtDec(vatTotal(inv))
  return `Subject: Payment Reminder — Invoice ${inv.number} (${days} days overdue)

Dear ${inv.client},

I hope this message finds you well.

I'm writing to follow up on Invoice ${inv.number} for ${total}, which was due on ${inv.dueDate} and is now ${days} day${days === 1 ? '' : 's'} overdue.

Could you please let me know when I can expect payment, or if there are any issues with the invoice I can help resolve?

Invoice details:
  Invoice number: ${inv.number}
  Description: ${inv.description}
  Amount due:     ${total}
  Due date:       ${inv.dueDate}

If payment has already been sent, please disregard this message.

Many thanks,
[Your name]`
}

export function makeBlankForm(): InvoiceFormState {
  return { client: '', number: '', description: '', date: today(), dueDate: in30(), amount: '', vat: false }
}

export function useInvoices() {
  const { items: invoices, persist, loading, isAuthenticated } = useUserData<Invoice>(
    'user_invoices', 'ea_invoices', [],
  )
  const [showForm, setShowForm] = useState(false)
  const [filter, setFilter] = useState<InvoiceStatus | 'all'>('all')
  const [form, setForm] = useState<InvoiceFormState>(makeBlankForm)

  const nextNumber = useMemo(() => {
    const nums = invoices.map(i => parseInt(i.number.replace(/\D/g, ''), 10)).filter(Boolean)
    return String((nums.length ? Math.max(...nums) : 0) + 1).padStart(4, '0')
  }, [invoices])

  const sweptRef = useRef(false)
  useEffect(() => {
    if (loading || sweptRef.current) return
    const needsFlip = invoices.some(i => i.status === 'sent' && isPastDue(i))
    if (!needsFlip) { sweptRef.current = true; return }
    sweptRef.current = true
    void persist(invoices.map(i =>
      i.status === 'sent' && isPastDue(i) ? { ...i, status: 'overdue' as InvoiceStatus } : i,
    ))
  }, [loading, invoices, persist])

  const stats = useMemo(() => {
    const sent    = invoices.filter(i => i.status === 'sent')
    const overdue = invoices.filter(i => i.status === 'overdue')
    const paid    = invoices.filter(i => i.status === 'paid')
    const draft   = invoices.filter(i => i.status === 'draft')
    return {
      outstanding: sent.reduce((s, i) => s + vatTotal(i), 0),
      overdue: overdue.reduce((s, i) => s + vatTotal(i), 0),
      paid: paid.reduce((s, i) => s + vatTotal(i), 0),
      draftCount: draft.length,
      overdueCount: overdue.length,
    }
  }, [invoices])

  const displayed = useMemo(() =>
    filter === 'all' ? invoices : invoices.filter(i => i.status === filter),
  [invoices, filter])

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
    setForm(makeBlankForm())
    setShowForm(false)
  }

  async function update(id: string, patch: Partial<Invoice>) {
    await persist(invoices.map(i => i.id === id ? { ...i, ...patch } : i))
  }

  async function remove(id: string) {
    await persist(invoices.filter(i => i.id !== id))
  }

  return {
    invoices, displayed, loading, isAuthenticated,
    showForm, setShowForm,
    filter, setFilter,
    form, setForm,
    nextNumber, stats,
    add, update, remove,
  }
}
