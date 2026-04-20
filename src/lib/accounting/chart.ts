import type { Account } from './types'

/** Minimal chart of accounts covering sole-trader / micro-company use. */
export const CHART_OF_ACCOUNTS: Account[] = [
  // Assets
  { code: '1000', name: 'Bank — Current',      type: 'asset' },
  { code: '1010', name: 'Trade Debtors',        type: 'asset' },
  { code: '1020', name: 'VAT Receivable',       type: 'asset' },
  { code: '1900', name: 'Other Current Assets', type: 'asset' },

  // Liabilities
  { code: '2000', name: 'Trade Creditors',      type: 'liability' },
  { code: '2010', name: 'VAT Payable',          type: 'liability' },
  { code: '2100', name: 'Tax Provisions',       type: 'liability' },

  // Equity
  { code: '3000', name: "Owner's Capital",      type: 'equity' },
  { code: '3100', name: 'Retained Earnings',    type: 'equity' },

  // Income
  { code: '4000', name: 'Sales — Services',     type: 'income' },
  { code: '4010', name: 'Sales — Products',     type: 'income' },
  { code: '4900', name: 'Other Income',         type: 'income' },

  // Expenses
  { code: '5000', name: 'Office & Equipment',   type: 'expense' },
  { code: '5010', name: 'Travel & Transport',   type: 'expense' },
  { code: '5020', name: 'Software & Subs',      type: 'expense' },
  { code: '5030', name: 'Marketing & Ads',      type: 'expense' },
  { code: '5040', name: 'Professional Services',type: 'expense' },
  { code: '5050', name: 'Training & Education', type: 'expense' },
  { code: '5060', name: 'Utilities',            type: 'expense' },
  { code: '5070', name: 'Meals (business)',     type: 'expense' },
  { code: '5080', name: 'Mileage',              type: 'expense' },
  { code: '5900', name: 'Other Expenses',       type: 'expense' },
]

const EXPENSE_CATEGORY_MAP: Record<string, string> = {
  'Office & Equipment':       '5000',
  'Travel & Transport':       '5010',
  'Software & Subscriptions': '5020',
  'Marketing & Advertising':  '5030',
  'Professional Services':    '5040',
  'Training & Education':     '5050',
  'Utilities':                '5060',
  'Meals (business)':         '5070',
  'Other':                    '5900',
}

export function expenseAccountCode(category: string): string {
  return EXPENSE_CATEGORY_MAP[category] ?? '5900'
}
