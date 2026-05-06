'use client'

// Per-scenario input form. Each `scenario === 'xxx'` branch renders the fields
// relevant to that journey. The Additional Options block (student loan,
// marriage, blind-persons, voluntary Class 2) is shown only for the three
// full-engine scenarios that calculateTax actually honours those flags for.

import { motion, AnimatePresence } from 'framer-motion'
import { Info } from 'lucide-react'
import {
  STUDENT_LOAN_LABELS,
  type StudentLoanPlan,
} from '@/lib/tax-logic'
import type { S3Input, S4Input } from '@/lib/TaxBible2026'
import { fmt } from './tokens'
import { Field, NumInput, Toggle } from './primitives'
import { SCENARIOS, type ScenarioKey, isFullEngineScenario } from './scenarios'

export interface ScenarioFormProps {
  scenario: ScenarioKey
  // employed + self-employed
  grossRevenue: number;        setGrossRevenue: (v: number) => void
  allowableExpenses: number;   setAllowableExpenses: (v: number) => void
  pensionContribution: number; setPensionContribution: (v: number) => void
  // director
  dirSalary: number;           setDirSalary: (v: number) => void
  dirDividends: number;        setDirDividends: (v: number) => void
  // welfare + jobloss
  s3: S3Input;                 setS3: (u: (prev: S3Input) => S3Input) => void
  s4: S4Input;                 setS4: (u: (prev: S4Input) => S4Input) => void
  // additional options
  studentLoanPlan: StudentLoanPlan;  setStudentLoanPlan: (p: StudentLoanPlan) => void
  marriageAllowance: boolean;        setMarriageAllowance: (v: boolean) => void
  blindPersonsAllowance: boolean;    setBlindPersonsAllowance: (v: boolean) => void
  voluntaryClass2NI: boolean;        setVoluntaryClass2NI: (v: boolean) => void
}

export default function ScenarioForm(p: ScenarioFormProps) {
  const meta = SCENARIOS.find(s => s.key === p.scenario)
  const fullEngine = isFullEngineScenario(p.scenario)

  return (
    <>
      <AnimatePresence mode="wait">
        <motion.div key={p.scenario}
          initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}
          transition={{ duration: 0.2 }}
          className="bg-[var(--sa-surface)] border border-[var(--sa-border)] rounded-[10px] p-6 mb-6">

          <h3 className="text-[var(--sa-white)] text-[1.1rem] font-bold mb-5">
            {meta?.icon}{' '}{meta?.label} Details
          </h3>

          <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">

            {p.scenario === 'employed' && <>
              <Field label="Gross Salary (£)">
                <NumInput value={p.grossRevenue} onChange={p.setGrossRevenue} />
              </Field>
              <Field label="Pension Contribution (£)"
                hint={<p className="text-[#93C5FD] text-[0.71rem]"><Info size={11} className="inline mr-[3px]" />Reduces taxable income at your marginal rate</p>}>
                <NumInput value={p.pensionContribution} onChange={p.setPensionContribution} max={60_000} />
              </Field>
            </>}

            {p.scenario === 'self-employed' && <>
              <Field label="Gross Revenue (£)">
                <NumInput value={p.grossRevenue} onChange={p.setGrossRevenue} />
              </Field>
              <Field label="Allowable Expenses (£)">
                <NumInput value={p.allowableExpenses} onChange={p.setAllowableExpenses} />
              </Field>
              <Field label="Pension Contribution (£)">
                <NumInput value={p.pensionContribution} onChange={p.setPensionContribution} max={60_000} />
              </Field>
            </>}

            {p.scenario === 'director' && <>
              <Field label="Director Salary (£)"
                hint={<p className={`text-[0.71rem] ${p.dirSalary === 12_570 ? 'text-[#4ADE80]' : 'text-[#93C5FD]'}`}>
                  {p.dirSalary === 12_570 ? '✓ Optimal — no NI, full State Pension credit' : `Recommended: ${fmt(12_570)}`}
                </p>}>
                <NumInput value={p.dirSalary} onChange={p.setDirSalary} />
              </Field>
              <Field label="Dividend Income (£)">
                <NumInput value={p.dirDividends} onChange={p.setDirDividends} />
              </Field>
              <Field label="Pension Contribution (£)">
                <NumInput value={p.pensionContribution} onChange={p.setPensionContribution} max={60_000} />
              </Field>
            </>}

            {p.scenario === 'welfare' && <>
              <Field label="Universal Credit / month (£)"
                hint={<p className="text-[#4ADE80] text-[0.71rem]">✓ Tax-free — won&apos;t affect allowance</p>}>
                <NumInput value={p.s3.universalCredit} onChange={(v) => p.setS3(prev => ({ ...prev, universalCredit: v }))} />
              </Field>
              <Field label="JSA (annual, taxable £)">
                <NumInput value={p.s3.jsaAmount} onChange={(v) => p.setS3(prev => ({ ...prev, jsaAmount: v }))} />
              </Field>
              <Field label="Carer&apos;s Allowance (annual £)">
                <NumInput value={p.s3.carersAllowance} onChange={(v) => p.setS3(prev => ({ ...prev, carersAllowance: v }))} />
              </Field>
              <Field label="Other Earned Income (£)">
                <NumInput value={p.s3.otherIncome} onChange={(v) => p.setS3(prev => ({ ...prev, otherIncome: v }))} />
              </Field>
            </>}

            {p.scenario === 'jobloss' && <>
              <Field label="Annual Salary (£)">
                <NumInput value={p.s4.annualSalary} onChange={(v) => p.setS4(prev => ({ ...prev, annualSalary: v }))} />
              </Field>
              <Field label="Months Worked This Year">
                <input type="range" min={1} max={12} step={1} value={p.s4.monthsWorked}
                  onChange={(e) => p.setS4(prev => ({ ...prev, monthsWorked: Number(e.target.value) }))}
                  className="w-full accent-[var(--sa-white)] min-h-[44px]" />
                <div className="text-[var(--sa-white)] text-[0.85rem] text-center">{p.s4.monthsWorked} months</div>
              </Field>
              <Field label="Total Redundancy Payment (£)"
                hint={<p className="text-[#4ADE80] text-[0.71rem]">✓ First £30,000 is tax-free</p>}>
                <NumInput value={p.s4.redundancyPayment} onChange={(v) => p.setS4(prev => ({ ...prev, redundancyPayment: v }))} />
              </Field>
              <Field label="PAYE Tax Already Paid (£)">
                <NumInput value={p.s4.paydeTaxPaid} onChange={(v) => p.setS4(prev => ({ ...prev, paydeTaxPaid: v }))} />
              </Field>
            </>}
          </div>
        </motion.div>
      </AnimatePresence>

      {fullEngine && (
        <div className="bg-[var(--sa-surface)] border border-[var(--sa-border)] rounded-[10px] p-6 mb-6">
          <h3 className="text-[var(--sa-white)] text-base font-bold mb-4">
            Additional Options
          </h3>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
            <Field label="Student Loan Plan">
              <select value={p.studentLoanPlan} onChange={(e) => p.setStudentLoanPlan(e.target.value as StudentLoanPlan)}
                className="w-full bg-[var(--sa-gray)] border border-[var(--sa-border)] rounded-md p-[10px_32px_10px_13px] text-[var(--sa-white)] text-[0.9rem] outline-none min-h-[44px] appearance-none cursor-pointer"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath d='M3 5l3 3 3-3' stroke='%23F4F5F8' stroke-width='1.5' fill='none'/%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 12px center',
                }}>
                {Object.entries(STUDENT_LOAN_LABELS).map(([key, label]) => (
                  <option key={key} value={key} className="bg-[var(--sa-gray)] text-[var(--sa-white)]">{label}</option>
                ))}
              </select>
            </Field>

            <div className="flex flex-col gap-2">
              <Toggle label="Marriage Allowance (−£1,260 PA)" active={p.marriageAllowance} onChange={p.setMarriageAllowance} />
              <Toggle label="Blind Person&apos;s Allowance (+£3,250)" active={p.blindPersonsAllowance} onChange={p.setBlindPersonsAllowance} />
              {p.scenario === 'self-employed' && (
                <Toggle label="Voluntary Class 2 NI (£3.65/wk)" active={p.voluntaryClass2NI} onChange={p.setVoluntaryClass2NI} />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
