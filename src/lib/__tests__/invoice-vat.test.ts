import { describe, it, expect } from 'vitest'
import {
  vatTotal,
  vatAmount,
  vatRate,
  vatTreatmentOf,
  isTaxableSupply,
  VAT_RATES,
} from '@/lib/hooks/useInvoices'
import type { Invoice, VatTreatment } from '@/lib/validators'

function inv(over: Partial<Invoice>): Invoice {
  return {
    id: 'i1',
    number: '0001',
    client: 'Acme',
    description: 'Work',
    date: '2026-05-01',
    dueDate: '2026-05-31',
    amount: 1000,
    vat: false,
    status: 'draft',
    ...over,
  }
}

// TAX-4. The invoice used to carry a single boolean, so the only supply it
// could express was standard-rated 20%.
describe('vatTreatmentOf — backward compatibility', () => {
  it('reads a legacy vat=true invoice as standard-rated', () => {
    const i = inv({ vat: true })
    expect(vatTreatmentOf(i)).toBe('standard')
    expect(vatTotal(i)).toBe(1200)
  })

  it('reads a legacy vat=false invoice as no VAT', () => {
    const i = inv({ vat: false })
    expect(vatTreatmentOf(i)).toBe('none')
    expect(vatTotal(i)).toBe(1000)
  })

  it('lets the explicit treatment win over the legacy flag', () => {
    // A row migrated to zero-rated must not be re-inflated by a stale boolean.
    const i = inv({ vat: true, vatTreatment: 'zero' })
    expect(vatTreatmentOf(i)).toBe('zero')
    expect(vatTotal(i)).toBe(1000)
  })
})

describe('vat rates', () => {
  it('applies the standard rate', () => {
    const i = inv({ vatTreatment: 'standard' })
    expect(vatRate(i)).toBe(0.2)
    expect(vatAmount(i)).toBe(200)
    expect(vatTotal(i)).toBe(1200)
  })

  it('applies the reduced rate', () => {
    const i = inv({ vatTreatment: 'reduced' })
    expect(vatAmount(i)).toBe(50)
    expect(vatTotal(i)).toBe(1050)
  })

  it.each<VatTreatment>(['zero', 'exempt', 'reverse_charge', 'none'])(
    'charges no VAT on a %s supply',
    (t) => {
      const i = inv({ vatTreatment: t })
      expect(vatAmount(i)).toBe(0)
      expect(vatTotal(i)).toBe(1000)
    },
  )

  it('rounds the VAT element to whole pence', () => {
    // 33.33 * 0.2 = 6.666 -> 6.67, and the total must agree with the parts.
    const i = inv({ amount: 33.33, vatTreatment: 'standard' })
    expect(vatAmount(i)).toBe(6.67)
    expect(vatTotal(i)).toBe(40)
    expect(vatTotal(i)).toBe(Math.round((i.amount + vatAmount(i)) * 100) / 100)
  })
})

describe('isTaxableSupply', () => {
  // The distinction that a single boolean could not express: these all charge
  // £0 of VAT, but only some are taxable turnover on a VAT return.
  it('counts zero-rated and reverse-charge as taxable turnover', () => {
    expect(isTaxableSupply(inv({ vatTreatment: 'zero' }))).toBe(true)
    expect(isTaxableSupply(inv({ vatTreatment: 'reverse_charge' }))).toBe(true)
  })

  it('excludes exempt and non-VAT supplies', () => {
    expect(isTaxableSupply(inv({ vatTreatment: 'exempt' }))).toBe(false)
    expect(isTaxableSupply(inv({ vatTreatment: 'none' }))).toBe(false)
  })

  it('separates zero-rated from exempt despite identical totals', () => {
    const zero = inv({ vatTreatment: 'zero' })
    const exempt = inv({ vatTreatment: 'exempt' })
    expect(vatTotal(zero)).toBe(vatTotal(exempt))
    expect(isTaxableSupply(zero)).not.toBe(isTaxableSupply(exempt))
  })
})

describe('VAT_RATES', () => {
  it('matches the UK rates in force for 2026/27', () => {
    expect(VAT_RATES.standard).toBe(0.2)
    expect(VAT_RATES.reduced).toBe(0.05)
    expect(VAT_RATES.zero).toBe(0)
  })
})
