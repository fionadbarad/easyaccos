/**
 * The data boundary, and the partition that makes it load-bearing.
 *
 * isValidExpense/isValidInvoice existed and were correct, but had no
 * production caller — every import was `import type`, so rows reached the
 * Supabase upsert and the on-screen totals unchecked. useExpenses and
 * useInvoices now filter through partitionValid on the way out of storage.
 *
 * The first describe below is the one that keeps that safe: it asserts the
 * shapes the app itself creates all pass. If a future change to a form makes
 * the app produce a row its own validator rejects, that shows up here as a
 * failed test rather than as rows silently vanishing from a user's dashboard.
 */

import { describe, it, expect } from 'vitest'
import { isValidExpense, isValidInvoice, partitionValid, type Expense } from '../validators'
import { INVOICE_STATUSES } from '../invoices/status-machine'

// Mirrors useExpenses.addExpense: { id, ...form, amount } where form carries
// date/description/category as strings and amount is the parsed number.
const appExpense = {
  id: 'exp-1',
  date: '2026-08-14',
  description: 'Printer paper',
  category: 'Office & Equipment',
  amount: 12.99,
}

// Mirrors useExpenses.confirmScan, which adds the OCR flag.
const appScannedExpense = { ...appExpense, id: 'exp-2', ocrScanned: true }

// Mirrors useInvoices.add.
const appInvoice = {
  id: 'inv-1',
  status: 'draft',
  client: 'Acme Ltd',
  number: '0001',
  description: 'Consulting',
  date: '2026-08-14',
  dueDate: '2026-09-13',
  amount: 1200,
  vatTreatment: 'standard',
  vat: true,
}

describe('the app does not produce rows its own validators reject', () => {
  it('accepts an expense from the add form', () => {
    expect(isValidExpense(appExpense)).toBe(true)
  })

  it('accepts an expense from a confirmed receipt scan', () => {
    expect(isValidExpense(appScannedExpense)).toBe(true)
  })

  it('accepts an invoice from the add form', () => {
    expect(isValidInvoice(appInvoice)).toBe(true)
  })

  it('accepts an invoice in every status the machine can reach', () => {
    for (const status of INVOICE_STATUSES) {
      expect(isValidInvoice({ ...appInvoice, status }), status).toBe(true)
    }
  })

  it('accepts a legacy invoice saved before vatTreatment existed', () => {
    const { vatTreatment: _omitted, ...legacy } = appInvoice
    expect(isValidInvoice(legacy)).toBe(true)
  })

  it('accepts a zero-amount expense and invoice', () => {
    // £0 is unusual but legitimate — a fully discounted line, a corrected row.
    expect(isValidExpense({ ...appExpense, amount: 0 })).toBe(true)
    expect(isValidInvoice({ ...appInvoice, amount: 0 })).toBe(true)
  })
})

describe('partitionValid', () => {
  it('keeps good rows and drops bad ones', () => {
    const rows = [appExpense, { ...appExpense, id: 'exp-3', amount: null }, appScannedExpense]
    const { valid, invalid } = partitionValid(rows, isValidExpense)

    expect(valid.map((e) => e.id)).toEqual(['exp-1', 'exp-2'])
    expect(invalid).toHaveLength(1)
    expect((invalid[0] as Expense).id).toBe('exp-3')
  })

  it('returns the original array when every row is valid', () => {
    // Identity is the point: callers memoize on it, so a clean load must not
    // allocate a new array on every render.
    const rows = [appExpense, appScannedExpense]
    const { valid, invalid } = partitionValid(rows, isValidExpense)

    expect(valid).toBe(rows)
    expect(invalid).toHaveLength(0)
  })

  it('drops rows that are not objects at all', () => {
    const { valid, invalid } = partitionValid(
      [appExpense, null, undefined, 'nope', 42],
      isValidExpense,
    )

    expect(valid).toHaveLength(1)
    expect(invalid).toHaveLength(4)
  })

  it('drops an invoice whose status the machine does not recognise', () => {
    // The case that reaches furthest: the auto-overdue effect feeds status
    // straight into the state machine.
    const rows = [appInvoice, { ...appInvoice, id: 'inv-2', status: 'void' }]
    const { valid, invalid } = partitionValid(rows, isValidInvoice)

    expect(valid.map((i) => i.id)).toEqual(['inv-1'])
    expect(invalid).toHaveLength(1)
  })

  it('drops a row whose amount would poison a total', () => {
    // A null amount makes `reduce((s, e) => s + e.amount, 0)` return NaN, which
    // renders as "£NaN" across every figure on the page.
    const rows = [appExpense, { ...appExpense, id: 'exp-4', amount: undefined }]
    const { valid } = partitionValid(rows, isValidExpense)

    expect(valid.reduce((s, e) => s + e.amount, 0)).toBe(12.99)
  })

  it('drops a negative amount', () => {
    expect(partitionValid([{ ...appExpense, amount: -5 }], isValidExpense).invalid).toHaveLength(1)
  })

  it('handles an empty list', () => {
    const { valid, invalid } = partitionValid([], isValidExpense)
    expect(valid).toHaveLength(0)
    expect(invalid).toHaveLength(0)
  })
})
