/**
 * UK GAAP / FRS 105 scaffolding.
 *
 * These types expand the data model beyond the Income Statement so that a
 * Balance Sheet and Cash Flow Statement can be generated in a later phase.
 * No UI reads these yet — the types exist to lock the shape of journal
 * entries and ledger postings up front.
 *
 * Double-entry contract: for every JournalEntry, the sum of `lines[].debit`
 * must equal the sum of `lines[].credit`. This is enforced by
 * `validateJournalEntry()` below.
 */

export type AccountType =
  | 'asset'
  | 'liability'
  | 'equity'
  | 'income'
  | 'expense'

export type AccountCode = string // e.g. "1100" (trade debtors), "4000" (sales)

export interface Account {
  id:        string
  code:      AccountCode
  name:      string
  type:      AccountType
  /** Optional parent for grouped reporting (e.g. "current assets"). */
  parentId?: string
  /** Whether this account is active; inactive accounts are hidden from pickers. */
  active:    boolean
  createdAt: string // ISO timestamp
}

export type JournalSource =
  | 'invoice'      // created from an invoice
  | 'expense'      // created from an expense record
  | 'transaction'  // manual ledger entry
  | 'mileage'      // mileage claim
  | 'adjustment'   // manual adjusting entry
  | 'opening'      // opening balance

export interface LedgerLine {
  accountId: string
  /** Positive £ amount. Exactly one of debit/credit is non-zero per line. */
  debit:     number
  credit:    number
  memo?:     string
}

export interface JournalEntry {
  id:          string
  /** ISO date the entry is effective (affects reporting period). */
  date:        string
  description: string
  source:      JournalSource
  /** ID of the source record (invoice.id, expense.id, etc.), if any. */
  sourceId?:   string
  lines:       LedgerLine[]
  /** ISO timestamp the entry was posted (never edited — see audit trail). */
  postedAt:    string
}

export interface TrialBalanceRow {
  accountId: string
  code:      AccountCode
  name:      string
  type:      AccountType
  debit:     number
  credit:    number
  balance:   number // debit - credit for asset/expense, credit - debit for others
}

// ── Default chart of accounts (UK sole-trader friendly) ────────────────────

export const DEFAULT_CHART_OF_ACCOUNTS: Omit<Account, 'id' | 'createdAt' | 'active'>[] = [
  // Assets
  { code: '1000', name: 'Cash & bank',        type: 'asset'     },
  { code: '1100', name: 'Trade debtors',      type: 'asset'     },
  { code: '1200', name: 'Prepayments',        type: 'asset'     },
  { code: '1300', name: 'Fixed assets',       type: 'asset'     },
  // Liabilities
  { code: '2000', name: 'Trade creditors',    type: 'liability' },
  { code: '2100', name: 'VAT control',        type: 'liability' },
  { code: '2200', name: 'Income tax payable', type: 'liability' },
  { code: '2300', name: 'NI payable',         type: 'liability' },
  // Equity
  { code: '3000', name: 'Owner capital',      type: 'equity'    },
  { code: '3100', name: 'Drawings',           type: 'equity'    },
  { code: '3200', name: 'Retained earnings',  type: 'equity'    },
  // Income
  { code: '4000', name: 'Sales',              type: 'income'    },
  { code: '4100', name: 'Other income',       type: 'income'    },
  // Expenses
  { code: '5000', name: 'Cost of sales',      type: 'expense'   },
  { code: '6000', name: 'Office & equipment', type: 'expense'   },
  { code: '6100', name: 'Travel & transport', type: 'expense'   },
  { code: '6200', name: 'Software & subscriptions', type: 'expense' },
  { code: '6300', name: 'Marketing',          type: 'expense'   },
  { code: '6400', name: 'Professional services', type: 'expense' },
  { code: '6500', name: 'Training',           type: 'expense'   },
  { code: '6600', name: 'Utilities',          type: 'expense'   },
  { code: '6700', name: 'Meals',              type: 'expense'   },
  { code: '6800', name: 'Mileage',            type: 'expense'   },
  { code: '6999', name: 'Other expenses',     type: 'expense'   },
]

// ── Validation ─────────────────────────────────────────────────────────────

export function validateJournalEntry(entry: Omit<JournalEntry, 'id' | 'postedAt'>): string | null {
  if (!entry.lines.length) return 'Journal entry has no lines'
  let debit = 0, credit = 0
  for (const l of entry.lines) {
    if (l.debit < 0 || l.credit < 0) return 'Negative amounts are not allowed'
    if (l.debit > 0 && l.credit > 0) return 'A single line cannot have both debit and credit'
    debit  += l.debit
    credit += l.credit
  }
  // Use a small epsilon for floating-point equality in pounds/pence.
  if (Math.abs(debit - credit) > 0.005) {
    return `Entry does not balance: debits £${debit.toFixed(2)} vs credits £${credit.toFixed(2)}`
  }
  return null
}
