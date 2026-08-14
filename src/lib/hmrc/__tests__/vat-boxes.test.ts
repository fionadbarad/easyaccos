import { describe, it, expect } from 'vitest'
import { deriveVatBoxes } from '../vat-boxes'
import { arithmeticErrors, type VatReturnBody } from '../vat-return'

describe('deriveVatBoxes', () => {
  it('derives boxes 3 and 5 for a payment return', () => {
    // VAT due exceeds VAT reclaimed — the trader owes HMRC.
    const boxes = deriveVatBoxes({
      vatDueSales: 100,
      vatDueAcquisitions: 20,
      vatReclaimedCurrPeriod: 25,
    })

    expect(boxes.totalVatDue).toBe(120)
    expect(boxes.netVatDue).toBe(95)
  })

  it('keeps box 5 POSITIVE on a repayment return', () => {
    // VAT reclaimed exceeds VAT due. HMRC owes the trader — but box 5 is an
    // absolute value, so this is filed as +180, never −180. Filing the negative
    // is the mistake this function exists to make impossible.
    const boxes = deriveVatBoxes({
      vatDueSales: 100,
      vatDueAcquisitions: 20,
      vatReclaimedCurrPeriod: 300,
    })

    expect(boxes.totalVatDue).toBe(120)
    expect(boxes.netVatDue).toBe(180)
    expect(boxes.netVatDue).toBeGreaterThan(0)
  })

  it('returns box 5 as zero when the two sides balance exactly', () => {
    const boxes = deriveVatBoxes({
      vatDueSales: 50,
      vatDueAcquisitions: 0,
      vatReclaimedCurrPeriod: 50,
    })

    expect(boxes.netVatDue).toBe(0)
    // Not -0: JSON.stringify(-0) is "0" so it would reach HMRC intact, but a
    // displayed "-£0.00" in the UI reads as a repayment that is not there.
    expect(Object.is(boxes.netVatDue, -0)).toBe(false)
  })

  it('rounds both derived boxes to two decimal places', () => {
    // Thirds of a bill are the ordinary way a third decimal place appears.
    const boxes = deriveVatBoxes({
      vatDueSales: 10.005,
      vatDueAcquisitions: 0.005,
      vatReclaimedCurrPeriod: 3.333,
    })

    expect(boxes.totalVatDue).toBe(10.01)
    expect(boxes.netVatDue).toBe(6.68)
  })

  it('does not accumulate binary floating-point error', () => {
    // 0.1 + 0.2 === 0.30000000000000004 unrounded, which is not a money amount.
    const boxes = deriveVatBoxes({
      vatDueSales: 0.1,
      vatDueAcquisitions: 0.2,
      vatReclaimedCurrPeriod: 0.1,
    })

    expect(boxes.totalVatDue).toBe(0.3)
    expect(boxes.netVatDue).toBe(0.2)
  })

  // This is the test that pins the UI to the server. If either side's
  // definition of boxes 3 and 5 drifts, a return built from deriveVatBoxes
  // stops passing the validation the route runs before it contacts HMRC.
  it('produces a body that the server accepts with zero arithmetic errors', () => {
    const inputs = { vatDueSales: 100.5, vatDueAcquisitions: 20.25, vatReclaimedCurrPeriod: 300.75 }
    const derived = deriveVatBoxes(inputs)

    const body: VatReturnBody = {
      vrn: '123456789',
      periodKey: 'A001',
      ...inputs,
      ...derived,
      totalValueSalesExVAT: 500,
      totalValuePurchasesExVAT: 125,
      totalValueGoodsSuppliedExVAT: 0,
      totalAcquisitionsExVAT: 0,
      finalised: true,
      browser: {
        userAgent: 'test',
        screens: [{ width: 1, height: 1, scalingFactor: 1, colourDepth: 24 }],
        windowSize: { width: 1, height: 1 },
        timezone: 'UTC+00:00',
        deviceId: '00000000-0000-4000-8000-000000000000',
      },
    }

    // A repayment return, so this also pins the absolute-value rule end to end.
    expect(derived.netVatDue).toBe(180)
    expect(arithmeticErrors(body)).toEqual([])
  })
})
