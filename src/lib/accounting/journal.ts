/**
 * Journal write path — only active when FLAG_GAAP is on.
 *
 * postEntry() appends a JournalEntry to the IDB-backed `user_journal` store
 * via the secure-store facade. The caller is responsible for building
 * balanced lines (debits === credits). An imbalanced entry is logged and
 * dropped to avoid corrupting future reports.
 */

import { isFlagEnabled, FLAG_GAAP } from '@/lib/feature-flags'
import { secureRead, secureWrite } from '@/lib/storage/secure-store'
import type { JournalEntry, JournalLine } from './types'
import { expenseAccountCode } from './chart'

const JOURNAL_KEY   = 'user_journal:guest'
const JOURNAL_SEED: JournalEntry[] = []

export async function postEntry(entry: JournalEntry): Promise<void> {
  if (!isFlagEnabled(FLAG_GAAP)) return

  const debitSum  = entry.lines.reduce((s, l) => s + l.debit,  0)
  const creditSum = entry.lines.reduce((s, l) => s + l.credit, 0)
  if (Math.abs(debitSum - creditSum) > 0.005) {
    console.warn('[GAAP] Dropped imbalanced journal entry', entry)
    return
  }

  const existing = await secureRead<JournalEntry[]>(JOURNAL_KEY, null, JOURNAL_SEED)
  await secureWrite(JOURNAL_KEY, [entry, ...existing])
}

export async function readJournal(): Promise<JournalEntry[]> {
  if (!isFlagEnabled(FLAG_GAAP)) return []
  return secureRead<JournalEntry[]>(JOURNAL_KEY, null, JOURNAL_SEED)
}

// ── Builders ──────────────────────────────────────────────────────────────────

export function buildExpenseEntry(expense: {
  id: string; date: string; description: string; category: string; amount: number
}): JournalEntry {
  const expCode = expenseAccountCode(expense.category)
  const lines: JournalLine[] = [
    { accountCode: expCode, debit: expense.amount, credit: 0,              description: expense.description },
    { accountCode: '1000',  debit: 0,              credit: expense.amount, description: 'Cash payment' },
  ]
  return {
    id: crypto.randomUUID(),
    date: expense.date,
    ref: expense.id,
    entity: 'expense',
    memo: expense.description,
    lines,
    createdAt: new Date().toISOString(),
  }
}

export function buildInvoiceEntry(invoice: {
  id: string; date: string; description: string; amount: number; vat: boolean; status: string
}): JournalEntry | null {
  if (invoice.status === 'draft') return null
  const net = invoice.amount
  const vat = invoice.vat ? net * 0.2 : 0
  const gross = net + vat
  const lines: JournalLine[] = [
    { accountCode: '1010', debit: gross, credit: 0,   description: invoice.description },
    { accountCode: '4000', debit: 0,     credit: net, description: 'Revenue' },
  ]
  if (vat > 0) lines.push({ accountCode: '2010', debit: 0, credit: vat, description: 'VAT' })
  return {
    id: crypto.randomUUID(),
    date: invoice.date,
    ref: invoice.id,
    entity: 'invoice',
    memo: invoice.description,
    lines,
    createdAt: new Date().toISOString(),
  }
}

export function buildMileageEntry(mileage: {
  id: string; date: string; description: string; amount: number
}): JournalEntry {
  const lines: JournalLine[] = [
    { accountCode: '5080', debit: mileage.amount, credit: 0,               description: mileage.description },
    { accountCode: '1000', debit: 0,              credit: mileage.amount,  description: 'Cash payment' },
  ]
  return {
    id: crypto.randomUUID(),
    date: mileage.date,
    ref: mileage.id,
    entity: 'mileage',
    memo: mileage.description,
    lines,
    createdAt: new Date().toISOString(),
  }
}
