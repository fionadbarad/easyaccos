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

  // UK personal allowance 2026/27
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
  // 2026/27 rUK bands (taxable income = gross minus personal allowance)
  const BASIC_WIDTH   = 37_700   // 20%: taxable income £0–£37,700  (gross £12,571–£50,270)
  const HIGHER_LIMIT  = 112_570  // 40%: taxable income £37,701–£112,570 (gross £50,271–£125,140)
  //                              // 45%: taxable income above £112,570   (gross above £125,140)

  const lowerBand      = Math.min(taxableIncome, BASIC_WIDTH)
  const higherBand     = Math.max(0, Math.min(taxableIncome - BASIC_WIDTH, HIGHER_LIMIT - BASIC_WIDTH))
  const additionalBand = Math.max(0, taxableIncome - HIGHER_LIMIT)

  const basicTax      = lowerBand * 0.20
  const higherTax     = higherBand * 0.40
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
