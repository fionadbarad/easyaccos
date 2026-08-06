// @vitest-environment happy-dom

/**
 * The invoice lifecycle, as a user actually drives it.
 *
 * Draft → Sent → Paid, with Overdue hanging off Sent, is a state machine drawn
 * entirely in JSX: each action button sits behind its own `inv.status === …`
 * guard. Nothing checked that the guards agree with each other, so "Mark as
 * Paid" appearing on a draft, or the chase-email button surviving after
 * payment, were each one careless edit away and neither would fail a build.
 *
 * The money assertions matter for a different reason. The row is where a user
 * reads what they are owed, and VAT treatment decides whether that figure
 * includes VAT at 20%, at 5%, or not at all — including the zero-rated/exempt
 * distinction that TAX-4 exists to carry, where both charge £0 but only one is
 * taxable turnover.
 *
 * fireEvent rather than user-event: the interactions here are plain clicks, and
 * @testing-library/user-event is not a dependency of this project. Adding one
 * for syntax would sit badly next to #78, which removed thirty packages nothing
 * imported.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react'
import { InvoiceRow } from '@/features/invoices/InvoiceRow'
import type { Invoice, InvoiceStatus, VatTreatment } from '@/lib/validators'

function makeInvoice(over: Partial<Invoice> = {}): Invoice {
  return {
    id: 'inv-1',
    status: 'draft',
    client: 'Acme Ltd',
    number: '0001',
    description: 'Web development',
    date: '2026-04-10',
    dueDate: '2026-05-10',
    amount: 1000,
    vatTreatment: 'none',
    vat: false,
    ...over,
  } as Invoice
}

function renderRow(over: Partial<Invoice> = {}) {
  const onUpdate = vi.fn()
  const onDelete = vi.fn()
  const inv = makeInvoice(over)
  render(<InvoiceRow inv={inv} onUpdate={onUpdate} onDelete={onDelete} />)
  return { inv, onUpdate, onDelete }
}

/** The row keeps its actions collapsed; everything below is behind the header. */
function expand() {
  fireEvent.click(screen.getByText('Acme Ltd'))
}

function button(name: RegExp) {
  return screen.queryByRole('button', { name })
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
  vi.setSystemTime(new Date(2026, 3, 20, 12)) // 20 April 2026, local clock
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('which actions a status offers', () => {
  it('offers a draft only "Mark as Sent"', () => {
    renderRow({ status: 'draft' })
    expand()

    expect(button(/mark as sent/i)).toBeTruthy()
    expect(button(/mark as paid/i)).toBeNull()
    expect(button(/mark overdue/i)).toBeNull()
    expect(button(/revert to sent/i)).toBeNull()
  })

  it('offers a sent invoice payment or overdue, but not sending again', () => {
    renderRow({ status: 'sent' })
    expand()

    expect(button(/mark as paid/i)).toBeTruthy()
    expect(button(/mark overdue/i)).toBeTruthy()
    expect(button(/mark as sent/i)).toBeNull()
  })

  it('offers an overdue invoice payment, a way back, and the chase email', () => {
    renderRow({ status: 'overdue' })
    expand()

    expect(button(/mark as paid/i)).toBeTruthy()
    expect(button(/revert to sent/i)).toBeTruthy()
    expect(button(/copy email/i)).toBeTruthy()
  })

  it('offers a paid invoice no state changes, and no chase email', () => {
    renderRow({ status: 'paid', paidDate: '2026-04-18' })
    expand()

    for (const label of [/mark as sent/i, /mark as paid/i, /mark overdue/i, /revert to sent/i]) {
      expect(button(label), String(label)).toBeNull()
    }
    // Chasing a client who has already paid is the embarrassing one.
    expect(button(/copy email/i)).toBeNull()
    expect(screen.getByText(/Paid 2026-04-18/)).toBeTruthy()
  })

  it('offers delete in every state', () => {
    for (const status of ['draft', 'sent', 'overdue', 'paid'] as InvoiceStatus[]) {
      const { onDelete } = renderRow({ status, id: `inv-${status}` })
      expand()
      fireEvent.click(screen.getByRole('button', { name: /delete/i }))
      expect(onDelete, status).toHaveBeenCalledWith(`inv-${status}`)
      cleanup()
    }
  })
})

describe('what a transition records', () => {
  it('stamps the send date from the local calendar, not UTC', () => {
    const { onUpdate } = renderRow({ status: 'draft' })
    expand()
    fireEvent.click(screen.getByRole('button', { name: /mark as sent/i }))

    expect(onUpdate).toHaveBeenCalledWith('inv-1', { status: 'sent', sentDate: '2026-04-20' })
  })

  it('stamps the paid date the same way', () => {
    const { onUpdate } = renderRow({ status: 'sent' })
    expand()
    fireEvent.click(screen.getByRole('button', { name: /mark as paid/i }))

    expect(onUpdate).toHaveBeenCalledWith('inv-1', { status: 'paid', paidDate: '2026-04-20' })
  })

  it('reverting an overdue invoice changes only the status', () => {
    const { onUpdate } = renderRow({ status: 'overdue' })
    expand()
    fireEvent.click(screen.getByRole('button', { name: /revert to sent/i }))

    expect(onUpdate).toHaveBeenCalledWith('inv-1', { status: 'sent' })
  })
})

describe('what the row says you are owed', () => {
  const cases: Array<{ treatment: VatTreatment; total: RegExp; vat: RegExp | null }> = [
    { treatment: 'standard', total: /1,200\.00/, vat: /200\.00/ },
    { treatment: 'reduced', total: /1,050\.00/, vat: /50\.00/ },
    { treatment: 'zero', total: /1,000\.00/, vat: /0\.00/ },
    { treatment: 'exempt', total: /1,000\.00/, vat: /0\.00/ },
    { treatment: 'none', total: /1,000\.00/, vat: null },
  ]

  for (const { treatment, total, vat } of cases) {
    it(`totals £1,000 net treated as ${treatment}`, () => {
      renderRow({ amount: 1000, vatTreatment: treatment })
      expect(screen.getAllByText(total).length).toBeGreaterThan(0)

      expand()
      if (vat === null) {
        expect(screen.queryByText(/^VAT \(/)).toBeNull()
      } else {
        const netCell = screen.getByText('Net').parentElement!.parentElement!
        expect(within(netCell).getAllByText(vat).length).toBeGreaterThan(0)
      }
    })
  }

  it('does not claim VAT is included on a zero-rated invoice', () => {
    renderRow({ amount: 1000, vatTreatment: 'zero' })
    // £0 is charged, so "inc. VAT" would be a lie — but the treatment still has
    // to be visible, because zero-rated supplies count towards taxable turnover.
    expect(screen.queryByText(/inc\. VAT/)).toBeNull()
    expect(screen.getAllByText(/Zero-rated/).length).toBeGreaterThan(0)
  })

  it('falls back to the legacy boolean for invoices saved before vatTreatment existed', () => {
    // Older rows carry `vat: true` and no treatment. Their totals must not move.
    renderRow({ amount: 1000, vatTreatment: undefined, vat: true })
    expect(screen.getAllByText(/1,200\.00/).length).toBeGreaterThan(0)
  })
})

describe('the row stays collapsed until asked', () => {
  it('hides the actions until the header is clicked', () => {
    renderRow({ status: 'draft' })
    expect(button(/mark as sent/i)).toBeNull()

    expand()
    expect(button(/mark as sent/i)).toBeTruthy()
  })
})
