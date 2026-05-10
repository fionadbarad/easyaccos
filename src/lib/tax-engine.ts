// ─── EasyAcco Unified Tax Engine ─────────────────────────────────────────────
// Single import entry point for all tax calculation, scenario, and advisory logic.
//
// Constant reconciliation:
//   RUK_HIGHER_LIMIT (125,140)                — gross income ceiling, in tax-logic
//   RUK_TAXABLE_ADDITIONAL_THRESHOLD (112,570) — taxable income ceiling (gross − PA_BASE)
//   Previously named HIGHER_LIMIT; now uses the exported constant.

// ── Core engine (types, calculateTax, validateTaxInput, all utility exports) ──
export * from './tax-logic'

// ── Scenario engine (5 HMRC user journeys, TB constants, employer NI) ─────────
export {
  TB,
  calcScenario1, calcScenario2, calcScenario3, calcScenario4, calcScenario5,
  calcStudentLoan as calcStudentLoanScenario,
  calcEmployerNI,
  calcClass1NI as calcClass1NIScenario,
  calcClass4NI as calcClass4NIScenario,
  calcDividendTax as calcDividendTaxScenario,
  calcScotlandTax as calcScotlandTaxScenario,
  CAT_GREETINGS,
} from './TaxBible2026'
export type {
  ScenarioResult,
  S1Input, S2Input, S3Input, S4Input, S5Input,
  StudentLoanPlan as ScenarioStudentLoanPlan,
} from './TaxBible2026'

