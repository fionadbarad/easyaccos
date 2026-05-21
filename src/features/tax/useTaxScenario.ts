'use client'

// Owns all calculator state and derives results. The shell component is then
// purely presentational — pass props through, render panels.

import { useState, useMemo } from 'react'
import {
  calculateTax,
  type TaxResult, type StudentLoanPlan, type TaxRegion,
} from '@/lib/tax-logic'
import {
  calcScenario3, calcScenario4,
  type ScenarioResult, type S3Input, type S4Input,
} from '@/lib/tax-scenarios'
import { DIRECTOR_OPTIMAL_SALARY } from '@/lib/tax/bands-2026'
import { buildTaxInput, isFullEngineScenario, type ScenarioKey } from './scenarios'

// All initial-state values for the calculator. Centralised so a UX adjustment
// is one diff, and so reviewers can see the prefilled "story" at a glance.
//   sliderIncome / grossRevenue — illustrative typical sole-trader profit
//   dirSalary                  — HMRC-optimal £12,570 (no NI, full pension credit)
//   dirDividends               — typical owner-managed-co. distribution
//   s3                         — claimant on JSA + Carer's + low otherIncome
//   s4                         — mid-career redundancy mid-tax-year
const DEFAULT_INPUTS = {
  scenario:        'employed' as ScenarioKey,
  showMonthly:     false,
  sliderIncome:    45_000,
  taxRegion:       'ruk' as TaxRegion,
  grossRevenue:    45_000,
  allowableExpenses:    0,
  pensionContribution:  0,
  studentLoanPlan: 'none' as StudentLoanPlan,
  marriageAllowance:     false,
  blindPersonsAllowance: false,
  voluntaryClass2NI:     false,
  dirSalary:    DIRECTOR_OPTIMAL_SALARY,   // from bands-2026
  dirDividends: 50_000,
  s3: { universalCredit: 6_000, jsaAmount: 4_000, carersAllowance: 2_400, otherIncome: 0 } satisfies S3Input,
  s4: { annualSalary:    42_000, monthsWorked: 6, redundancyPayment: 35_000, payeTaxPaid: 4_200 } satisfies S4Input,
} as const

export function useTaxScenario() {
  const [scenario, setScenario]     = useState<ScenarioKey>(DEFAULT_INPUTS.scenario)
  const [showMonthly, setShowMonthly] = useState<boolean>(DEFAULT_INPUTS.showMonthly)
  const [sliderIncome, setSliderIncome] = useState<number>(DEFAULT_INPUTS.sliderIncome)

  const [taxRegion, setTaxRegion]                 = useState<TaxRegion>(DEFAULT_INPUTS.taxRegion)
  const [grossRevenue, setGrossRevenue]           = useState<number>(DEFAULT_INPUTS.grossRevenue)
  const [allowableExpenses, setAllowableExpenses] = useState<number>(DEFAULT_INPUTS.allowableExpenses)
  const [pensionContribution, setPensionContribution] = useState<number>(DEFAULT_INPUTS.pensionContribution)
  const [studentLoanPlan, setStudentLoanPlan]     = useState<StudentLoanPlan>(DEFAULT_INPUTS.studentLoanPlan)
  const [marriageAllowance, setMarriageAllowance] = useState<boolean>(DEFAULT_INPUTS.marriageAllowance)
  const [blindPersonsAllowance, setBlindPersonsAllowance] = useState<boolean>(DEFAULT_INPUTS.blindPersonsAllowance)
  const [voluntaryClass2NI, setVoluntaryClass2NI] = useState<boolean>(DEFAULT_INPUTS.voluntaryClass2NI)

  const [dirSalary, setDirSalary]       = useState<number>(DEFAULT_INPUTS.dirSalary)
  const [dirDividends, setDirDividends] = useState<number>(DEFAULT_INPUTS.dirDividends)

  const [s3, setS3] = useState<S3Input>(DEFAULT_INPUTS.s3)
  const [s4, setS4] = useState<S4Input>(DEFAULT_INPUTS.s4)

  const fullEngine = isFullEngineScenario(scenario)

  function applySlider(v: number) {
    setSliderIncome(v)
    if (scenario === 'employed' || scenario === 'self-employed') setGrossRevenue(v)
    else if (scenario === 'director') setDirDividends(v)
    else if (scenario === 'jobloss') setS4(p => ({ ...p, annualSalary: v }))
  }

  const taxInput = useMemo(() => buildTaxInput({
    scenario, grossRevenue, allowableExpenses, pensionContribution,
    dirSalary, dirDividends, taxRegion, studentLoanPlan,
    marriageAllowance, blindPersonsAllowance, voluntaryClass2NI,
  }), [
    scenario, grossRevenue, allowableExpenses, pensionContribution,
    dirSalary, dirDividends, taxRegion, studentLoanPlan,
    marriageAllowance, blindPersonsAllowance, voluntaryClass2NI,
  ])

  const fullResult: TaxResult | null = useMemo(() => {
    if (!taxInput) return null
    try { return calculateTax(taxInput) } catch { return null }
  }, [taxInput])

  const legacyResult: ScenarioResult | null = useMemo(() => {
    if (fullEngine) return null
    try {
      if (scenario === 'welfare') return calcScenario3(s3)
      if (scenario === 'jobloss') return calcScenario4(s4)
    } catch { return null }
    return null
  }, [fullEngine, scenario, s3, s4])

  return {
    scenario, setScenario,
    showMonthly, setShowMonthly,
    sliderIncome, applySlider,

    taxRegion, setTaxRegion,
    grossRevenue, setGrossRevenue,
    allowableExpenses, setAllowableExpenses,
    pensionContribution, setPensionContribution,
    studentLoanPlan, setStudentLoanPlan,
    marriageAllowance, setMarriageAllowance,
    blindPersonsAllowance, setBlindPersonsAllowance,
    voluntaryClass2NI, setVoluntaryClass2NI,

    dirSalary, setDirSalary,
    dirDividends, setDirDividends,

    s3, setS3,
    s4, setS4,

    fullEngine,
    fullResult,
    legacyResult,
  }
}
