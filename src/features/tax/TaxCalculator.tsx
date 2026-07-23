'use client'

// Composition shell for the tax calculator. State lives in useTaxScenario;
// the sub-components are purely presentational.

import ScenarioPicker from './ScenarioPicker'
import ScenarioForm from './ScenarioForm'
import WhatIfSlider from './WhatIfSlider'
import FullResultPanel from './FullResultPanel'
import LegacyResultPanel from './LegacyResultPanel'
import { useTaxScenario } from './useTaxScenario'

export default function TaxCalculator() {
  const s = useTaxScenario()

  return (
    <div style={{ maxWidth: '820px', margin: '0 auto' }}>
      <ScenarioPicker
        scenario={s.scenario}
        setScenario={s.setScenario}
        taxRegion={s.taxRegion}
        setTaxRegion={s.setTaxRegion}
      />

      {s.scenario !== 'welfare' && (
        <WhatIfSlider income={s.sliderIncome} onChange={s.applySlider} />
      )}

      <ScenarioForm
        scenario={s.scenario}
        grossRevenue={s.grossRevenue}
        setGrossRevenue={s.setGrossRevenue}
        allowableExpenses={s.allowableExpenses}
        setAllowableExpenses={s.setAllowableExpenses}
        pensionContribution={s.pensionContribution}
        setPensionContribution={s.setPensionContribution}
        dirSalary={s.dirSalary}
        setDirSalary={s.setDirSalary}
        dirDividends={s.dirDividends}
        setDirDividends={s.setDirDividends}
        s3={s.s3}
        setS3={s.setS3}
        s4={s.s4}
        setS4={s.setS4}
        studentLoanPlan={s.studentLoanPlan}
        setStudentLoanPlan={s.setStudentLoanPlan}
        marriageAllowance={s.marriageAllowance}
        setMarriageAllowance={s.setMarriageAllowance}
        blindPersonsAllowance={s.blindPersonsAllowance}
        setBlindPersonsAllowance={s.setBlindPersonsAllowance}
        voluntaryClass2NI={s.voluntaryClass2NI}
        setVoluntaryClass2NI={s.setVoluntaryClass2NI}
      />

      {s.fullResult && (
        <FullResultPanel
          result={s.fullResult}
          showMonthly={s.showMonthly}
          setShowMonthly={s.setShowMonthly}
        />
      )}
      {s.legacyResult && <LegacyResultPanel result={s.legacyResult} />}
    </div>
  )
}
