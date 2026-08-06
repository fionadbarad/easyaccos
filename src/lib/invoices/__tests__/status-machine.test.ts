/**
 * The invoice lifecycle, checked as a machine rather than as four buttons.
 *
 * The point of extracting this was that nothing cross-checked the JSX guards
 * against each other. So the tests that matter most here are not "draft offers
 * send" — they are the INVARIANTS: that every action lands somewhere the
 * transition table already permits, that the table covers every status, and
 * that the enum, the type and the boundary validator all name the same four
 * values. Those are the assertions a careless edit trips over.
 */

import { describe, it, expect } from 'vitest'
import {
  INVOICE_STATUSES,
  INVOICE_ACTIONS,
  INVOICE_ACTION_SPECS,
  INVOICE_TRANSITIONS,
  invoiceStatusSchema,
  applyAction,
  availableActions,
  canAutoFlipToOverdue,
  canChase,
  canTransition,
  isActionAvailable,
  isSettled,
  isTerminal,
  transitionPatch,
  type InvoiceStatus,
} from '../status-machine'
import { isValidInvoice } from '@/lib/validators'

const TODAY = '2026-04-20'

describe('the transition table', () => {
  it('permits the lifecycle a user actually drives', () => {
    expect(canTransition('draft', 'sent')).toBe(true)
    expect(canTransition('sent', 'paid')).toBe(true)
    expect(canTransition('sent', 'overdue')).toBe(true)
    expect(canTransition('overdue', 'paid')).toBe(true)
    expect(canTransition('overdue', 'sent')).toBe(true)
  })

  it('refuses to let a draft skip straight to paid', () => {
    // Money marked received on a document never sent to the client.
    expect(canTransition('draft', 'paid')).toBe(false)
    expect(canTransition('draft', 'overdue')).toBe(false)
  })

  it('treats paid as terminal', () => {
    expect(isTerminal('paid')).toBe(true)
    for (const to of INVOICE_STATUSES) {
      expect(canTransition('paid', to), `paid → ${to}`).toBe(false)
    }
  })

  it('never allows a status to transition to itself', () => {
    for (const status of INVOICE_STATUSES) {
      expect(canTransition(status, status), status).toBe(false)
    }
  })

  it('covers every status, so an unhandled one cannot read as undefined', () => {
    for (const status of INVOICE_STATUSES) {
      expect(Array.isArray(INVOICE_TRANSITIONS[status]), status).toBe(true)
    }
    expect(Object.keys(INVOICE_TRANSITIONS).sort()).toEqual([...INVOICE_STATUSES].sort())
  })
})

describe('actions agree with the transition table', () => {
  // The invariant the scattered JSX guards could not hold: a button may only
  // exist where the machine already says the move is legal.
  it.each(INVOICE_ACTIONS)('%s only lands somewhere its origin permits', (action) => {
    const spec = INVOICE_ACTION_SPECS[action]
    expect(spec.from.length).toBeGreaterThan(0)
    for (const from of spec.from) {
      expect(canTransition(from, spec.to), `${action}: ${from} → ${spec.to}`).toBe(true)
    }
  })

  it('offers no action at all from a terminal status', () => {
    expect(availableActions('paid')).toEqual([])
  })

  it('exposes every legal move as some action', () => {
    // The mirror of the check above: a transition the table permits but no
    // action reaches is a dead edge the UI can never travel.
    for (const from of INVOICE_STATUSES) {
      for (const to of INVOICE_TRANSITIONS[from]) {
        const reached = INVOICE_ACTIONS.some(
          (a) => INVOICE_ACTION_SPECS[a].to === to && isActionAvailable(from, a),
        )
        expect(reached, `${from} → ${to} is unreachable`).toBe(true)
      }
    }
  })
})

describe('what each status offers', () => {
  const expected: Record<InvoiceStatus, string[]> = {
    draft: ['send'],
    sent: ['markPaid', 'markOverdue'],
    overdue: ['markPaid', 'revertToSent'],
    paid: [],
  }

  it.each(INVOICE_STATUSES)('%s', (status) => {
    expect(availableActions(status)).toEqual(expected[status])
  })
})

describe('what a transition records', () => {
  it('stamps the send date when a draft goes out', () => {
    expect(transitionPatch('send', TODAY)).toEqual({ status: 'sent', sentDate: TODAY })
  })

  it('stamps the paid date on payment', () => {
    expect(transitionPatch('markPaid', TODAY)).toEqual({ status: 'paid', paidDate: TODAY })
  })

  it('records only the status when the clock or a correction moves it', () => {
    expect(transitionPatch('markOverdue', TODAY)).toEqual({ status: 'overdue' })
  })

  it('does NOT restamp sentDate when an overdue invoice is reverted', () => {
    // The invoice was already sent. Overwriting the original send date would
    // rewrite the history the due date and every overdue count hang off — and
    // it is the one place two actions share a target status.
    const patch = transitionPatch('revertToSent', TODAY)
    expect(patch).toEqual({ status: 'sent' })
    expect(patch).not.toHaveProperty('sentDate')
  })
})

describe('applyAction refuses illegal moves', () => {
  it('returns a patch for a move the status permits', () => {
    expect(applyAction('sent', 'markPaid', TODAY)).toEqual({ status: 'paid', paidDate: TODAY })
  })

  it('returns null rather than a patch when the status does not offer it', () => {
    // A stale render handing a draft the "Mark as Paid" button gets nothing.
    expect(applyAction('draft', 'markPaid', TODAY)).toBeNull()
    expect(applyAction('paid', 'markOverdue', TODAY)).toBeNull()
    expect(applyAction('draft', 'revertToSent', TODAY)).toBeNull()
  })

  it('never lets a paid invoice be moved by any action', () => {
    for (const action of INVOICE_ACTIONS) {
      expect(applyAction('paid', action, TODAY), action).toBeNull()
    }
  })
})

describe('capabilities that are not transitions', () => {
  it('offers the chase email only while overdue', () => {
    expect(canChase('overdue')).toBe(true)
    // Chasing a client who has already paid is the embarrassing one.
    for (const status of ['draft', 'sent', 'paid'] as InvoiceStatus[]) {
      expect(canChase(status), status).toBe(false)
    }
  })

  it('shows the settled confirmation only when paid', () => {
    expect(isSettled('paid')).toBe(true)
    expect(INVOICE_STATUSES.filter(isSettled)).toEqual(['paid'])
  })

  it('lets the clock flip only a sent invoice', () => {
    // useInvoices auto-flips on the due date. A paid invoice whose due date has
    // passed must not be dragged backwards.
    expect(canAutoFlipToOverdue('sent')).toBe(true)
    for (const status of ['draft', 'paid', 'overdue'] as InvoiceStatus[]) {
      expect(canAutoFlipToOverdue(status), status).toBe(false)
    }
  })
})

describe('the boundary guard', () => {
  it('parses the four real statuses', () => {
    for (const status of INVOICE_STATUSES) {
      expect(invoiceStatusSchema.parse(status)).toBe(status)
    }
  })

  it('rejects anything else, including near misses', () => {
    // Uppercase and 'void' are the two most likely to arrive from a hand-edited
    // snapshot or a half-finished migration.
    for (const bad of ['DRAFT', 'void', 'Sent', '', null, undefined, 0]) {
      expect(invoiceStatusSchema.safeParse(bad).success, String(bad)).toBe(false)
    }
  })

  it('keeps isValidInvoice in step with the enum', () => {
    const base = {
      id: 'i1',
      number: '0001',
      client: 'Acme Ltd',
      description: 'Work',
      date: '2026-04-10',
      dueDate: '2026-05-10',
      amount: 1000,
      vat: false,
    }
    for (const status of INVOICE_STATUSES) {
      expect(isValidInvoice({ ...base, status }), status).toBe(true)
    }
    expect(isValidInvoice({ ...base, status: 'void' })).toBe(false)
  })
})
