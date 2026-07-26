import { describe, it, expect } from 'vitest'
import {
  costCategoryOf,
  isCostOfSales,
  isInferredCategory,
  looksLikeCostOfSales,
} from '@/lib/transactions/cost-category'
import type { Transaction } from '@/lib/transactions/seed'

function tx(over: Partial<Transaction>): Transaction {
  return {
    id: 'x',
    date: '2026-05-01',
    description: '',
    type: 'expense',
    amount: 100,
    reference: '',
    ...over,
  }
}

// PL-1. The explicit field is authoritative; the description heuristic survives
// only so rows saved before the field existed keep the classification they were
// already being shown with.
describe('costCategoryOf', () => {
  it('uses the stored category, whatever the description says', () => {
    // "Office materials" matches the legacy 'material' keyword but is an
    // overhead — this is exactly the case the old matcher got wrong.
    expect(
      costCategoryOf(tx({ description: 'Office materials', cost_category: 'operating' })),
    ).toBe('operating')
    // And a direct cost whose wording matches no keyword at all.
    expect(
      costCategoryOf(
        tx({ description: 'Tiles for the Hendry job', cost_category: 'cost_of_sales' }),
      ),
    ).toBe('cost_of_sales')
  })

  it('returns null for income, which has no cost category', () => {
    expect(costCategoryOf(tx({ type: 'income', description: 'Client invoice' }))).toBeNull()
    expect(isCostOfSales(tx({ type: 'income', description: 'stock sale' }))).toBe(false)
  })

  it('falls back to the description for rows with no stored category', () => {
    expect(costCategoryOf(tx({ description: 'Subcontractor — plastering' }))).toBe('cost_of_sales')
    expect(costCategoryOf(tx({ description: 'Monthly broadband' }))).toBe('operating')
  })

  it('flags exactly the rows whose category is inferred', () => {
    expect(isInferredCategory(tx({ description: 'Raw timber' }))).toBe(true)
    expect(
      isInferredCategory(tx({ description: 'Raw timber', cost_category: 'cost_of_sales' })),
    ).toBe(false)
    expect(isInferredCategory(tx({ type: 'income', description: 'Sale' }))).toBe(false)
  })
})

describe('looksLikeCostOfSales (legacy heuristic)', () => {
  it('still recognises the historical keywords', () => {
    for (const d of ['Materials', 'subcontract labour', 'STOCK purchase', 'wholesale order']) {
      expect(looksLikeCostOfSales(d)).toBe(true)
    }
  })

  it('does not match ordinary overheads', () => {
    for (const d of ['Accountancy fee', 'Insurance', 'Broadband']) {
      expect(looksLikeCostOfSales(d)).toBe(false)
    }
  })
})

describe('gross profit split', () => {
  it('separates direct costs from overheads', () => {
    const rows = [
      tx({ id: 'a', type: 'income', amount: 10_000, description: 'Sales' }),
      tx({ id: 'b', amount: 3_000, cost_category: 'cost_of_sales', description: 'Timber' }),
      tx({ id: 'c', amount: 500, cost_category: 'operating', description: 'Broadband' }),
    ]
    const revenue = rows.filter((r) => r.type === 'income').reduce((s, r) => s + r.amount, 0)
    const cogs = rows.filter(isCostOfSales).reduce((s, r) => s + r.amount, 0)
    const opex = rows
      .filter((r) => r.type === 'expense' && !isCostOfSales(r))
      .reduce((s, r) => s + r.amount, 0)

    expect(cogs).toBe(3_000)
    expect(opex).toBe(500)
    expect(revenue - cogs).toBe(7_000) // gross profit
    expect(revenue - cogs - opex).toBe(6_500) // profit before tax
  })
})
