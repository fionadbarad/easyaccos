export type TaxResult = {
  grossIncome: number
  expenses: number
  taxableIncome: number
  personalAllowance: number
  taxDue: number
  effectiveRate: number
}

export function getTaxableIncome(income: number, expenses: number) {
  const grossIncome = Math.max(0, income)
  const totalExpenses = Math.max(0, expenses)
  const taxableBeforeAllowance = Math.max(0, grossIncome - totalExpenses)

  // UK personal allowance (2024/25) basic fixed value
  const PERSONAL_ALLOWANCE = 12570

  const taxableIncome = Math.max(0, taxableBeforeAllowance - PERSONAL_ALLOWANCE)

  return {
    grossIncome,
    expenses: totalExpenses,
    personalAllowance: PERSONAL_ALLOWANCE,
    taxableIncome,
  }
}

export function estimateTax(taxableIncome: number) {
  const lowerBand = Math.min(taxableIncome, 50270)
  const higherBand = Math.max(0, Math.min(taxableIncome - 50270, 100000 - 50270))
  const additionalBand = Math.max(0, taxableIncome - 100000)

  const basicTax = lowerBand * 0.20
  const higherTax = higherBand * 0.40
  const additionalTax = additionalBand * 0.45

  const taxDue = Number((basicTax + higherTax + additionalTax).toFixed(2))

  return { taxDue }
}

export function calculateTax(income: number, expenses: number): TaxResult {
  const { grossIncome, expenses: totalExpenses, personalAllowance, taxableIncome } = getTaxableIncome(income, expenses)
  const { taxDue } = estimateTax(taxableIncome)

  return {
    grossIncome,
    expenses: totalExpenses,
    taxableIncome,
    personalAllowance,
    taxDue,
    effectiveRate: grossIncome > 0 ? Number(((taxDue / grossIncome) * 100).toFixed(2)) : 0,
  }
}
