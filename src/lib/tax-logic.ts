export interface TaxInput {
  grossIncome: number;
  employmentType: 'self-employed' | 'employed' | 'both';
  studentLoanPlan: 'none' | 'plan1' | 'plan2' | 'plan4' | 'plan5' | 'postgraduate';
  voluntaryClass2NI: boolean;
}

export interface TaxResult {
  grossIncome: number;
  personalAllowance: number;
  taxableIncome: number;
  incomeTax: number;
  niClass4: number;
  niClass2: number;
  studentLoanRepayment: number;
  totalDeductions: number;
  netTakeHome: number;
  effectiveTaxRate: number;
}

// 2026/27 tax year figures
const PA_BASE = 12570;
const BASIC_RATE_LIMIT = 50270;
const HIGHER_RATE_LIMIT = 125140;
const PA_TAPER_START = 100000;

const NI_CLASS4_LOWER = 12570;
const NI_CLASS4_UPPER = 50270;
const NI_CLASS4_MAIN_RATE = 0.06;
const NI_CLASS4_UPPER_RATE = 0.02;
const NI_CLASS2_WEEKLY = 3.65;
const NI_CLASS2_THRESHOLD = 6845;

const STUDENT_LOAN_THRESHOLDS: Record<string, { threshold: number; rate: number }> = {
  plan1: { threshold: 26900, rate: 0.09 },
  plan2: { threshold: 29385, rate: 0.09 },
  plan4: { threshold: 33795, rate: 0.09 },
  plan5: { threshold: 25000, rate: 0.09 },
  postgraduate: { threshold: 21000, rate: 0.06 },
};

function calcPersonalAllowance(grossIncome: number): number {
  if (grossIncome <= PA_TAPER_START) return PA_BASE;
  const excess = grossIncome - PA_TAPER_START;
  const reduction = Math.floor(excess / 2);
  return Math.max(0, PA_BASE - reduction);
}

function calcIncomeTax(taxableIncome: number): number {
  if (taxableIncome <= 0) return 0;
  let tax = 0;
  const basicBand = BASIC_RATE_LIMIT - PA_BASE;
  const higherBand = HIGHER_RATE_LIMIT - BASIC_RATE_LIMIT;

  if (taxableIncome <= basicBand) {
    tax = taxableIncome * 0.20;
  } else if (taxableIncome <= basicBand + higherBand) {
    tax = basicBand * 0.20 + (taxableIncome - basicBand) * 0.40;
  } else {
    tax = basicBand * 0.20 + higherBand * 0.40 + (taxableIncome - basicBand - higherBand) * 0.45;
  }
  return Math.max(0, tax);
}

function calcNIClass4(grossIncome: number): number {
  if (grossIncome <= NI_CLASS4_LOWER) return 0;
  let ni = 0;
  if (grossIncome <= NI_CLASS4_UPPER) {
    ni = (grossIncome - NI_CLASS4_LOWER) * NI_CLASS4_MAIN_RATE;
  } else {
    ni = (NI_CLASS4_UPPER - NI_CLASS4_LOWER) * NI_CLASS4_MAIN_RATE +
         (grossIncome - NI_CLASS4_UPPER) * NI_CLASS4_UPPER_RATE;
  }
  return ni;
}

function calcStudentLoan(grossIncome: number, plan: string): number {
  if (plan === 'none') return 0;
  const config = STUDENT_LOAN_THRESHOLDS[plan];
  if (!config) return 0;
  const repayable = Math.max(0, grossIncome - config.threshold);
  return repayable * config.rate;
}

export function calculateTax(input: TaxInput): TaxResult {
  const { grossIncome, employmentType, studentLoanPlan, voluntaryClass2NI } = input;

  const personalAllowance = calcPersonalAllowance(grossIncome);
  const taxableIncome = Math.max(0, grossIncome - personalAllowance);
  const incomeTax = calcIncomeTax(taxableIncome);

  const isSelfEmployed = employmentType === 'self-employed' || employmentType === 'both';
  const niClass4 = isSelfEmployed ? calcNIClass4(grossIncome) : 0;
  const niClass2 = isSelfEmployed && voluntaryClass2NI && grossIncome < NI_CLASS2_THRESHOLD
    ? NI_CLASS2_WEEKLY * 52
    : 0;

  const studentLoanRepayment = calcStudentLoan(grossIncome, studentLoanPlan);

  const totalDeductions = incomeTax + niClass4 + niClass2 + studentLoanRepayment;
  const netTakeHome = Math.max(0, grossIncome - totalDeductions);
  const effectiveTaxRate = grossIncome > 0 ? (totalDeductions / grossIncome) * 100 : 0;

  return {
    grossIncome,
    personalAllowance,
    taxableIncome,
    incomeTax,
    niClass4,
    niClass2,
    studentLoanRepayment,
    totalDeductions,
    netTakeHome,
    effectiveTaxRate,
  };
}
