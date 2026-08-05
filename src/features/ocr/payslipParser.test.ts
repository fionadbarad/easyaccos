import { describe, expect, test } from 'vitest'
import { parsePayslip, PayslipSchema, MAX_OCR_CHARS } from './payslipParser'

/**
 * Fixtures are written the way tesseract actually returns a payslip: labels and
 * values on one line separated by runs of spaces, columns flattened left to
 * right, no table structure left.
 */
const MONTHLY = `
ACME TRADING LTD
Payslip for period 4                    Date 31/07/2026
Employee  J SMITH                       Works Number 00412
Tax Code  1257L                         NI Number QQ123456C

                          This Period      Year to Date
Gross Pay                   2,450.00         9,800.00
PAYE Income Tax               312.40         1,249.60
National Insurance            145.20           580.80
Net Pay                     1,992.40
`

const SINGLE_COLUMN = `
BRIGHT SPARK ELECTRICAL
Employer: Bright Spark Electrical Ltd
Tax Code: S1257L
Gross Pay 1800.00
Income Tax 210.50
Employee's National Insurance 98.40
`

describe('parsePayslip — realistic layouts', () => {
  test('reads a two-column monthly payslip', () => {
    const result = parsePayslip(MONTHLY)

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.data).toEqual({
      grossPay: 2450,
      taxPaid: 312.4,
      nationalInsurance: 145.2,
      taxCode: '1257L',
      employerName: 'ACME TRADING LTD',
    })
  })

  test('takes the current-period column, never year-to-date', () => {
    const result = parsePayslip(MONTHLY)

    expect(result.ok).toBe(true)
    if (!result.ok) return
    // 9,800.00 is the YTD figure on the same line; reading it would overstate
    // the year's gross fourfold.
    expect(result.data.grossPay).toBe(2450)
    expect(result.notes.join(' ')).toMatch(/more than one amount column/i)
  })

  test('reads a single-column payslip with an explicit employer label', () => {
    const result = parsePayslip(SINGLE_COLUMN)

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.data.employerName).toBe('Bright Spark Electrical Ltd')
    expect(result.data.taxCode).toBe('S1257L')
    expect(result.data.grossPay).toBe(1800)
    // Labelled employer, single column — nothing was inferred.
    expect(result.notes).toEqual([])
  })

  test('flags an employer name taken from the masthead', () => {
    const result = parsePayslip(MONTHLY)

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.notes.join(' ')).toMatch(/employer name was taken from the top/i)
  })

  test('finds an amount that OCR pushed onto the next line', () => {
    const result = parsePayslip(`
WIDGET CO
Tax Code 1257L
Gross Pay
  2,000.00
Income Tax
  180.00
National Insurance
  92.00
`)

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.data.grossPay).toBe(2000)
    expect(result.data.taxPaid).toBe(180)
  })

  test('does not mistake an employee number for money', () => {
    const result = parsePayslip(MONTHLY)

    expect(result.ok).toBe(true)
    if (!result.ok) return
    // 00412 and QQ123456C are on lines the label matcher never reaches, but the
    // money pattern requiring two decimals is what makes that safe.
    expect(Object.values(result.data)).not.toContain(412)
  })

  test('reads every line, not every other one', () => {
    // Regression: the money check in findEmployer once used the /g-flagged
    // pattern, whose lastIndex persisted between calls and made line skipping
    // depend on how many lines had been tested before.
    const result = parsePayslip(`
1234.00
5678.00
GENUINE EMPLOYER LTD
Tax Code 1257L
Gross Pay 900.00
Income Tax 80.00
National Insurance 40.00
`)

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.data.employerName).toBe('GENUINE EMPLOYER LTD')
  })
})

describe('parsePayslip — failures', () => {
  test('returns empty-text for blank OCR output', () => {
    expect(parsePayslip('   \n  \n ')).toEqual({ ok: false, reason: 'empty-text' })
  })

  test('reports which fields are missing and keeps the partial read', () => {
    const result = parsePayslip(`
ACME TRADING LTD
Tax Code 1257L
Gross Pay 2,450.00
`)

    expect(result.ok).toBe(false)
    if (result.ok || result.reason !== 'schema') throw new Error('expected a schema failure')
    const paths = result.error.issues.map((i) => i.path[0])
    expect(paths).toContain('taxPaid')
    expect(paths).toContain('nationalInsurance')
    // What was read is preserved so the UI can pre-fill it.
    expect(result.partial.grossPay).toBe(2450)
    expect(result.partial.employerName).toBe('ACME TRADING LTD')
  })

  test('rejects an OCR-mangled tax code', () => {
    const result = parsePayslip(`
ACME TRADING LTD
Tax Code 12S7I
Gross Pay 2,450.00
Income Tax 312.40
National Insurance 145.20
`)

    expect(result.ok).toBe(false)
    if (result.ok || result.reason !== 'schema') throw new Error('expected a schema failure')
    expect(result.error.issues.some((i) => i.path[0] === 'taxCode')).toBe(true)
  })

  test('fails rather than guessing on unrelated text', () => {
    const result = parsePayslip('Tesco Express\nBananas 1.20\nTotal 1.20\n')
    expect(result.ok).toBe(false)
  })

  test('truncates oversized input', () => {
    const padding = 'x\n'.repeat(MAX_OCR_CHARS)
    const result = parsePayslip(padding + MONTHLY)
    // Everything real sits past the cap, so nothing is found — the point is
    // that it terminates and reports, rather than scanning unbounded input.
    expect(result.ok).toBe(false)
  })
})

describe('PayslipSchema — tax code forms', () => {
  const base = {
    grossPay: 2450,
    taxPaid: 312.4,
    nationalInsurance: 145.2,
    taxCode: '1257L',
    employerName: 'Acme Ltd',
  }
  const accepted = ['1257L', 'S1257L', 'C1257L', 'BR', 'NT', '0T', 'D0', 'K475', '1257L M1']
  const rejected = ['', '1257', 'L1257', 'ZZ99', 'D9', '1257Q', 'DROP TABLE']

  test.each(accepted)('accepts %s', (taxCode) => {
    expect(PayslipSchema.safeParse({ ...base, taxCode }).success).toBe(true)
  })

  test.each(rejected)('rejects %s', (taxCode) => {
    expect(PayslipSchema.safeParse({ ...base, taxCode }).success).toBe(false)
  })

  test('normalises case and spacing', () => {
    const r = PayslipSchema.safeParse({ ...base, taxCode: ' s1257l  w1 ' })
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.taxCode).toBe('S1257L W1')
  })

  test('rejects negative and non-finite money', () => {
    expect(PayslipSchema.safeParse({ ...base, grossPay: -1 }).success).toBe(false)
    expect(PayslipSchema.safeParse({ ...base, taxPaid: NaN }).success).toBe(false)
    expect(PayslipSchema.safeParse({ ...base, nationalInsurance: Infinity }).success).toBe(false)
  })

  test('rejects a missing employer name', () => {
    expect(PayslipSchema.safeParse({ ...base, employerName: ' ' }).success).toBe(false)
  })
})
