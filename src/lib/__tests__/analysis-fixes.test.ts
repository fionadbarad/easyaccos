/**
 * Regression tests for the 2026-07-30 code-analysis pass.
 *
 * Each block names the defect it pins so a future change that reintroduces it
 * fails here rather than in production.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { calculateTax, type TaxInput } from '@/lib/tax-logic'
import { PA_BASE, PA_TAPER_START } from '@/lib/tax/bands-2026'
import { rateLimit, clientIpKey, __resetRateLimitForTests } from '@/lib/rate-limit'
import { missingVatFields, arithmeticErrors, type VatReturnBody } from '@/lib/hmrc/vat-return'
import { projectAnnual } from '@/features/tracker/aggregates'
import { diffDeletedIds } from '@/lib/use-user-data'

const baseInput: TaxInput = {
  grossRevenue: 0,
  allowableExpenses: 0,
  dividendIncome: 0,
  employmentType: 'self-employed',
  taxRegion: 'ruk',
  studentLoanPlan: 'none',
  voluntaryClass2NI: false,
  marriageAllowance: false,
  blindPersonsAllowance: false,
  pensionContribution: 0,
}

// ─── TAX: the taper flag must agree with the taper ──────────────────────────
// calcPA() tapers on adjustedProfit + dividends, but sixtyPercentTrap was
// measured on adjustedProfit alone. A user pushed over £100,000 by dividends
// therefore had their Personal Allowance quietly reduced while the app reported
// no taper and withheld the tip that would have recovered it.
describe('60% trap detection counts dividend income', () => {
  it('flags the trap when dividends carry income over £100,000', () => {
    const r = calculateTax({ ...baseInput, grossRevenue: 90_000, dividendIncome: 30_000 })

    // The allowance really is tapered: £120,000 ANI → 12,570 − 10,000 = £2,570.
    expect(r.personalAllowance).toBe(2_570)
    // …so the flag that claims to explain that must be on.
    expect(r.sixtyPercentTrap).toBe(true)
    expect(r.taperWarning).toBe(true)
    expect(r.optimizationTips.map((t) => t.id)).toContain('pension-60pct')
  })

  it('still flags profit-only income in the trap', () => {
    const r = calculateTax({ ...baseInput, grossRevenue: 110_000 })
    expect(r.sixtyPercentTrap).toBe(true)
    expect(r.optimizationTips.map((t) => t.id)).toContain('pension-60pct')
  })

  it('does not flag income below the threshold', () => {
    const r = calculateTax({ ...baseInput, grossRevenue: 60_000, dividendIncome: 20_000 })
    expect(r.personalAllowance).toBe(PA_BASE)
    expect(r.sixtyPercentTrap).toBe(false)
  })

  it('does not flag income above the taper end', () => {
    const r = calculateTax({ ...baseInput, grossRevenue: 100_000, dividendIncome: 40_000 })
    expect(r.personalAllowance).toBe(0)
    expect(r.sixtyPercentTrap).toBe(false)
  })

  it('never suggests contributing more than relevant earnings', () => {
    // £8k of trading profit with £110k of dividends is in the taper, but only
    // £8k is relievable — recommending the full £18k escape would be advice the
    // user cannot legally act on.
    const r = calculateTax({ ...baseInput, grossRevenue: 8_000, dividendIncome: 110_000 })
    const tip = r.optimizationTips.find((t) => t.id === 'pension-60pct')
    if (tip) expect(tip.saving).toBeLessThanOrEqual(Math.round(8_000 * 0.6))

    const higher = calculateTax({ ...baseInput, grossRevenue: 5_000, dividendIncome: 60_000 })
    const htip = higher.optimizationTips.find((t) => t.id === 'pension-higher')
    if (htip) expect(htip.saving).toBeLessThanOrEqual(Math.round(5_000 * 0.4))
  })

  it('taper boundary is exclusive at both ends', () => {
    const at = calculateTax({ ...baseInput, grossRevenue: PA_TAPER_START })
    expect(at.sixtyPercentTrap).toBe(false)
  })
})

// ─── SEC: the guest rate-limit key must not be caller-controlled ────────────
// clientIpKey took the LEFTMOST X-Forwarded-For entry, which the caller
// supplies. Rotating that header handed out a fresh 60/min bucket per request.
describe('clientIpKey ignores caller-supplied X-Forwarded-For entries', () => {
  beforeEach(() => __resetRateLimitForTests())

  const req = (xff: string) =>
    new Request('https://easyacco.uk/api/ai/categorise', { headers: { 'x-forwarded-for': xff } })

  it('reads the entry our own proxy appended, not the claimed one', () => {
    expect(clientIpKey(req('9.9.9.9, 203.0.113.7'))).toBe('203.0.113.7')
  })

  it('a spoofed prefix cannot mint a new bucket', () => {
    const limit = 3
    // Same real client, a different forged prefix each time.
    for (let i = 0; i < limit; i++) {
      const key = clientIpKey(req(`10.0.0.${i}, 203.0.113.7`))
      expect(rateLimit(`ai:categorise:${key}`, limit, 60_000, 1_000).ok).toBe(true)
    }
    const key = clientIpKey(req('10.0.0.99, 203.0.113.7'))
    expect(rateLimit(`ai:categorise:${key}`, limit, 60_000, 1_000).ok).toBe(false)
  })

  it('distinct real clients still get distinct buckets', () => {
    expect(clientIpKey(req('203.0.113.7'))).not.toBe(clientIpKey(req('198.51.100.4')))
  })

  it('falls back to x-real-ip when the chain is shorter than our hop count', () => {
    const r = new Request('https://easyacco.uk/', { headers: { 'x-real-ip': '203.0.113.9' } })
    expect(clientIpKey(r)).toBe('203.0.113.9')
    expect(clientIpKey(new Request('https://easyacco.uk/'))).toBe('anon')
  })
})

// ─── MTD: NaN is a number, and every comparison against it is false ─────────
describe('VAT return validation rejects non-finite money', () => {
  const good: VatReturnBody = {
    vrn: '123456789',
    periodKey: '18A1',
    vatDueSales: 100,
    vatDueAcquisitions: 0,
    totalVatDue: 100,
    vatReclaimedCurrPeriod: 40,
    netVatDue: 60,
    totalValueSalesExVAT: 500,
    totalValuePurchasesExVAT: 200,
    totalValueGoodsSuppliedExVAT: 0,
    totalAcquisitionsExVAT: 0,
    finalised: true,
    browser: {
      userAgent: 'test',
      screens: [],
      windowSize: { width: 1, height: 1 },
      timezone: 'UTC+00:00',
      deviceId: 'd',
    },
  }

  it('accepts a well-formed nine-box return', () => {
    expect(missingVatFields(good)).toEqual([])
    expect(arithmeticErrors(good)).toEqual([])
  })

  it('rejects NaN, which the old typeof check let through', () => {
    expect(missingVatFields({ ...good, netVatDue: NaN })).toContain('netVatDue')
  })

  it('rejects Infinity', () => {
    expect(missingVatFields({ ...good, totalVatDue: Infinity })).toContain('totalVatDue')
  })

  it('shows why the field check has to catch it: NaN passes the invariants', () => {
    // Guards the guard. |NaN - NaN| > tolerance is false, so arithmeticErrors
    // alone would declare an all-NaN return valid — and JSON.stringify sends
    // every one of those boxes to HMRC as null.
    const allNaN = {
      ...good,
      vatDueSales: NaN,
      vatDueAcquisitions: NaN,
      totalVatDue: NaN,
      netVatDue: NaN,
    }
    expect(arithmeticErrors(allNaN)).toEqual([])
    expect(JSON.parse(JSON.stringify({ netVatDue: NaN })).netVatDue).toBeNull()
    // …which is exactly why the field-level check must reject it first.
    expect(missingVatFields(allNaN).length).toBeGreaterThan(0)
  })

  it('still catches a genuine arithmetic mismatch', () => {
    const errs = arithmeticErrors({ ...good, totalVatDue: 999 })
    expect(errs.length).toBeGreaterThan(0)
    expect(errs[0]).toMatch(/totalVatDue/)
  })
})

// ─── Tracker: annualising from a near-zero denominator ──────────────────────
describe('projectAnnual floors the elapsed period at one month', () => {
  it('keeps the linear projection for a real elapsed period', () => {
    expect(projectAnnual(6_000, 6)).toBe(12_000)
    expect(projectAnnual(1_000, 3)).toBe(4_000)
  })

  it('zero months returns 0', () => {
    expect(projectAnnual(5_000, 0)).toBe(0)
  })

  it('does not multiply the first week of the tax year by ~150', () => {
    // 8 April: monthsElapsed ≈ 2/30.44 ≈ 0.066
    const early = 2 / 30.44
    expect(projectAnnual(3_000, early)).toBe(36_000)
    expect(projectAnnual(3_000, early)).toBeLessThan(50_000)
  })
})

// ─── Storage: deletions stay caller-driven (DAT-1 still holds) ──────────────
describe('diffDeletedIds', () => {
  it('reports only rows the caller removed', () => {
    const prev = [{ id: 'a' }, { id: 'b' }]
    expect(diffDeletedIds(prev, [{ id: 'a' }])).toEqual(['b'])
    expect(diffDeletedIds(prev, prev)).toEqual([])
    expect(diffDeletedIds([], [{ id: 'a' }])).toEqual([])
  })
})
