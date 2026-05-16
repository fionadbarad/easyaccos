// Scenario key + menu metadata + the pure TaxInput builder.
// buildTaxInput is extracted so it can be unit-tested without React.

import type { TaxInput, EmploymentType, StudentLoanPlan, TaxRegion } from '@/lib/tax-logic'

export type ScenarioKey = 'employed' | 'self-employed' | 'director' | 'welfare' | 'jobloss'

export const SCENARIOS: { key: ScenarioKey; label: string; desc: string; icon: string }[] = [
  { key: 'employed',       label: 'Employed',          desc: 'PAYE salary, 8% NI',             icon: '💼' },
  { key: 'self-employed',  label: 'Self-Employed',     desc: 'Sole trader, 6% NI Class 4',     icon: '🔧' },
  { key: 'director',       label: 'Director',          desc: 'Salary + Dividends',              icon: '🏢' },
  { key: 'welfare',        label: 'Welfare & Support', desc: 'UC, JSA, Carer\'s Allowance',     icon: '🤝' },
  { key: 'jobloss',        label: 'Job Loss',          desc: '£30k exemption & PAYE refund',    icon: '⚡' },
]

export const FULL_ENGINE_SCENARIOS: ReadonlyArray<ScenarioKey> = ['employed', 'self-employed', 'director']

export function isFullEngineScenario(k: ScenarioKey): boolean {
  return FULL_ENGINE_SCENARIOS.includes(k)
}

export type TaxInputDraft = {
  scenario: ScenarioKey
  grossRevenue: number
  allowableExpenses: number
  pensionContribution: number
  dirSalary: number
  dirDividends: number
  taxRegion: TaxRegion
  studentLoanPlan: StudentLoanPlan
  marriageAllowance: boolean
  blindPersonsAllowance: boolean
  voluntaryClass2NI: boolean
}

/**
 * Projects the UI state into the shape calculateTax expects. The three
 * full-engine scenarios diverge in important ways:
 *   - employed       → gross salary, no expenses, no dividends
 *   - self-employed  → gross revenue − expenses, Class 4 NI applies
 *   - director       → grossRevenue = salary + dividends, dividendIncome set
 *
 * Returning `null` for welfare/jobloss keeps the caller honest (those
 * scenarios use calcScenario3/4, not calculateTax).
 */
export function buildTaxInput(d: TaxInputDraft): TaxInput | null {
  if (!isFullEngineScenario(d.scenario)) return null

  if (d.scenario === 'director') {
    return {
      grossRevenue:          d.dirSalary + d.dirDividends,
      allowableExpenses:     0,
      dividendIncome:        d.dirDividends,
      employmentType:        'director' as EmploymentType,
      taxRegion:             d.taxRegion,
      studentLoanPlan:       d.studentLoanPlan,
      voluntaryClass2NI:     false,
      marriageAllowance:     d.marriageAllowance,
      blindPersonsAllowance: d.blindPersonsAllowance,
      pensionContribution:   d.pensionContribution,
    }
  }

  return {
    grossRevenue:          d.grossRevenue,
    allowableExpenses:     d.scenario === 'self-employed' ? d.allowableExpenses : 0,
    dividendIncome:        0,
    employmentType:        d.scenario as EmploymentType,
    taxRegion:             d.taxRegion,
    studentLoanPlan:       d.studentLoanPlan,
    voluntaryClass2NI:     d.voluntaryClass2NI,
    marriageAllowance:     d.marriageAllowance,
    blindPersonsAllowance: d.blindPersonsAllowance,
    pensionContribution:   d.pensionContribution,
  }
}
