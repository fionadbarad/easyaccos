// Data boundary types and runtime guards for the two primary entities

export interface Expense {
  id: string
  date: string
  description: string
  category: string
  amount: number
  ocrScanned?: boolean
}

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue'

export interface Invoice {
  id: string
  number: string
  client: string
  description: string
  date: string
  dueDate: string
  amount: number
  vat: boolean
  status: InvoiceStatus
  sentDate?: string
  paidDate?: string
}

export function isValidExpense(e: unknown): e is Expense {
  if (!e || typeof e !== 'object') return false
  const o = e as Record<string, unknown>
  return (
    typeof o.id === 'string' &&
    typeof o.date === 'string' &&
    typeof o.description === 'string' &&
    typeof o.category === 'string' &&
    typeof o.amount === 'number' &&
    (o.amount as number) >= 0
  )
}

export function isValidInvoice(i: unknown): i is Invoice {
  if (!i || typeof i !== 'object') return false
  const o = i as Record<string, unknown>
  return (
    typeof o.id === 'string' &&
    typeof o.number === 'string' &&
    typeof o.client === 'string' &&
    typeof o.date === 'string' &&
    typeof o.dueDate === 'string' &&
    typeof o.amount === 'number' &&
    (o.amount as number) >= 0 &&
    ['draft', 'sent', 'paid', 'overdue'].includes(o.status as string)
  )
}
