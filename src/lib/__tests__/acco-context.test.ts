import { describe, it, expect } from 'vitest'
import { bandMoney, buildContextPrompt, buildBaseContext } from '@/lib/acco/context'
import type { AccoContext } from '@/lib/acco/types'

// SEC-4. buildContextPrompt is the single point where a user's own figures
// become text bound for Google Gemini, a third-party processor. These tests
// pin the data-minimisation guarantee the security page now states publicly:
// user-derived money leaves as a range, never as an exact amount.

describe('bandMoney', () => {
  it('bands mid-range figures to the nearest £5,000', () => {
    expect(bandMoney(47_312.68)).toBe('£45,000–£50,000')
    expect(bandMoney(45_000)).toBe('£45,000–£50,000')
    expect(bandMoney(49_999.99)).toBe('£45,000–£50,000')
  })

  it('widens the band above £100,000', () => {
    expect(bandMoney(137_500)).toBe('£125,000–£150,000')
  })

  it('collapses small and very large figures rather than narrowing them', () => {
    expect(bandMoney(0)).toBe('under £1,000')
    expect(bandMoney(999.99)).toBe('under £1,000')
    expect(bandMoney(400_000)).toBe('over £250,000')
  })

  it('does not disclose the size of a loss', () => {
    expect(bandMoney(-12_345)).toBe('a loss (negative)')
  })

  it('handles non-finite input', () => {
    expect(bandMoney(Number.NaN)).toBe('unknown')
  })
})

describe('buildContextPrompt', () => {
  const ctx: AccoContext = {
    ...buildBaseContext(),
    totalExpensesYTD: 8_432.17,
    estimatedProfit: 47_312.68,
    estimatedTaxLiability: 11_204.55,
    taxBand: 'Higher rate',
  }

  it('never emits an exact user figure', () => {
    const prompt = buildContextPrompt(ctx)
    for (const exact of ['8,432.17', '47,312.68', '11,204.55']) {
      expect(prompt).not.toContain(exact)
    }
    // The unformatted forms must not leak either.
    for (const exact of ['8432.17', '47312.68', '11204.55']) {
      expect(prompt).not.toContain(exact)
    }
  })

  it('emits the banded ranges instead', () => {
    const prompt = buildContextPrompt(ctx)
    expect(prompt).toContain('£45,000–£50,000')
    expect(prompt).toContain('£5,000–£10,000')
    expect(prompt).toContain('£10,000–£15,000')
  })

  it('still carries the public HMRC thresholds exactly', () => {
    // These are published constants, not personal data — precision here is
    // what makes the advice correct.
    const prompt = buildContextPrompt(ctx)
    expect(prompt).toContain('£12,570.00')
  })

  it('keeps the coarse tax band, which carries no amount', () => {
    expect(buildContextPrompt(ctx)).toContain('Higher rate')
  })

  it('omits figures that were never supplied', () => {
    const prompt = buildContextPrompt(buildBaseContext())
    expect(prompt).not.toContain('Estimated taxable profit')
    expect(prompt).not.toContain('logged expenses')
  })

  it('tells the model the figures are ranges, so it does not quote them as exact', () => {
    expect(buildContextPrompt(ctx)).toContain('ranges, not exact amounts')
  })
})
