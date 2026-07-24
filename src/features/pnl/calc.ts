// P&L derivation — pure functions over the transaction list so the report
// figures stay unit-testable and independent of React.

import type { Transaction } from '@/lib/transactions/seed'

export const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]

export interface MonthlyPoint {
  month: string
  income: number
  expenses: number
  profit: number
}

export function buildMonthly(txs: Transaction[]): MonthlyPoint[] {
  const map: Record<string, { income: number; expenses: number }> = {}
  for (const tx of txs) {
    const m = MONTHS[new Date(tx.date).getMonth()] ?? 'Jan'
    const bucket = map[m] ?? { income: 0, expenses: 0 }
    if (tx.type === 'income') bucket.income += tx.amount
    else bucket.expenses += tx.amount
    map[m] = bucket
  }
  return Object.entries(map).map(([month, d]) => ({ month, ...d, profit: d.income - d.expenses }))
}

// Keywords that mark an expense as Cost of Sales (COGS) rather than OpEx.
export const COGS_KEYWORDS = [
  'material',
  'subcontract',
  'cogs',
  'stock',
  'inventory',
  'goods',
  'purchases',
  'wholesale',
  'raw ',
  'direct cost',
]

export function isCogs(desc: string): boolean {
  const d = desc.toLowerCase()
  return COGS_KEYWORDS.some((k) => d.includes(k))
}

export interface PnLFigures {
  totalRevenue: number
  costOfSales: number
  grossProfit: number
  opEx: number
  ebitda: number
  netProfit: number
  expensesTotal: number
  cogsItems: Transaction[]
  opExItems: Transaction[]
  margin: number
}

export function computePnL(txs: Transaction[]): PnLFigures {
  const totalRevenue = txs.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const cogsItems = txs.filter((t) => t.type === 'expense' && isCogs(t.description))
  const opExItems = txs.filter((t) => t.type === 'expense' && !isCogs(t.description))
  const costOfSales = cogsItems.reduce((s, t) => s + t.amount, 0)
  const expensesTotal = txs.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  const opEx = expensesTotal - costOfSales
  const grossProfit = totalRevenue - costOfSales
  const ebitda = grossProfit - opEx
  const netProfit = ebitda
  const margin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0
  return {
    totalRevenue,
    costOfSales,
    grossProfit,
    opEx,
    ebitda,
    netProfit,
    expensesTotal,
    cogsItems,
    opExItems,
    margin,
  }
}
