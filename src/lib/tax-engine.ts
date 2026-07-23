// ─── EasyAcco Unified Tax Engine ─────────────────────────────────────────────
// Single import entry point for tax math + scenario journeys.
//
// Layering:
//   tax-logic.ts     — canonical formulas (calculateTax, calcPA, calcRukTax …)
//   tax-scenarios.ts — UX-shaped wrappers for the 5 user journeys
//   bands-2026.ts    — every constant (PA, NI, dividend, Scotland, redundancy)

export {
  calculateTax,
  calcPA,
  calcRukTax,
  calcScoTax,
  calcNiClass1,
  calcNiClass2,
  calcNiClass4,
  calcDividendTax,
  calcStudentLoan,
  calcEmployerNi,
} from './tax-logic'

export {
  calcScenario1,
  calcScenario2,
  calcScenario3,
  calcScenario4,
  calcScenario5,
} from './tax-scenarios'
export type {
  ScenarioResult,
  ScenarioLine,
  S1Input,
  S2Input,
  S3Input,
  S4Input,
  S5Input,
} from './tax-scenarios'
