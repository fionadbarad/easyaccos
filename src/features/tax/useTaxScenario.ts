'use client'

// Owns all calculator state and derives results. The shell component is then
// purely presentational - pass props through, render panels.

import { useState, useMemo } from 'react'
import {
  calculateTax,
  type TaxResult, type StudentLoanPlan, type TaxRegion,
} from '@/lib/tax-logic'
import {
  calcScenario3, calcScenario4,
  type ScenarioResult, type S3Input, type S4Input,
} from '@/lib/TaxBible2026'
import { buildTaxInput, isFullEngineScenario, type ScenarioKey } from './scenarios'

export function useTaxScenario() {
  const [scenario, setScenario] = useState<ScenarioKey>('employed')
  const [showMonthly, setShowMonthly] = useState(false)
  const [sliderIncome, setSliderIncome] = useState(45_000)

  const [taxRegion, setTaxRegion] = useState<TaxRegion>('ruk')
  const [grossRevenue, setGrossRevenue] = useState(45_000)
  const [allowableExpenses, setAllowableExpenses] = useState(0)
  const [pensionContribution, setPensionContribution] = useState(0)
  const [studentLoanPlan, setStudentLoanPlan] = useState<StudentLoanPlan>('none')
  const [marriageAllowance, setMarriageAllowance] = useState(false)
  const [blindPersonsAllowance, setBlindPersonsAllowance] = useState(false)
  const [voluntaryClass2NI, setVoluntaryClass2NI] = useState(false)

  const [dirSalary, setDirSalary] = useState(12_570)
  const [dirDividends, setDirDividends] = useState(50_000)

  const [s3, setS3] = useState<S3Input>({ universalCredit: 6_000, jsaAmount: 4_000, carersAllowance: 2_400, otherIncome: 0 })
  const [s4, setS4] = useState<S4Input>({ annualSalary: 42_000, monthsWorked: 6, redundancyPayment: 35_000, paydeTaxPaid: 4_200 })

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
