// Data boundary types and runtime guards for the two primary entities

// The status values live with the state machine that governs them, so the
// lifecycle table and this boundary check can never disagree about which
// statuses exist. Type-only in the other direction, so there is no runtime
// import cycle.
import { INVOICE_STATUSES } from '@/lib/invoices/status-machine'

export interface Expense {
  id: string
  date: string
  description: string
  category: string
  amount: number
  ocrScanned?: boolean
}

export type InvoiceStatus = (typeof INVOICE_STATUSES)[number]

/**
 * How VAT is treated on the supply this invoice covers (TAX-4).
 *
 * Zero-rated, exempt and reverse-charge all add £0 of VAT, but they are not
 * the same thing and must not be collapsed into one flag: zero-rated and
 * reverse-charge supplies are taxable and belong in the VAT return's turnover
 * boxes, whereas exempt supplies are outside the VAT system entirely. Getting
 * this wrong misstates a VAT return even though the invoice total is identical.
 */
export type VatTreatment =
  | 'standard' // 20%
  | 'reduced' // 5%
  | 'zero' // 0%, taxable supply
  | 'exempt' // outside the scope of VAT
  | 'reverse_charge' // customer accounts for the VAT
  | 'none' // supplier not VAT registered

export interface Invoice {
  id: string
  number: string
  client: string
  description: string
  date: string
  dueDate: string
  amount: number
  /**
   * Legacy standard-rated flag. Retained so invoices saved before
   * vatTreatment existed keep their totals; vatTreatment takes precedence.
   */
  vat: boolean
  vatTreatment?: VatTreatment
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
    (INVOICE_STATUSES as readonly string[]).includes(o.status as string) &&
    (o.vatTreatment === undefined ||
      ['standard', 'reduced', 'zero', 'exempt', 'reverse_charge', 'none'].includes(
        o.vatTreatment as string,
      ))
  )
}
