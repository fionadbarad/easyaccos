// ─── Kittax Brain: Free self-built UK tax AI engine ─────────────────────────
// No external API needed. Parses natural language, calculates taxes, returns
// intelligent responses. Always online, zero cost.

// ─── 2026/27 Tax Constants ──────────────────────────────────────────────────
const PA_FULL        = 12_570
const PA_TAPER_START = 100_000
const PA_TAPER_END   = 125_140
const BASIC_LIMIT    = 37_700   // width of basic band (above PA)
const HIGHER_LIMIT   = 112_570  // taxable income threshold for additional
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

function calcPA(income: number): number {
  if (income <= PA_TAPER_START) return PA_FULL
  if (income >= PA_TAPER_END) return 0
  return Math.max(0, PA_FULL - Math.floor((income - PA_TAPER_START) / 2))
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
  if (taxable <= HIGHER_LIMIT) return BASIC_LIMIT * 0.20 + (taxable - BASIC_LIMIT) * 0.40
  return BASIC_LIMIT * 0.20 + (HIGHER_LIMIT - BASIC_LIMIT) * 0.40 + (taxable - HIGHER_LIMIT) * 0.45
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
  if (taxable <= HIGHER_LIMIT) return 'Higher rate (40%)'
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
  const lines = [
    `On income of ${fmtGBP(b.income)}:`,
    '',
    `Personal Allowance: ${fmtGBP(b.personalAllowance)}`,
    `Taxable income: ${fmtGBP(b.taxableIncome)}`,
    `Tax band: ${b.band}`,
    `Income Tax: ${fmtGBP(b.incomeTax)}`,
    `National Insurance: ${fmtGBP(b.ni)}`,
    `Total deductions: ${fmtGBP(b.totalDeductions)}`,
    `Net take-home: ${fmtGBP(b.net)}`,
    `Effective rate: ${b.effectiveRate}`,
  ]

  // Add contextual tips
  if (b.income > PA_TAPER_START && b.income < PA_TAPER_END) {
    lines.push('')
    lines.push(`You are in the 60% trap. A SIPP pension contribution of ${fmtGBP(b.income - PA_TAPER_START)} would restore your full Personal Allowance and save you significantly.`)
  } else if (b.income > 80_000) {
    lines.push('')
    lines.push('Consider a SIPP pension contribution to reduce your taxable income and pay less tax.')
  } else if (b.income > PA_FULL && b.income < 30_000) {
    lines.push('')
    lines.push('Make sure you are claiming all allowable expenses — even small deductions like Use of Home (£6/week) add up.')
  }

  return lines.join('\n')
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
    response: `Student Loan repayment thresholds (2026/27):\n\n- Plan 1: 9% on income above £24,990\n- Plan 2: 9% on income above £27,295\n- Plan 4 (Scotland): 9% on income above £32,745\n- Plan 5: 9% on income above £25,000\n- Postgrad Loan: 6% on income above £21,000\n\nRepayments are collected through PAYE or Self Assessment. They are not tax-deductible.`,
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

  // Greetings
  {
    pattern: /^(?:hi|hello|hey|hiya|morning|evening|afternoon|yo|sup)\b/i,
    response: `Hey... welcome to EasyAcco. I am Kittax, your UK tax advisor for 2026/27. Ask me anything — income tax, expenses, NI, dividends, deadlines, you name it. Or just tell me your income and I will calculate your tax instantly.`,
  },

  // Thanks
  {
    pattern: /\b(?:thanks?|thank\s*you|cheers|ta|appreciate)\b/i,
    response: `You are welcome! If you have more tax questions, I am always here. Remember — the Tax Estimator on the Tax page gives you a full interactive breakdown too.`,
  },

  // Who are you
  {
    pattern: /\b(?:who\s*are\s*you|what\s*are\s*you|your\s*name|kittax)\b/i,
    response: `I am Kittax — EasyAcco's built-in UK tax advisor. I know 2026/27 HMRC rules inside out: income tax bands, National Insurance, dividends, expenses, deadlines, and more.\n\nJust ask me a question or tell me your income and I will do the maths for you. No external AI needed — I run entirely on EasyAcco's own tax engine.`,
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
  return `I can help with UK tax calculations, Personal Allowance, NI, dividends, expenses, deadlines, and more.\n\nTry asking:\n- "How much tax on £45,000?"\n- "What expenses can I claim?"\n- "Tell me about dividends"\n- "When is the Self Assessment deadline?"\n\nOr just type your income and I will calculate your 2026/27 tax instantly.`
}
