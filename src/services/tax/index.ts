/**
 * Tax service — stable public façade over the HMRC 2026/27 fiscal engine.
 *
 * Call sites in components and routes should import from `@/services/tax`
 * rather than reaching into `lib/tax-logic` or `lib/TaxBible2026` directly.
 * That keeps the engine's internal reorganisation free of UI churn.
 *
 * The engine itself (calculateTax, validateTaxInput, TaxBible scenario calcs,
 * 2026/27 bands) stays in `lib/` because it's pure, heavily-tested math.
 * This module is a re-export contract — no new HMRC data lives here.
 */

export {
  calculateTax,
  validateTaxInput,
  round2,
  calcPA,
} from '@/lib/tax-logic'

export type {
  TaxInput,
  TaxResult,
  TaxBand,
  MonthlyBreakdown,
  OptimizationTip,
  BreakdownStep,
  EmploymentType,
  StudentLoanPlan,
  TaxRegion,
} from '@/lib/tax-logic'

export {
  TB,
  calcScenario1,
  calcScenario2,
  calcScenario3,
  calcScenario4,
  calcScenario5,
  calcEmployerNI,
} from '@/lib/TaxBible2026'

export type {
  ScenarioResult,
  S1Input,
  S2Input,
  S3Input,
  S4Input,
  S5Input,
} from '@/lib/TaxBible2026'
