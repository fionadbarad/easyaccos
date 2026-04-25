/** Canonical seed data for the user_transactions store.
 *  Imported by both the Transactions and P&L pages so that guest users
 *  see identical data on first load regardless of which page they visit first.
 */
export interface BaseTransaction {
  id: string
  date: string
  description: string
  type: 'income' | 'expense'
  amount: number
  reference: string
}

export const TRANSACTION_SEED: BaseTransaction[] = [
  { id: '1', date: '2026-04-01', description: 'Client Project — Acme Corp',  type: 'income',  amount: 2400,  reference: 'INV-001' },
  { id: '2', date: '2026-04-02', description: 'Adobe Creative Cloud',         type: 'expense', amount: 54.99, reference: 'SUB-001' },
  { id: '3', date: '2026-04-05', description: 'Consulting — Beta Ltd',         type: 'income',  amount: 1800,  reference: 'INV-002' },
  { id: '4', date: '2026-04-07', description: 'Home Office Internet',          type: 'expense', amount: 45,    reference: 'UTIL-001' },
  { id: '5', date: '2026-03-20', description: 'Freelance Writing Project',     type: 'income',  amount: 750,   reference: 'INV-003' },
  { id: '6', date: '2026-03-15', description: 'Travel — Client Visit',         type: 'expense', amount: 120,   reference: 'EXP-001' },
  { id: '7', date: '2026-02-28', description: 'Design Retainer',               type: 'income',  amount: 3200,  reference: 'INV-004' },
]
