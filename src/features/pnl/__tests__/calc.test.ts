import { describe, it, expect } from 'vitest'
import { buildMonthly, computePnL, isCogs } from '../calc'
import type { Transaction } from '@/lib/transactions/seed'

function tx(over: Partial<Transaction> = {}): Transaction {
  return {
    id: over.id ?? crypto.randomUUID(),
    date: over.date ?? '2026-04-06',
    description: over.description ?? 'Item',
    type: over.type ?? 'expense',
    amount: over.amount ?? 0,
    reference: over.reference ?? '',
  }
}

describe('isCogs', () => {
  it('matches cost-of-sales keywords case-insensitively', () => {
    expect(isCogs('Raw materials — steel')).toBe(true)
    expect(isCogs('SUBCONTRACTOR payment')).toBe(true)
    expect(isCogs('Wholesale purchases')).toBe(true)
  })

  it('treats ordinary expenses as OpEx', () => {
    expect(isCogs('Office rent')).toBe(false)
    expect(isCogs('Accountancy fees')).toBe(false)
  })
})

describe('computePnL', () => {
  it('splits expenses into COGS and OpEx and derives profit figures', () => {
    const f = computePnL([
      tx({ type: 'income', amount: 100_000, description: 'Client A' }),
      tx({ type: 'expense', amount: 30_000, description: 'Raw materials' }),
      tx({ type: 'expense', amount: 10_000, description: 'Office rent' }),
    ])
    expect(f.totalRevenue).toBe(100_000)
    expect(f.costOfSales).toBe(30_000)
    expect(f.opEx).toBe(10_000)
    expect(f.expensesTotal).toBe(40_000)
    expect(f.grossProfit).toBe(70_000)
    expect(f.ebitda).toBe(60_000)
    expect(f.netProfit).toBe(60_000)
    expect(f.margin).toBeCloseTo(60)
    expect(f.cogsItems).toHaveLength(1)
    expect(f.opExItems).toHaveLength(1)
  })

  it('margin is zero when there is no revenue', () => {
    const f = computePnL([tx({ type: 'expense', amount: 500, description: 'Office rent' })])
    expect(f.totalRevenue).toBe(0)
    expect(f.margin).toBe(0)
    expect(f.netProfit).toBe(-500)
  })
})

describe('buildMonthly', () => {
  it('buckets income and expenses by calendar month', () => {
    const points = buildMonthly([
      tx({ type: 'income', amount: 1_000, date: '2026-01-15' }),
      tx({ type: 'expense', amount: 400, date: '2026-01-20' }),
      tx({ type: 'income', amount: 2_000, date: '2026-02-01' }),
    ])
    const jan = points.find((p) => p.month === 'Jan')
    const feb = points.find((p) => p.month === 'Feb')
    expect(jan).toMatchObject({ income: 1_000, expenses: 400, profit: 600 })
    expect(feb).toMatchObject({ income: 2_000, expenses: 0, profit: 2_000 })
  })
})
