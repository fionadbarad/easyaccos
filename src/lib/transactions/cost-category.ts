/**
 * Classifies an expense as cost of sales or overhead (PL-1).
 *
 * The P&L used to decide this by keyword-matching the free-text description,
 * which is wrong in both directions: "Office materials" is an overhead that
 * reads as a direct cost, and "Tiles for the Hendry job" is a direct cost that
 * matches nothing. Gross profit and margin were therefore reported off a guess
 * about prose.
 *
 * The transaction now carries an explicit `cost_category`. Rows created before
 * that field existed have no value, so the old keyword matcher is kept purely
 * as a read-time fallback for them — new rows never reach it.
 */
import type { CostCategory, Transaction } from './seed'

/** Legacy heuristic. Only applied to rows saved before cost_category existed. */
const LEGACY_COGS_KEYWORDS = [
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

/** True when the description looks like a direct cost. Legacy rows only. */
export function looksLikeCostOfSales(description: string): boolean {
  const d = description.toLowerCase()
  return LEGACY_COGS_KEYWORDS.some((k) => d.includes(k))
}

/**
 * The category to report this transaction under.
 *
 * Income has no cost category. An expense uses its stored value when it has
 * one; otherwise it falls back to the description heuristic so historical rows
 * keep the classification they have always been shown with.
 */
export function costCategoryOf(tx: Pick<Transaction, 'type' | 'description' | 'cost_category'>) {
  if (tx.type !== 'expense') return null
  if (tx.cost_category) return tx.cost_category
  return looksLikeCostOfSales(tx.description) ? 'cost_of_sales' : 'operating'
}

/** True when this transaction should be deducted to arrive at gross profit. */
export function isCostOfSales(
  tx: Pick<Transaction, 'type' | 'description' | 'cost_category'>,
): boolean {
  return costCategoryOf(tx) === 'cost_of_sales'
}

/** True when the row predates the explicit field, so its category is inferred. */
export function isInferredCategory(
  tx: Pick<Transaction, 'type' | 'description' | 'cost_category'>,
): boolean {
  return tx.type === 'expense' && !tx.cost_category
}

export const COST_CATEGORY_LABELS: Record<CostCategory, string> = {
  cost_of_sales: 'Cost of sales',
  operating: 'Operating expense',
}
