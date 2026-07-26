/**
 * Shared seed for the user_transactions table.
 *
 * Both /dashboard/transactions and /dashboard/pnl render off the same store;
 * keeping the seed in one place avoids drift between two near-identical lists.
 */

export type TxType = 'income' | 'expense'

/**
 * Where an expense sits in the P&L.
 *
 * - `cost_of_sales` — a direct cost of producing what was sold (materials,
 *   subcontractors, stock). Deducted from revenue to give gross profit.
 * - `operating`     — an overhead that stands whether or not a sale is made.
 *
 * Only meaningful on expense rows. Field name is snake_case to match the
 * Supabase column, because the sync path upserts each item's keys verbatim.
 */
export type CostCategory = 'cost_of_sales' | 'operating'

export interface Transaction {
  id: string
  date: string
  description: string
  type: TxType
  amount: number
  reference: string
  cost_category?: CostCategory
  updated_at?: string
}

export const TRANSACTIONS_SEED: Transaction[] = [
  {
    id: '1',
    date: '2026-04-01',
    description: 'Client Project — Acme Corp',
    type: 'income',
    amount: 2400,
    reference: 'INV-001',
  },
  {
    id: '2',
    date: '2026-04-02',
    description: 'Adobe Creative Cloud',
    type: 'expense',
    amount: 54.99,
    reference: 'SUB-001',
  },
  {
    id: '3',
    date: '2026-04-05',
    description: 'Consulting — Beta Ltd',
    type: 'income',
    amount: 1800,
    reference: 'INV-002',
  },
  {
    id: '4',
    date: '2026-04-07',
    description: 'Home Office Internet',
    type: 'expense',
    amount: 45,
    reference: 'UTIL-001',
  },
  {
    id: '5',
    date: '2026-03-20',
    description: 'Freelance Writing Project',
    type: 'income',
    amount: 750,
    reference: 'INV-003',
  },
  {
    id: '6',
    date: '2026-03-15',
    description: 'Travel — Client Visit',
    type: 'expense',
    amount: 120,
    reference: 'EXP-001',
  },
  {
    id: '7',
    date: '2026-02-28',
    description: 'Design Retainer',
    type: 'income',
    amount: 3200,
    reference: 'INV-004',
  },
  {
    id: '8',
    date: '2026-03-05',
    description: 'Software Licences',
    type: 'expense',
    amount: 54.99,
    reference: '',
  },
  {
    id: '9',
    date: '2026-03-12',
    description: 'Client C — Design',
    type: 'income',
    amount: 1800,
    reference: '',
  },
]
