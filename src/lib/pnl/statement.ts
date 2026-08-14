/**
 * Profit-and-loss arithmetic, the SA103 box mapping, and CSV escaping.
 *
 * All of this lived inside an 841-line page component. Three separate things
 * were untestable as a result, and they are not equally serious:
 *
 *   - The income statement. Ordinary arithmetic, but it decides the profit
 *     figure a user reads.
 *
 *   - The SA103 mapping. These are the numbered boxes of a real HMRC Self
 *     Assessment return. Box 20 must equal all allowable expenses, and Box 21
 *     must reconcile to turnover minus that. A user who exports this and copies
 *     it onto their return is filing whatever this function said.
 *
 *   - CSV cell escaping. A defence against spreadsheet formula injection: an
 *     expense described as `=cmd|'/c calc'!A1` becomes an executable formula
 *     when the export is opened in Excel. The description comes from the user,
 *     but a user's accountant opens the file — so it is a real path from typed
 *     text to code running on somebody else's machine, and it had no test.
 *
 * Nothing here touches React or the DOM. The page keeps the Blob and the
 * download click; the parts that can be wrong quietly are here.
 */

import type { Transaction } from '@/lib/transactions/seed'
import { isCostOfSales, isInferredCategory } from '@/lib/transactions/cost-category'
import { calcScenario1 } from '@/lib/tax-scenarios'
import { ymOf } from '@/lib/dates'

const MONTHS = [
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
] as const

export type MonthlyRow = {
  month: string
  income: number
  expenses: number
  profit: number
}

/**
 * Monthly income/expense buckets, chronological.
 *
 * Keyed by year AND month so two different Aprils never collapse into one bar.
 * The label carries a 2-digit year suffix only when the data actually spans
 * more than one year, which keeps a single-year chart uncluttered.
 *
 * Unparseable dates are skipped rather than bucketed under NaN.
 */
export function buildMonthly(txs: Transaction[]): MonthlyRow[] {
  const map: Record<string, { income: number; expenses: number; year: number; monthIdx: number }> =
    {}
  for (const tx of txs) {
    // Read from the stored string, not a parsed Date: 'YYYY-MM-DD' parses as
    // UTC midnight and local getters then shift it, which put the first of a
    // month in the month before. See lib/dates.ts.
    const ym = ymOf(tx.date)
    if (!ym) continue
    const { year, monthIdx } = ym
    const key = `${year}-${String(monthIdx).padStart(2, '0')}`
    const bucket = map[key] ?? { income: 0, expenses: 0, year, monthIdx }
    if (tx.type === 'income') bucket.income += tx.amount
    else bucket.expenses += tx.amount
    map[key] = bucket
  }
  const rows = Object.values(map).sort((a, b) => a.year - b.year || a.monthIdx - b.monthIdx)
  const multiYear = new Set(rows.map((r) => r.year)).size > 1
  return rows.map((r) => ({
    month: multiYear ? `${MONTHS[r.monthIdx]} ${String(r.year).slice(2)}` : `${MONTHS[r.monthIdx]}`,
    income: r.income,
    expenses: r.expenses,
    profit: r.income - r.expenses,
  }))
}

export type IncomeStatement = {
  totalRevenue: number
  costOfSales: number
  grossProfit: number
  opEx: number
  totalExpenses: number
  profitBeforeTax: number
  netProfit: number
  margin: number
  /** Rows whose cost category was inferred from the description rather than
   *  set explicitly — surfaced so the user can check them. */
  inferredCount: number
  incomeTax: number
  nationalInsurance: number
  taxProvision: number
  profitAfterTax: number
}

/**
 * The full statement for a set of transactions.
 *
 * Cost of sales comes from each transaction's own `cost_category`; rows saved
 * before that field existed fall back to a description heuristic inside
 * `costCategoryOf`, so historical figures do not shift under people.
 *
 * No tax is provided for at or below zero profit — there is nothing to tax, and
 * running the engine on a loss would produce a provision against income the
 * business did not make.
 */
export function buildIncomeStatement(txs: Transaction[]): IncomeStatement {
  const totalRevenue = txs.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const totalExpenses = txs.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  const costOfSales = txs.filter(isCostOfSales).reduce((s, t) => s + t.amount, 0)
  const grossProfit = totalRevenue - costOfSales
  const opEx = totalExpenses - costOfSales
  const profitBeforeTax = grossProfit - opEx
  const netProfit = profitBeforeTax

  const tax =
    netProfit > 0
      ? calcScenario1({
          grossIncome: totalRevenue,
          expenses: totalExpenses,
          employmentType: 'self-employed',
          pension: 0,
        })
      : { incomeTax: 0, nationalInsurance: 0, totalDeductions: 0 }

  return {
    totalRevenue,
    costOfSales,
    grossProfit,
    opEx,
    totalExpenses,
    profitBeforeTax,
    netProfit,
    margin: totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0,
    inferredCount: txs.filter(isInferredCategory).length,
    incomeTax: tax.incomeTax,
    nationalInsurance: tax.nationalInsurance,
    taxProvision: tax.totalDeductions,
    profitAfterTax: netProfit - tax.totalDeductions,
  }
}

/**
 * The tax year both exports are labelled with. One constant rather than two
 * literals: the CSV header and the JSON payload must never disagree about
 * which year a user is copying figures onto a return for.
 */
const FISCAL_YEAR = '2026/27'

/**
 * SA103 (Self-Employment, short) box mapping.
 *
 * The box numbers are HMRC's, not ours, and a user may copy these straight onto
 * a return. `generatedAt` is injected rather than read from the clock so the
 * output is reproducible in a test.
 */
export function sa103Rows(s: IncomeStatement, generatedAt: Date): Array<[string, string]> {
  return [
    [`SA103 Self-Employment (Short) — ${FISCAL_YEAR}`, ''],
    ['Generated', generatedAt.toISOString()],
    ['', ''],
    ['Box 9  Turnover (Total Revenue)', s.totalRevenue.toFixed(2)],
    ['Box 10 Other business income', '0.00'],
    ['Box 11 Cost of goods bought (COGS)', s.costOfSales.toFixed(2)],
    ['Box 17 Other allowable business expenses', s.opEx.toFixed(2)],
    ['Box 20 Total allowable expenses', s.totalExpenses.toFixed(2)],
    ['Box 21 Net profit / (loss)', s.netProfit.toFixed(2)],
    ['', ''],
    ['— Tax provision (indicative) —', ''],
    ['Income Tax', s.incomeTax.toFixed(2)],
    ['National Insurance (Class 4)', s.nationalInsurance.toFixed(2)],
    ['Profit after tax', s.profitAfterTax.toFixed(2)],
  ]
}

export type ExportPayload = {
  generated: string
  fiscalYear: string
  summary: {
    totalRevenue: number
    costOfSales: number
    grossProfit: number
    opEx: number
    profitBeforeTax: number
    taxProvision: number
    profitAfterTax: number
  }
  monthlyBreakdown: MonthlyRow[]
  transactions: Transaction[]
}

/**
 * The JSON export payload — the whole statement in a shape an accountant's
 * tooling can read.
 *
 * Sits beside sa103Rows because it is the same kind of thing: a pure mapping
 * from a statement to an export format. It lived inside the page's
 * exportJSON() with the clipboard write, which meant the rounding decisions
 * below could only be checked by clicking the button.
 *
 * `generatedAt` is injected rather than read from the clock, for the same
 * reason it is on sa103Rows: an export is worth being able to reproduce in a
 * test.
 *
 * Note which fields round and which do not — this mirrors what the page did
 * and is deliberately preserved rather than tidied. Revenue and the two tax
 * figures round to whole pounds because they are summary headline numbers;
 * the cost lines keep their pence so the summary still reconciles against the
 * transactions array shipped alongside it.
 */
export function buildExportPayload(
  s: IncomeStatement,
  monthly: MonthlyRow[],
  txs: Transaction[],
  generatedAt: Date,
): ExportPayload {
  return {
    generated: generatedAt.toISOString(),
    fiscalYear: FISCAL_YEAR,
    summary: {
      totalRevenue: Math.round(s.totalRevenue),
      costOfSales: s.costOfSales,
      grossProfit: s.grossProfit,
      opEx: s.opEx,
      profitBeforeTax: s.profitBeforeTax,
      taxProvision: Math.round(s.taxProvision),
      profitAfterTax: Math.round(s.profitAfterTax),
    },
    monthlyBreakdown: monthly,
    transactions: txs,
  }
}

/**
 * Escape one CSV cell.
 *
 * Two jobs. The quoting is ordinary CSV correctness. The leading-quote prefix
 * is the security one: Excel, LibreOffice and Google Sheets treat a cell
 * starting `=`, `+`, `-`, `@`, tab or CR as a formula, so a transaction
 * described as `=HYPERLINK("http://evil","click")` runs on open. Prefixing with
 * an apostrophe forces it to be read as text.
 */
export function csvCell(value: string): string {
  let s = String(value)
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`
  return `"${s.replace(/"/g, '""')}"`
}

/** Join escaped rows with CRLF, as the CSV spec requires. */
export function toCsv(rows: Array<[string, string]>): string {
  return rows.map((r) => r.map(csvCell).join(',')).join('\r\n')
}
