/**
 * Double-entry skeleton. Account + JournalEntry types used throughout the
 * platform. No Balance Sheet UI yet — these exist so every entity that
 * writes financial data also posts to the journal, keeping future reports
 * composable without a migration.
 */

export type AccountType = 'asset' | 'liability' | 'equity' | 'income' | 'expense'

export interface Account {
  code:   string      // e.g. "1010"
  name:   string      // e.g. "Trade Debtors"
  type:   AccountType
  parent?: string     // parent account code for sub-account nesting
}

export interface JournalLine {
  accountCode: string
  debit:       number
  credit:      number
  description?: string
}

export interface JournalEntry {
  id:        string     // UUID
  date:      string     // YYYY-MM-DD
  ref:       string     // entity id that caused this posting
  entity:    string     // "invoice" | "expense" | "transaction" | "mileage"
  memo:      string
  lines:     JournalLine[]
  createdAt: string     // ISO timestamp
}
