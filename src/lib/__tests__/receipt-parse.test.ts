import { describe, it, expect } from 'vitest'
import { parseReceipt } from '@/components/ReceiptScanner'

// OCR-2 / OCR-3. The parser is allowed to guess, but it is not allowed to guess
// *silently* — every fallback has to come back flagged so the verify modal can
// ask the user rather than presenting a guess as a reading.
describe('parseReceipt — amount confidence (OCR-2)', () => {
  it('reports a labelled total as high confidence', () => {
    const r = parseReceipt(['TESCO STORES', 'Bread 1.20', 'Milk 0.85', 'TOTAL 2.05'].join('\n'))
    expect(r.amount).toBe(2.05)
    expect(r.amountConfidence).toBe('labelled')
  })

  it('treats "Amount due" as labelled too', () => {
    const r = parseReceipt('SOME SHOP\nAmount due: 14.99\n')
    expect(r.amount).toBe(14.99)
    expect(r.amountConfidence).toBe('labelled')
  })

  it('flags the largest-number fallback as a guess', () => {
    // No "total" anywhere — 20.00 is the cash tendered, not the spend.
    const r = parseReceipt('CORNER SHOP\nCoffee 3.50\nCash 20.00\nChange 16.50')
    expect(r.amount).toBe(20)
    expect(r.amountConfidence).toBe('guessed')
  })

  it('reports no confidence when there is no money-shaped number at all', () => {
    const r = parseReceipt('THANK YOU FOR SHOPPING')
    expect(r.amount).toBeNull()
    expect(r.amountConfidence).toBe('none')
  })
})

describe('parseReceipt — ambiguous dates (OCR-3)', () => {
  it('offers the US reading when both parts are 1-12', () => {
    const r = parseReceipt('Date: 05/04/2026\nTOTAL 9.99')
    expect(r.date).toBe('2026-04-05') // UK reading: 5 April
    expect(r.dateAlternative).toBe('2026-05-04') // US reading: 4 May
  })

  it('does not offer an alternative when the day exceeds 12', () => {
    const r = parseReceipt('Date: 25/04/2026\nTOTAL 9.99')
    expect(r.date).toBe('2026-04-25')
    expect(r.dateAlternative).toBeNull()
  })

  it('does not offer an alternative when both parts are equal', () => {
    const r = parseReceipt('Date: 07/07/2026\nTOTAL 9.99')
    expect(r.date).toBe('2026-07-07')
    expect(r.dateAlternative).toBeNull()
  })

  it('treats an ISO date as unambiguous', () => {
    const r = parseReceipt('2026-03-09\nTOTAL 9.99')
    expect(r.date).toBe('2026-03-09')
    expect(r.dateAlternative).toBeNull()
  })

  it('treats a named month as unambiguous', () => {
    const r = parseReceipt('9 Mar 2026\nTOTAL 9.99')
    expect(r.date).toBe('2026-03-09')
    expect(r.dateAlternative).toBeNull()
  })

  it('expands a 2-digit year on both readings', () => {
    const r = parseReceipt('01/02/26\nTOTAL 5.00')
    expect(r.date).toBe('2026-02-01')
    expect(r.dateAlternative).toBe('2026-01-02')
  })
})
