/**
 * Turns the raw text of an OCR'd UK payslip into a validated, typed record.
 *
 * Deliberately deterministic: every field is found by anchoring on the label
 * printed beside it, exactly as parseReceipt in components/ReceiptScanner.tsx
 * does for receipts. No model, no network call, nothing leaves the server — so
 * this feature adds no third-party processor and needs no entry in /privacy.
 * That is the whole reason it is written this way; see the "AI features
 * switched off" section of docs/COMPLIANCE.md.
 *
 * The trade is accuracy: a layout this misses returns a validation error the
 * user can correct, rather than a confident guess. Wrong numbers on a tax
 * document are worse than absent ones.
 */

import { z } from 'zod'

/**
 * Upper bound on OCR text considered. A full payslip is ~1-2k characters;
 * beyond this it is a multi-page scan and the fields are near the top anyway.
 */
export const MAX_OCR_CHARS = 20_000

/** No legitimate UK payslip line exceeds this; guards against OCR digit runs. */
const MAX_MONEY = 10_000_000

/**
 * Money as printed on a payslip: always two decimal places, optionally with
 * thousands separators. Requiring the decimals is what stops the matcher
 * swallowing employee numbers, NI numbers and dates.
 */
const MONEY = /\d{1,3}(?:,\d{3})*\.\d{2}|\d+\.\d{2}/g

/**
 * The same pattern without /g, for `.test()`. A global regex keeps `lastIndex`
 * between calls, so testing lines in a loop with MONEY itself would skip every
 * other match — the classic version of this bug, and silent when it happens.
 */
const HAS_MONEY = /\d{1,3}(?:,\d{3})*\.\d{2}|\d+\.\d{2}/

/**
 * UK tax codes, per HMRC's published forms:
 *   - optional S (Scotland) or C (Wales) country prefix
 *   - BR / NT / 0T / D0-D8 flat codes, K-prefixed codes, or digits + L/M/N/T
 *   - optional W1 / M1 / X emergency (non-cumulative) marker
 * Anything outside this is an OCR misread, not a code — reject rather than
 * store a value the tax engine would later have to defend.
 */
const TAX_CODE = /^[SC]?(?:BR|NT|0T|D[0-8]|K\d{1,6}|\d{1,6}[LMNT])(?: ?(?:W1|M1|X))?$/

function normaliseTaxCode(value: unknown): unknown {
  if (typeof value !== 'string') return value
  return value.toUpperCase().replace(/\s+/g, ' ').trim()
}

function trimText(value: unknown): unknown {
  return typeof value === 'string' ? value.trim() : value
}

const MoneySchema = z.number().finite().nonnegative().max(MAX_MONEY)

export const PayslipSchema = z.object({
  grossPay: MoneySchema,
  taxPaid: MoneySchema,
  nationalInsurance: MoneySchema,
  taxCode: z.preprocess(
    normaliseTaxCode,
    z.string().regex(TAX_CODE, 'taxCode is not a recognised UK tax code'),
  ),
  employerName: z.preprocess(
    trimText,
    z.string().min(2, 'employerName is required').max(120, 'employerName too long'),
  ),
})

export type Payslip = z.infer<typeof PayslipSchema>

export type PayslipParseResult =
  | {
      ok: true
      data: Payslip
      /**
       * Assumptions made while reading. Surfaced in the UI so a user confirming
       * the figures knows which ones were inferred rather than read straight
       * off a label — the same reason parseReceipt reports amountConfidence.
       */
      notes: string[]
    }
  /** Nothing legible came out of OCR. */
  | { ok: false; reason: 'empty-text' }
  /** Something was read, but it is not a payslip. Carries the ZodError. */
  | { ok: false; reason: 'schema'; error: z.ZodError; partial: Record<string, unknown> }

/** All two-decimal amounts on a line, left to right, commas stripped. */
function moneysOn(line: string): number[] {
  return (line.match(MONEY) ?? []).map((m) => Number(m.replace(/,/g, '')))
}

interface Found {
  value: number | undefined
  /** True when the line carried more than one amount — see pickCurrentPeriod. */
  multiColumn: boolean
}

/**
 * Find the amount printed against a label.
 *
 * Payslips are two-column: "this period" then "year to date", left to right.
 * When a line carries several amounts we take the FIRST, which is the current
 * period on every UK layout I can find — and flag it, because taking the YTD
 * figure by mistake would overstate a year's tax by an order of magnitude and
 * the user is the only one who can catch it.
 *
 * If the label line has no amount at all, the value is usually on the next
 * line (common when OCR breaks a table row in two).
 */
function findLabelled(lines: string[], label: RegExp): Found {
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (line === undefined || !label.test(line)) continue

    const here = moneysOn(line)
    if (here.length > 0) return { value: here[0], multiColumn: here.length > 1 }

    const next = moneysOn(lines[i + 1] ?? '')
    if (next.length > 0) return { value: next[0], multiColumn: next.length > 1 }
  }
  return { value: undefined, multiColumn: false }
}

// Ordered most-specific first: "gross pay" must win over a bare "pay", and
// "employee's national insurance" must be preferred over any "national
// insurance" line, which on many layouts is the employer's contribution.
const GROSS = /gross\s*(?:pay|earnings|salary)|total\s*gross|^gross\b/i
const TAX = /\b(?:pay\s*as\s*you\s*earn|paye|income\s*tax|tax\s*(?:paid|deducted|this\s*period))\b/i
const NI = /\b(?:employee'?s?\s*)?(?:national\s*insurance|nat(?:\.|ional)?\s*ins|ni)\b/i
const TAX_CODE_LINE = /tax\s*code\s*[:\-]?\s*([A-Z0-9]{2,8}(?:\s?(?:W1|M1|X))?)/i
const EMPLOYER_LABEL = /\bemployer(?:\s*name)?\s*[:\-]\s*(.+)$/i

/** Lines that are chrome, not an employer name. */
const NOT_A_NAME =
  /payslip|pay\s*slip|pay\s*advice|employee|ni\s*number|national\s*insurance|tax\s*code|period|date|department|works\s*number|payment\s*method|gross|net\s*pay|deduction|earnings|total/i

/**
 * The employer name is the one field with no reliable label on most payslips —
 * it is simply the largest text at the top. Prefer an explicit "Employer:"
 * label; otherwise take the first line near the top that looks like a company
 * name and is not a column heading. Always reported as inferred.
 */
function findEmployer(lines: string[]): { value: string | undefined; inferred: boolean } {
  for (const line of lines) {
    const labelled = line.match(EMPLOYER_LABEL)
    if (labelled?.[1]?.trim()) return { value: labelled[1].trim(), inferred: false }
  }

  // Only the masthead is worth searching; past that it is table content.
  for (const line of lines.slice(0, 6)) {
    if (NOT_A_NAME.test(line)) continue
    if (HAS_MONEY.test(line)) continue
    const cleaned = line.replace(/\s{2,}/g, ' ').trim()
    if (cleaned.length < 2 || cleaned.length > 120) continue
    // Needs letters; a row of digits is a payroll or employee number.
    if (!/[A-Za-z]{2}/.test(cleaned)) continue
    return { value: cleaned, inferred: true }
  }
  return { value: undefined, inferred: false }
}

/**
 * Extract and validate the five fields from OCR text.
 *
 * O(n·m) worst case over n lines and m labels — five fixed labels, so linear in
 * the text, which is itself bounded by MAX_OCR_CHARS.
 */
export function parsePayslip(ocrText: string): PayslipParseResult {
  const text = ocrText.slice(0, MAX_OCR_CHARS).replace(/\r/g, '').trim()
  if (!text) return { ok: false, reason: 'empty-text' }

  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)

  const notes: string[] = []

  const gross = findLabelled(lines, GROSS)
  const tax = findLabelled(lines, TAX)
  const ni = findLabelled(lines, NI)
  if (gross.multiColumn || tax.multiColumn || ni.multiColumn) {
    notes.push('This payslip has more than one amount column — the first was read as this period.')
  }

  // Searched across the whole text rather than per-line: the code is often
  // printed in a header block with no line of its own.
  const codeMatch = text.match(TAX_CODE_LINE)

  const employer = findEmployer(lines)
  if (employer.inferred) {
    notes.push('The employer name was taken from the top of the page — check it.')
  }

  const candidate = {
    grossPay: gross.value,
    taxPaid: tax.value,
    nationalInsurance: ni.value,
    taxCode: codeMatch?.[1],
    employerName: employer.value,
  }

  const parsed = PayslipSchema.safeParse(candidate)
  if (!parsed.success) {
    // The partial is returned so the UI can pre-fill what was found and ask for
    // the rest, instead of discarding a good read because one field is missing.
    return { ok: false, reason: 'schema', error: parsed.error, partial: candidate }
  }

  return { ok: true, data: parsed.data, notes }
}
