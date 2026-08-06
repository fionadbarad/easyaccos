/**
 * The invoice lifecycle, as one table.
 *
 * Draft → Sent → Paid, with Overdue hanging off Sent, used to be a state
 * machine drawn entirely in JSX. `InvoiceRow` carried four independent
 * `inv.status === …` guards, `useInvoices` carried a fifth (the auto-flip to
 * overdue), and the page carried a sixth (the filter list). Nothing checked
 * that the six agreed. "Mark as Paid" appearing on a draft, or the chase-email
 * button surviving after payment, were each one careless edit away and neither
 * would have failed a build.
 *
 * Everything here is pure. It takes a status and returns what may be done to
 * it. The React binding is `useInvoiceTransitions` in lib/hooks; the runtime
 * boundary check is `invoiceStatusSchema`.
 *
 * TWO THINGS TO KNOW BEFORE EDITING
 *
 * 1. `sent` is reachable two ways and they are NOT the same move. Sending a
 *    draft stamps `sentDate`; reverting a mis-flagged overdue invoice must not,
 *    because the invoice was already sent and overwriting the original send
 *    date would rewrite history — and the send date is what the due date and
 *    every overdue calculation hang off. That is why actions, not target
 *    states, own the patch.
 *
 * 2. `overdue` is written by a human AND by the clock. `useInvoices` flips
 *    `sent → overdue` on its own once the due date passes. Both routes go
 *    through this table, so there is one definition of when that is legal.
 */

import { z } from 'zod'
import type { Invoice } from '@/lib/validators'

/**
 * Every status an invoice may hold. The single source of the values — the type
 * in `validators.ts` is derived from this array, and `isValidInvoice` checks
 * against it, so a new status cannot be added in one place and forgotten in
 * the other.
 *
 * There is deliberately no `void` here. See docs/AUDIT.md: voiding is a
 * persistence change (a new Supabase column value plus a migration for rows
 * already written), not a UI state, and inventing it here would let the app
 * write a status the database and `isValidInvoice` would both reject.
 */
export const INVOICE_STATUSES = ['draft', 'sent', 'paid', 'overdue'] as const

export type InvoiceStatus = (typeof INVOICE_STATUSES)[number]

/**
 * Runtime guard for anything crossing a boundary — a Supabase row, a decrypted
 * IndexedDB snapshot, a hand-edited localStorage blob. Parsing rather than
 * casting is the point: an unknown status must fail loudly at the edge instead
 * of reaching `STATUS_CLASSES[status]` and rendering `undefined`.
 */
export const invoiceStatusSchema = z.enum(INVOICE_STATUSES)

/**
 * Which statuses each status may move to. Read as "from → allowed to".
 *
 * `paid` is terminal. Reopening a paid invoice is not a state change a user
 * should make by accident, and the only correct undo — a credit note — is a
 * new document, not a rewind of this one.
 */
export const INVOICE_TRANSITIONS = {
  draft: ['sent'],
  sent: ['paid', 'overdue'],
  overdue: ['paid', 'sent'],
  paid: [],
} as const satisfies Record<InvoiceStatus, readonly InvoiceStatus[]>

/** True when `to` is a legal next status for `from`. Self-transitions are not. */
export function canTransition(from: InvoiceStatus, to: InvoiceStatus): boolean {
  return (INVOICE_TRANSITIONS[from] as readonly InvoiceStatus[]).includes(to)
}

/** True when nothing further can be done to the invoice's status. */
export function isTerminal(status: InvoiceStatus): boolean {
  return INVOICE_TRANSITIONS[status].length === 0
}

// ── Actions ───────────────────────────────────────────────────────────────

/**
 * The moves a user can make, named after the intent rather than the target
 * status — because `send` and `revertToSent` share a target and differ in what
 * they record.
 */
export const INVOICE_ACTIONS = ['send', 'markPaid', 'markOverdue', 'revertToSent'] as const

export type InvoiceAction = (typeof INVOICE_ACTIONS)[number]

export interface InvoiceActionSpec {
  /** Statuses that offer this action. */
  readonly from: readonly InvoiceStatus[]
  /** Status the invoice lands in. */
  readonly to: InvoiceStatus
  /** Button copy. Lives here so the label and the guard cannot drift apart. */
  readonly label: string
  /**
   * Date field this action stamps with today, if any. Absent means the action
   * records only the status — see note 1 in the file header.
   */
  readonly stamp?: 'sentDate' | 'paidDate'
}

export const INVOICE_ACTION_SPECS = {
  send: { from: ['draft'], to: 'sent', label: 'Mark as Sent', stamp: 'sentDate' },
  markPaid: { from: ['sent', 'overdue'], to: 'paid', label: 'Mark as Paid', stamp: 'paidDate' },
  markOverdue: { from: ['sent'], to: 'overdue', label: 'Mark Overdue' },
  revertToSent: { from: ['overdue'], to: 'sent', label: 'Revert to Sent' },
} as const satisfies Record<InvoiceAction, InvoiceActionSpec>

/** True when `status` offers `action`. */
export function isActionAvailable(status: InvoiceStatus, action: InvoiceAction): boolean {
  return (INVOICE_ACTION_SPECS[action].from as readonly InvoiceStatus[]).includes(status)
}

/** Every action `status` offers, in the order they should be shown. */
export function availableActions(status: InvoiceStatus): InvoiceAction[] {
  return INVOICE_ACTIONS.filter((action) => isActionAvailable(status, action))
}

/**
 * The patch an action writes, given today's local calendar date.
 *
 * `today` is passed in rather than read here so the caller owns the clock —
 * `todayISO()` reads the LOCAL date, and a UTC-derived one would file a
 * journey or a payment on the wrong side of midnight during BST (see
 * lib/dates.ts).
 */
export function transitionPatch(action: InvoiceAction, today: string): Partial<Invoice> {
  // Widened to the interface on purpose: `satisfies` keeps the literal type of
  // each entry, so the actions that record no date have no `stamp` property to
  // read at all.
  const spec: InvoiceActionSpec = INVOICE_ACTION_SPECS[action]
  return spec.stamp ? { status: spec.to, [spec.stamp]: today } : { status: spec.to }
}

/**
 * The patch for an action, or `null` if the invoice's current status does not
 * offer it.
 *
 * This is the cross-check the scattered JSX guards never had: a caller cannot
 * apply `markPaid` to a draft even if a stale render hands it the button.
 */
export function applyAction(
  status: InvoiceStatus,
  action: InvoiceAction,
  today: string,
): Partial<Invoice> | null {
  return isActionAvailable(status, action) ? transitionPatch(action, today) : null
}

// ── Non-transition capabilities ───────────────────────────────────────────

/**
 * Whether a chase email may be offered. Not a transition — it changes nothing —
 * but it is status-gated, and gating it separately is how "chase the client who
 * already paid" becomes possible. Kept in the machine so it is covered by the
 * same tests.
 */
export function canChase(status: InvoiceStatus): boolean {
  return status === 'overdue'
}

/** Whether the row should show the settled "✓ Paid …" confirmation. */
export function isSettled(status: InvoiceStatus): boolean {
  return status === 'paid'
}

/**
 * Whether the clock is allowed to move this invoice to overdue on its own.
 * `useInvoices` asks this before its auto-flip so the automatic route obeys the
 * same table as the button.
 */
export function canAutoFlipToOverdue(status: InvoiceStatus): boolean {
  return canTransition(status, 'overdue')
}
