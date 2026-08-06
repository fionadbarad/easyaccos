'use client'

/**
 * React binding for the invoice state machine.
 *
 * The hook holds no state and makes no decisions — every answer comes from
 * `lib/invoices/status-machine`, which is testable without a renderer. This
 * exists so a component asks "may I?" once, in one shape, instead of writing
 * its own `inv.status === …` comparison each time it needs a button.
 */

import { useMemo } from 'react'
import type { Invoice } from '@/lib/validators'
import {
  type InvoiceAction,
  type InvoiceStatus,
  INVOICE_ACTION_SPECS,
  availableActions,
  canChase,
  isSettled,
  isTerminal,
  transitionPatch,
} from '@/lib/invoices/status-machine'

export interface InvoiceActionDescriptor {
  readonly action: InvoiceAction
  readonly label: string
  /** The patch to hand to `onUpdate`, already stamped with today's date. */
  readonly patch: Partial<Invoice>
}

export interface InvoiceTransitions {
  canSend: boolean
  canMarkPaid: boolean
  canMarkOverdue: boolean
  canRevertToSent: boolean
  /** Offer the chase email. Not a transition — see the machine. */
  canChase: boolean
  /** Paid: show the settled confirmation instead of actions. */
  isSettled: boolean
  /** No status change is possible from here. */
  isTerminal: boolean
  /**
   * Every action this status offers, with its label and its patch. Render this
   * rather than four conditionals and the set can never disagree with the
   * flags above — both come from the same table.
   */
  actions: readonly InvoiceActionDescriptor[]
}

/**
 * @param status the invoice's current status
 * @param today  today as 'YYYY-MM-DD' on the LOCAL calendar, from `todayISO()`.
 *               Injected rather than read here so a test can pin the clock and
 *               so the stamp matches the date the user would write down.
 */
export function useInvoiceTransitions(status: InvoiceStatus, today: string): InvoiceTransitions {
  return useMemo(() => {
    const actions = availableActions(status).map((action) => ({
      action,
      label: INVOICE_ACTION_SPECS[action].label,
      patch: transitionPatch(action, today),
    }))
    const offers = (a: InvoiceAction) => actions.some((d) => d.action === a)

    return {
      canSend: offers('send'),
      canMarkPaid: offers('markPaid'),
      canMarkOverdue: offers('markOverdue'),
      canRevertToSent: offers('revertToSent'),
      canChase: canChase(status),
      isSettled: isSettled(status),
      isTerminal: isTerminal(status),
      actions,
    }
  }, [status, today])
}
