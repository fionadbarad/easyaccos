/**
 * P&L statement, SA103 mapping and CSV escaping.
 *
 * None of this was reachable from a test while it lived in the page component.
 * The SA103 reconciliation and the formula-injection guard are the two that
 * matter: one feeds a real HMRC return, the other is a path from a description
 * a user types to code running in whoever opens the export.
 */

import { describe, it, expect } from 'vitest'
import { buildMonthly, buildIncomeStatement, sa103Rows, csvCell, toCsv } from '../pnl/statement'
import type { Transaction } from '../transactions/seed'

let seq = 0
function tx(over: Partial<Transaction> = {}): Transaction {
  return {
    id: `t${seq++}`,
    date: '2026-05-10',
    description: 'thing',
    type: 'expense',
    amount: 100,
    reference: '',
    ...over,
  } as Transaction
}

const income = (amount: number, date = '2026-05-10') => tx({ type: 'income', amount, date })
const expense = (amount: number, date = '2026-05-10') => tx({ type: 'expense', amount, date })
const cogs = (amount: number, date = '2026-05-10') =>
  tx({ type: 'expense', amount, date, cost_category: 'cost_of_sales' })

describe('buildMonthly', () => {
  it('buckets by month and nets profit', () => {
    const rows = buildMonthly([income(1000), expense(400)])
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ month: 'May', income: 1000, expenses: 400, profit: 600 })
  })

  it('keeps two years apart rather than collapsing them', () => {
    // The same calendar month in different years is not the same bar.
    const rows = buildMonthly([income(100, '2025-05-10'), income(200, '2026-05-10')])
    expect(rows).toHaveLength(2)
    expect(rows.map((r) => r.income)).toEqual([100, 200])
  })

  it('adds a year suffix only when the data spans more than one year', () => {
    expect(buildMonthly([income(100, '2026-05-10')])[0]!.month).toBe('May')
    const multi = buildMonthly([income(100, '2025-05-10'), income(100, '2026-06-10')])
    expect(multi.map((r) => r.month)).toEqual(['May 25', 'Jun 26'])
  })

  it('sorts chronologically regardless of input order', () => {
    const rows = buildMonthly([income(1, '2026-08-01'), income(1, '2026-02-01')])
    expect(rows.map((r) => r.month)).toEqual(['Feb', 'Aug'])
  })

  it('skips unparseable dates instead of bucketing them under NaN', () => {
    const rows = buildMonthly([income(100), income(999, 'not-a-date')])
    expect(rows).toHaveLength(1)
    expect(rows[0]!.income).toBe(100)
  })

  it('returns nothing for no transactions', () => {
    expect(buildMonthly([])).toEqual([])
  })
})

describe('income statement', () => {
  it('separates cost of sales from operating expenses', () => {
    const s = buildIncomeStatement([income(10_000), cogs(3_000), expense(2_000)])
    expect(s.totalRevenue).toBe(10_000)
    expect(s.costOfSales).toBe(3_000)
    expect(s.opEx).toBe(2_000)
    expect(s.totalExpenses).toBe(5_000)
    expect(s.grossProfit).toBe(7_000)
    expect(s.netProfit).toBe(5_000)
  })

  it('reconciles: gross profit less opEx equals net profit', () => {
    const s = buildIncomeStatement([income(48_000), cogs(11_500), expense(6_250)])
    expect(s.grossProfit - s.opEx).toBeCloseTo(s.netProfit, 6)
    expect(s.totalRevenue - s.totalExpenses).toBeCloseTo(s.netProfit, 6)
  })

  it('provides no tax on a loss', () => {
    // Running the engine on a loss would provision against income the business
    // did not make.
    const s = buildIncomeStatement([income(1_000), expense(5_000)])
    expect(s.netProfit).toBe(-4_000)
    expect(s.taxProvision).toBe(0)
    expect(s.incomeTax).toBe(0)
    expect(s.nationalInsurance).toBe(0)
    expect(s.profitAfterTax).toBe(-4_000)
  })

  it('provides tax once profitable', () => {
    const s = buildIncomeStatement([income(60_000), expense(10_000)])
    expect(s.netProfit).toBe(50_000)
    expect(s.taxProvision).toBeGreaterThan(0)
    expect(s.profitAfterTax).toBeCloseTo(s.netProfit - s.taxProvision, 6)
  })

  it('does not divide by zero when there is no revenue', () => {
    expect(buildIncomeStatement([]).margin).toBe(0)
    expect(buildIncomeStatement([expense(500)]).margin).toBe(0)
  })

  it('computes margin as a percentage of revenue', () => {
    const s = buildIncomeStatement([income(10_000), expense(2_500)])
    expect(s.margin).toBeCloseTo(75, 6)
  })
})

describe('SA103 mapping', () => {
  const AT = new Date('2026-06-01T09:00:00.000Z')
  const rows = (txs: Transaction[]) => new Map(sa103Rows(buildIncomeStatement(txs), AT))

  it('reports turnover in Box 9', () => {
    expect(rows([income(42_000)]).get('Box 9  Turnover (Total Revenue)')).toBe('42000.00')
  })

  it('splits COGS into Box 11 and other expenses into Box 17', () => {
    const m = rows([income(20_000), cogs(4_000), expense(1_500)])
    expect(m.get('Box 11 Cost of goods bought (COGS)')).toBe('4000.00')
    expect(m.get('Box 17 Other allowable business expenses')).toBe('1500.00')
  })

  it('Box 20 equals Box 11 plus Box 17 — the return must reconcile', () => {
    const m = rows([income(20_000), cogs(4_000), expense(1_500)])
    const b11 = Number(m.get('Box 11 Cost of goods bought (COGS)'))
    const b17 = Number(m.get('Box 17 Other allowable business expenses'))
    const b20 = Number(m.get('Box 20 Total allowable expenses'))
    expect(b11 + b17).toBeCloseTo(b20, 2)
  })

  it('Box 21 equals Box 9 minus Box 20', () => {
    const m = rows([income(20_000), cogs(4_000), expense(1_500)])
    const b9 = Number(m.get('Box 9  Turnover (Total Revenue)'))
    const b20 = Number(m.get('Box 20 Total allowable expenses'))
    expect(b9 - b20).toBeCloseTo(Number(m.get('Box 21 Net profit / (loss)')), 2)
  })

  it('reports a loss in Box 21 rather than clamping to zero', () => {
    expect(rows([income(1_000), expense(4_000)]).get('Box 21 Net profit / (loss)')).toBe('-3000.00')
  })

  it('uses the injected timestamp, so the export is reproducible', () => {
    expect(rows([income(1)]).get('Generated')).toBe('2026-06-01T09:00:00.000Z')
  })
})

describe('CSV escaping', () => {
  it('quotes ordinary values', () => {
    expect(csvCell('hello')).toBe('"hello"')
  })

  it('doubles embedded quotes', () => {
    expect(csvCell('say "hi"')).toBe('"say ""hi"""')
  })

  it('neutralises every formula trigger', () => {
    // Excel, LibreOffice and Sheets all execute a cell beginning with one of
    // these. An expense description is user-typed and the file gets opened by
    // an accountant.
    for (const lead of ['=', '+', '-', '@', '\t', '\r']) {
      expect(csvCell(`${lead}cmd`).startsWith(`"'${lead}`)).toBe(true)
    }
  })

  it('defuses a real injection payload', () => {
    const attack = "=cmd|'/c calc'!A1"
    const cell = csvCell(attack)
    expect(cell).toBe(`"'${attack}"`)
    expect(cell.startsWith('"=')).toBe(false)
  })

  it('leaves a value that merely contains = alone', () => {
    // Only the leading character makes a formula; escaping more would mangle
    // legitimate descriptions.
    expect(csvCell('width=10')).toBe('"width=10"')
  })

  it('joins rows with CRLF', () => {
    expect(
      toCsv([
        ['a', 'b'],
        ['c', 'd'],
      ]),
    ).toBe('"a","b"\r\n"c","d"')
  })
})
