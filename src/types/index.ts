/**
 * Shared domain types — single import path for app-wide entities.
 *
 * Prefer `import type { Invoice, Expense, TaxInput } from '@/types'` in new
 * code. Existing modules that already import from `@/lib/validators` or
 * `@/lib/tax-logic` keep working; this barrel does not replace them.
 */

export type {
  Expense,
  Invoice,
  InvoiceStatus,
} from '@/lib/validators'

export type {
  EmploymentType,
  StudentLoanPlan,
  TaxRegion,
  TaxInput,
  TaxBand,
  TaxResult,
  MonthlyBreakdown,
  OptimizationTip,
  BreakdownStep,
} from '@/lib/tax-logic'

export type {
  PassphraseEnvelope,
} from '@/lib/storage/crypto'
