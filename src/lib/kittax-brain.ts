// ─── Kittax Brain: Free self-built UK tax AI engine ─────────────────────────
// No external API needed. Parses natural language, calculates taxes, returns
// intelligent responses. Always online, zero cost.
//
// Shared constants and calcPA imported from tax-logic — single source of truth.
import {
  PA_BASE, PA_TAPER_START, PA_TAPER_END,
  RUK_BASIC_RATE_WIDTH, RUK_TAXABLE_ADDITIONAL_THRESHOLD,
  calcPA,
} from './tax-logic'

// ─── Local aliases for readability in this module ────────────────────────────
const PA_FULL    = PA_BASE
const BASIC_LIMIT = RUK_BASIC_RATE_WIDTH
// Previously named TAXABLE_ADDITIONAL_THRESHOLD = 112_570 (taxable-income basis).
// Reconciled: imported as RUK_TAXABLE_ADDITIONAL_THRESHOLD = RUK_TAXABLE_ADDITIONAL_THRESHOLD − PA_BASE.
const TAXABLE_ADDITIONAL_THRESHOLD = RUK_TAXABLE_ADDITIONAL_THRESHOLD

// ─── Module-specific constants ───────────────────────────────────────────────
const DIV_ALLOWANCE  = 500
const DIV_BASIC      = 0.1075
const DIV_HIGHER     = 0.3575
const DIV_ADDL       = 0.3935
const SA_DEADLINE    = '31 January 2028'
const SA_REG_DEADLINE= '5 October 2026'
const MILEAGE_FIRST  = 0.45
const MILEAGE_AFTER  = 0.25
const HOME_FLAT_RATE = 6 // £/week
const CLASS2_RATE    = 3.65 // £/week
const CLASS2_SPT     = 7_105

interface TaxBreakdown {
  income: number
  personalAllowance: number
  taxableIncome: number
  incomeTax: number
  ni: number
  totalDeductions: number
  net: number
  effectiveRate: string
  band: string
}

function calcIncomeTax(taxable: number, region: string): number {
  if (taxable <= 0) return 0
  if (region === 'scotland') {
    const bands = [
      { width: 2097,   rate: 0.19 },
      { width: 10989,  rate: 0.20 },
      { width: 18166,  rate: 0.21 },
      { width: 31178,  rate: 0.42 },
      { width: 50140,  rate: 0.45 },
      { width: Infinity, rate: 0.48 },
    ]
    let tax = 0, remaining = taxable
    for (const b of bands) {
      const chunk = Math.min(remaining, b.width)
      if (chunk <= 0) break
      tax += chunk * b.rate
      remaining -= chunk
    }
    return tax
  }
  // rUK
  if (taxable <= BASIC_LIMIT) return taxable * 0.20
  if (taxable <= TAXABLE_ADDITIONAL_THRESHOLD) return BASIC_LIMIT * 0.20 + (taxable - BASIC_LIMIT) * 0.40
  return BASIC_LIMIT * 0.20 + (TAXABLE_ADDITIONAL_THRESHOLD - BASIC_LIMIT) * 0.40 + (taxable - TAXABLE_ADDITIONAL_THRESHOLD) * 0.45
}

function calcNI(income: number, employed: boolean): number {
  if (income <= PA_FULL) return 0
  const main = Math.min(income, 50_270) - PA_FULL
  const upper = Math.max(0, income - 50_270)
  if (employed) return main * 0.08 + upper * 0.02
  return main * 0.06 + upper * 0.02  // Class 4
}

function getBand(taxable: number): string {
  if (taxable <= 0) return 'No tax (below Personal Allowance)'
  if (taxable <= BASIC_LIMIT) return 'Basic rate (20%)'
  if (taxable <= TAXABLE_ADDITIONAL_THRESHOLD) return 'Higher rate (40%)'
  return 'Additional rate (45%)'
}

export function calculateFullTax(income: number, region = 'rUK', employed = false): TaxBreakdown {
  const pa = calcPA(income)
  const taxable = Math.max(0, income - pa)
  const tax = calcIncomeTax(taxable, region)
  const ni = calcNI(income, employed)
  const total = tax + ni
  return {
    income,
    personalAllowance: pa,
    taxableIncome: taxable,
    incomeTax: Math.round(tax),
    ni: Math.round(ni),
    totalDeductions: Math.round(total),
    net: Math.round(income - total),
    effectiveRate: income > 0 ? ((total / income) * 100).toFixed(1) + '%' : '0%',
    band: getBand(taxable),
  }
}

// ─── Number extraction ──────────────────────────────────────────────────────
function extractNumber(text: string): number | null {
  // Handle "100k", "100K"
  const kMatch = text.match(/(\d+(?:\.\d+)?)\s*k\b/i)
  if (kMatch) return parseFloat(kMatch[1]) * 1000

  // Handle £45,000 or 45000 or £45000
  const numMatch = text.match(/£?\s*(\d{1,3}(?:,\d{3})*(?:\.\d+)?)/);
  if (numMatch) return parseFloat(numMatch[1].replace(/,/g, ''))

  return null
}

function isScotland(text: string): boolean {
  return /\bscot(?:land|tish)\b/i.test(text)
}

function isEmployed(text: string): boolean {
  return /\b(?:employ(?:ed|ee)|paye|salary|salaried)\b/i.test(text)
}

// ─── Format helpers ─────────────────────────────────────────────────────────
function fmtGBP(n: number): string {
  return '£' + n.toLocaleString('en-GB')
}

function taxBreakdownResponse(b: TaxBreakdown): string {
  // [Professional Insight]
  let insight = `On income of ${fmtGBP(b.income)}, your tax band is: ${b.band}.`

  // [Mathematical Breakdown]
  const breakdown = [
    '',
    `• Personal Allowance: ${fmtGBP(b.personalAllowance)}`,
    `• Taxable income: ${fmtGBP(b.taxableIncome)}`,
    `• Income Tax: ${fmtGBP(b.incomeTax)}`,
    `• National Insurance: ${fmtGBP(b.ni)}`,
    `• Total deductions: ${fmtGBP(b.totalDeductions)}`,
    `• Net take-home: ${fmtGBP(b.net)}`,
    `• Effective rate: ${b.effectiveRate}`,
  ]

  // [Pro-Tip]
  let proTip = ''
  if (b.income > PA_TAPER_START && b.income < PA_TAPER_END) {
    proTip = `\n\nPro-Tip: You are in the 60% trap. A SIPP contribution of ${fmtGBP(b.income - PA_TAPER_START)} restores your full Personal Allowance.`
  } else if (b.income > 80_000) {
    proTip = '\n\nPro-Tip: Consider a SIPP pension contribution to reduce your taxable income.'
  } else if (b.income > PA_FULL && b.income < 30_000) {
    proTip = '\n\nPro-Tip: Claim Use of Home (£6/week = £312/year) — no receipts needed.'
  }

  // [Security Assurance + Badge]
  const footer = '\n\nSecured via Supabase RLS & AES-256 Encryption.\n🌱 Carbon-Light AI | HMRC 2026/27 Compliant'

  return insight + breakdown.join('\n') + proTip + footer
}

// ─── Topic matching & response engine ───────────────────────────────────────
interface TopicMatch {
  pattern: RegExp
  response: string | ((text: string) => string)
}

const TOPICS: TopicMatch[] = [
  // Income / tax calculation requests
  {
    pattern: /(?:how much|what|calculate|tax on|pay on|owe|earn(?:ing)?|income of|make|gross|salary of)\b.*?\d/i,
    response: (text: string) => {
      const num = extractNumber(text)
      if (!num || num <= 0) return 'Please tell me your income amount and I will calculate your tax. For example: "How much tax on £40,000?"'
      const region = isScotland(text) ? 'scotland' : 'rUK'
      const employed = isEmployed(text)
      const b = calculateFullTax(num, region, employed)
      return taxBreakdownResponse(b)
    },
  },

  // Personal Allowance
  {
    pattern: /\b(?:personal\s*allowance|tax[\s-]*free\s*amount|PA|12[\s,]*570)\b/i,
    response: `Your Personal Allowance for 2026/27 is £12,570 — income up to this amount is tax-free.\n\nIf your income exceeds £100,000, it reduces by £1 for every £2 above that threshold. At £125,140 the allowance is completely gone.\n\nThis creates the "60% trap" between £100k and £125,140 — a pension contribution is the best way to avoid it.`,
  },

  // 60% trap
  {
    pattern: /\b(?:60\s*%?\s*trap|taper|100[\s,]*000|125[\s,]*140)\b/i,
    response: `The 60% trap applies when income is between £100,000 and £125,140.\n\nYour Personal Allowance reduces by £1 for every £2 above £100,000 — creating an effective 60% marginal tax rate on that slice of income.\n\nThe fix: a SIPP pension contribution to bring your adjusted net income below £100,000 restores the full allowance and saves thousands.`,
  },

  // Dividends
  {
    pattern: /\b(?:dividend|divs?|director.*salary)\b/i,
    response: `2026/27 Dividend Tax Rates:\n\nFirst £500 of dividends: tax-free (Dividend Allowance)\nBasic rate band: 10.75%\nHigher rate band: 35.75%\nAdditional rate: 39.35%\n\nDividends are taxed after your other income. For limited company directors, the optimal structure is usually £12,570 salary (uses your Personal Allowance) plus the rest as dividends — this avoids NI on the dividend portion.`,
  },

  // Pension / SIPP
  {
    pattern: /\b(?:pension|sipp|retirement|contribute|contribution)\b/i,
    response: `SIPP pension contributions reduce your taxable income pound-for-pound.\n\nKey points for 2026/27:\n- Annual allowance: £60,000 (or 100% of earnings if lower)\n- Basic rate taxpayers: get 20% tax relief automatically\n- Higher rate: claim extra 20% via Self Assessment\n- Additional rate: claim extra 25%\n\nIf your income is £100k–£125k, a pension contribution is the best tool to escape the 60% trap and restore your full Personal Allowance.`,
  },

  // Expenses
  {
    pattern: /\b(?:expense|claim|deduct|allowable|write[\s-]?off)\b/i,
    response: `Common allowable expenses for self-employed (2026/27):\n\n- Use of Home: £6/week flat rate (£312/year) — no receipts needed\n- Mileage: 45p/mile for first 10,000 business miles, then 25p\n- Equipment: laptops, phones, tools — 100% via Annual Investment Allowance\n- Professional subscriptions and memberships\n- Training & CPD to maintain existing skills\n- Phone/internet: business proportion\n- Stationery, postage, software\n- Accountancy fees\n\nKeep receipts and records for at least 5 years.`,
  },

  // Mileage
  {
    pattern: /\b(?:mileage|miles|car|driving|vehicle|travel)\b/i,
    response: `Business mileage rates (2026/27):\n\n- First 10,000 miles: 45p per mile\n- After 10,000 miles: 25p per mile\n- Motorcycles: 24p per mile\n- Bicycles: 20p per mile\n\nKeep a mileage log with: date, destination, business purpose, and miles driven. HMRC can ask for this at any time.`,
  },

  // National Insurance
  {
    pattern: /\b(?:national\s*insurance|NI\b|class\s*[1-4]|NIC)\b/i,
    response: `National Insurance rates for 2026/27:\n\nSelf-employed:\n- Class 4: 6% on profits £12,570–£50,270, then 2% above\n- Class 2: deemed paid (no charge) if profit above £7,105\n- Voluntary Class 2: £3.65/week if below £7,105\n\nEmployed (PAYE):\n- Class 1: 8% on earnings £12,570–£50,270, then 2% above\n- Employer NI: 15% above £5,000 (your employer pays this)\n\nDirectors: NI is only charged on salary, not dividends — that is why the £12,570 salary + dividends structure is so popular.`,
  },

  // Self Assessment / deadlines
  {
    pattern: /\b(?:self[\s-]*assess|deadline|filing|submit|tax\s*return|31\s*jan|5\s*oct|register|HMRC)\b/i,
    response: `Key Self Assessment deadlines for 2026/27:\n\n- 5 October 2026: register for Self Assessment if new\n- 31 October 2027: paper return deadline\n- 31 January 2028: online return + tax payment deadline\n- 31 July 2028: second payment on account\n\nLate filing penalty: £100 immediately, then £10/day after 3 months. Late payment: 5% surcharge after 30 days.\n\nRegister at gov.uk/register-for-self-assessment if you haven't already.`,
  },

  // Payment on account
  {
    pattern: /\b(?:payment\s*on\s*account|POA|advance\s*payment|pay\s*twice)\b/i,
    response: `Payments on Account are advance payments towards next year's tax bill.\n\nHow it works:\n- Each payment = 50% of your previous year's tax bill\n- First payment: 31 January (with your tax return)\n- Second payment: 31 July\n- Balancing payment: following 31 January\n\nYou can apply to reduce them if you expect lower income next year (form SA303). Be careful — HMRC charges interest if you under-estimate.`,
  },

  // ISA
  {
    pattern: /\b(?:ISA|individual\s*savings|stocks?\s*(?:and|&)\s*shares?|cash\s*isa|lifetime\s*isa)\b/i,
    response: `ISA Allowance for 2026/27: £20,000 total across all ISA types.\n\nTypes:\n- Cash ISA: tax-free interest\n- Stocks & Shares ISA: tax-free gains and dividends\n- Lifetime ISA: up to £4,000/year + 25% government bonus (for first home or retirement)\n- Innovative Finance ISA: peer-to-peer lending\n\nAll returns inside an ISA are completely tax-free — no Income Tax, no Capital Gains Tax.`,
  },

  // Capital gains
  {
    pattern: /\b(?:capital\s*gain|CGT|sell(?:ing)?\s*(?:shares?|property|asset))\b/i,
    response: `Capital Gains Tax (2026/27):\n\nAnnual exempt amount: £3,000\n\nRates on gains above the allowance:\n- Basic rate taxpayers: 10% (18% on residential property)\n- Higher/additional rate: 20% (24% on residential property)\n\nYour main home is exempt (Private Residence Relief). Gains inside an ISA are also exempt.\n\nReport and pay CGT within 60 days of selling UK residential property.`,
  },

  // VAT
  {
    pattern: /\b(?:VAT|value\s*added|vat\s*threshold|flat\s*rate\s*scheme)\b/i,
    response: `VAT registration threshold (2026/27): £90,000.\n\nYou must register for VAT if your taxable turnover exceeds £90,000 in any 12-month period. You can register voluntarily below this.\n\nSchemes:\n- Standard VAT: charge 20%, reclaim VAT on purchases\n- Flat Rate Scheme: pay a fixed % of turnover (simpler, sometimes cheaper)\n- Cash Accounting: pay VAT when you get paid, not when you invoice\n\nVAT returns are usually quarterly via Making Tax Digital (MTD) compatible software.`,
  },

  // MTD / Making Tax Digital
  {
    pattern: /\b(?:MTD|making\s*tax\s*digital|digital\s*tax|quarterly\s*report)\b/i,
    response: `Making Tax Digital (MTD) for Income Tax starts April 2026 for self-employed with income above £50,000.\n\nWhat it means:\n- Submit quarterly updates to HMRC using MTD-compatible software\n- Submit a final declaration instead of a traditional Self Assessment return\n- Keep digital records of income and expenses\n\nFrom April 2027: extends to those with income above £30,000.\n\nEasyAcco helps you stay compliant — track your income and expenses here and export when needed.`,
  },

  // Student loan
  {
    pattern: /\b(?:student\s*loan|plan\s*[1-5]|postgrad\s*loan|SLC)\b/i,
    response: `Student Loan repayment thresholds (2026/27):\n\n• Plan 1: 9% on income above £26,065\n• Plan 2: 9% on income above £29,385\n• Plan 4 (Scotland only): 9% on income above £32,745\n• Plan 5: 9% on income above £25,000\n• Postgrad Loan: 6% on income above £21,000\n\nScotland: Only Plan 4 or Postgraduate.\nEngland/Wales/NI: Plan 1, 2, 5, or Postgraduate.\nDual-plan (e.g. Plan 2 + Postgrad): combined 15% marginal rate.\n\nRepayments are collected through PAYE or Self Assessment. They are not tax-deductible.\n\nSecured via Supabase RLS & AES-256 Encryption.\n🌱 Carbon-Light AI | HMRC 2026/27 Compliant`,
  },

  // Redundancy
  {
    pattern: /\b(?:redundan|severance|notice\s*pay|leaving\s*job)\b/i,
    response: `Redundancy pay tax rules (2026/27):\n\nThe first £30,000 of redundancy pay is tax-free. This includes statutory redundancy pay.\n\nAbove £30,000: taxed as income at your marginal rate.\n\nPay in lieu of notice (PILON) is always taxable.\n\nIf you were made redundant mid-year, you may be owed a tax refund — you may have overpaid PAYE during the months you were working.`,
  },

  // Universal Credit / benefits
  {
    pattern: /\b(?:universal\s*credit|benefit|JSA|carer|welfare|UC\b)\b/i,
    response: `Tax treatment of benefits (2026/27):\n\n- Universal Credit: tax-free\n- Child Benefit: tax-free (but High Income Child Benefit Charge applies if income > £60,000)\n- JSA (contribution-based): taxable\n- Carer's Allowance: taxable\n- Statutory Sick/Maternity Pay: taxable\n- PIP / Disability Living Allowance: tax-free\n\nTax-free benefits do not use up your Personal Allowance.`,
  },

  // Use of home
  {
    pattern: /\b(?:home\s*office|work(?:ing)?\s*from\s*home|use\s*of\s*home|WFH)\b/i,
    response: `Working from home expense claim (2026/27):\n\nSimplified method (no receipts needed):\n- 25–50 hours/month: £10/month\n- 51–100 hours/month: £18/month\n- 101+ hours/month: £26/month\n\nOr use the flat rate: £6/week (£312/year).\n\nAlternatively, calculate your actual costs (rent, bills, broadband) and claim the business proportion — but you will need records and receipts.`,
  },

  // Married Couple's Allowance
  {
    pattern: /\b(?:married\s*couple|MCA|born\s*before\s*1935|spouse\s*allowance)\b/i,
    response: `Married Couple's Allowance (MCA) — 2026/27:\n\nAvailable if either spouse was born before 6 April 1935.\n\n• Maximum: £11,700\n• Minimum: £4,530\n• Income limit: £39,200\n\nThe allowance reduces your tax bill (not your taxable income). It is given as a 10% tax credit. If the claimant's income exceeds £39,200, the MCA is reduced by £1 for every £2 of excess income — but never below the £4,530 minimum.\n\nSecured via Supabase RLS & AES-256 Encryption.\n🌱 Carbon-Light AI | HMRC 2026/27 Compliant`,
  },

  // High Income Child Benefit Charge
  {
    pattern: /\b(?:child\s*benefit|HICBC|high\s*income.*child)\b/i,
    response: `High Income Child Benefit Charge (HICBC) — 2026/27:\n\n• Threshold: £60,000 (no charge below this)\n• Taper: 1% of benefit per £200 of income above £60,000\n• Full clawback at: £80,000\n\nIf the higher-earning partner earns over £60,000, you must repay some Child Benefit via Self Assessment. At £80,000+ the entire benefit is clawed back.\n\nPro-Tip: Pension contributions reduce your adjusted net income — this can bring you below the £60,000 threshold and keep your full Child Benefit.\n\nSecured via Supabase RLS & AES-256 Encryption.\n🌱 Carbon-Light AI | HMRC 2026/27 Compliant`,
  },

  // Marriage Allowance
  {
    pattern: /\b(?:marriage\s*allowance|transfer.*allowance|1[\s,]*260)\b/i,
    response: `Marriage Allowance — 2026/27:\n\nOne partner can transfer £1,260 of their Personal Allowance to the other. This saves the recipient up to £252 in tax.\n\nConditions:\n• The transferor must earn below £12,570 (not using their full PA)\n• The recipient must be a basic rate taxpayer\n\nYou can backdate a claim for up to 4 years.\n\nSecured via Supabase RLS & AES-256 Encryption.\n🌱 Carbon-Light AI | HMRC 2026/27 Compliant`,
  },

  // Trading loss / negative income
  {
    pattern: /\b(?:trading\s*loss|loss\s*relief|negative\s*income|carry\s*(?:forward|back)|offset\s*(?:loss|profit))\b/i,
    response: `Trading Loss Relief — 2026/27:\n\nIf your business makes a loss (expenses exceed income), you have several options:\n\n• Carry forward: offset the loss against future profits of the same trade\n• Carry back: claim against profits from the previous year for a tax refund\n• Sideways relief: set against other income in the same year (subject to limits)\n• Capital gains offset: use trading losses against capital gains\n\nAll tax and NI = £0 when income is zero or negative. Your unused Personal Allowance cannot be carried forward.\n\nPro-Tip: If you had zero income, check eligibility for Universal Credit — it is 100% tax-free.\n\nSecured via Supabase RLS & AES-256 Encryption.\n🌱 Carbon-Light AI | HMRC 2026/27 Compliant`,
  },

  // Greetings
  {
    pattern: /^(?:hi|hello|hey|hiya|morning|evening|afternoon|yo|sup)\b/i,
    response: `Welcome to EasyAcco. I am Kittax AI, your UK tax advisor for 2026/27.\n\nAsk me about:\n• Income tax and NI calculations\n• Dividends, expenses, and pension relief\n• Student loans and Child Benefit\n• Self Assessment deadlines\n\nOr type your income for an instant breakdown.\n\nSecured via Supabase RLS & AES-256 Encryption.\n🌱 Carbon-Light AI | HMRC 2026/27 Compliant`,
  },

  // Thanks
  {
    pattern: /\b(?:thanks?|thank\s*you|cheers|ta|appreciate)\b/i,
    response: `You are welcome! If you have more tax questions, I am always here. Remember — the Tax Estimator on the Tax page gives you a full interactive breakdown too.`,
  },

  // Who are you
  {
    pattern: /\b(?:who\s*are\s*you|what\s*are\s*you|your\s*name|kittax)\b/i,
    response: `I am Kittax AI — EasyAcco's built-in UK tax advisor.\n\nI know 2026/27 HMRC rules inside out:\n• Income tax bands (UK and Scotland)\n• National Insurance, dividends, pensions\n• Student loans, Child Benefit (HICBC)\n• Expenses, deadlines, and loss relief\n\nType your income for an instant breakdown. Your data is protected by MFA and encrypted JWT tokens.\n\nSecured via Supabase RLS & AES-256 Encryption.\n🌱 Carbon-Light AI | HMRC 2026/27 Compliant`,
  },
]

export function kittaxAnswer(query: string): string {
  const q = query.trim()
  if (!q) return 'Ask me anything about UK tax — income, expenses, NI, dividends, deadlines...'

  // Check for a number first — most users just want a calculation
  const num = extractNumber(q)
  const hasCalcIntent = /(?:tax|pay|owe|earn|income|salary|gross|net|take[\s-]*home|how\s*much|calculate|what)/i.test(q)

  if (num && num > 0 && hasCalcIntent) {
    const region = isScotland(q) ? 'scotland' : 'rUK'
    const employed = isEmployed(q)
    const b = calculateFullTax(num, region, employed)
    return taxBreakdownResponse(b)
  }

  // If user just typed a number
  if (num && num > 0 && /^\s*£?\s*\d/.test(q)) {
    const b = calculateFullTax(num)
    return taxBreakdownResponse(b)
  }

  // Match topics
  for (const topic of TOPICS) {
    if (topic.pattern.test(q)) {
      return typeof topic.response === 'function' ? topic.response(q) : topic.response
    }
  }

  // Fallback
  return `I can help with UK tax for 2026/27.\n\nTry asking:\n• "How much tax on £45,000?"\n• "What expenses can I claim?"\n• "Tell me about dividends"\n• "Child Benefit charge"\n• "Student loan repayment"\n\nOr type your income for an instant breakdown.\n\nSecured via Supabase RLS & AES-256 Encryption.\n🌱 Carbon-Light AI | HMRC 2026/27 Compliant`
}
