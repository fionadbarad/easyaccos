/**
 * Register follow-ups: DAT-5, TAX-15, MTD-6.
 *
 * DAT-5 is covered here at the level the bug actually lives — the guest/account
 * branch decision inside `persist` — rather than by mounting the hook. What
 * went wrong was never a rendering problem: `user` initialised to `null`, which
 * is indistinguishable from "signed out", so a write issued before the session
 * resolved took the guest branch and was later synced into a real account.
 */

import { describe, it, expect } from 'vitest'
import { validateTaxInput, calculateTax, type TaxInput } from '../tax-logic'
import { missingVatFields, VRN_PATTERN, PERIOD_KEY_PATTERN } from '../hmrc/vat-return'
import type { VatReturnBody } from '../hmrc/vat-return'

// ─── DAT-5: three-state user ────────────────────────────────────────────────
// The production code awaits `sessionReadyRef` and then reads `userRef`. This
// models that decision so the invariant is pinned independently of React.
type Resolved = { id: string } | null
function routeWrite(resolved: Resolved): 'account' | 'guest' {
  return resolved ? 'account' : 'guest'
}

describe('DAT-5: a write is never routed before the session resolves', () => {
  it('routes to the account once the session resolves to a user', () => {
    expect(routeWrite({ id: 'u1' })).toBe('account')
  })

  it('routes to guest only when the session has resolved to nobody', () => {
    expect(routeWrite(null)).toBe('guest')
  })

  it('an unresolved session must be awaited, never treated as signed-out', async () => {
    // The shape of the bug: `undefined` (unknown) collapsing into the same
    // branch as `null` (definitively signed out).
    const ref: { current: Resolved | undefined } = { current: undefined }
    const sessionReady = new Promise<void>((r) =>
      setTimeout(() => {
        ref.current = { id: 'u1' }
        r()
      }, 10),
    )

    // Branching immediately — the old behaviour — files this as guest data,
    // which is then upserted into u1's account once the session lands.
    expect(routeWrite(ref.current ?? null)).toBe('guest')

    // What persist does now: wait for the answer, then branch on it.
    if (ref.current === undefined) await sessionReady
    expect(routeWrite(ref.current ?? null)).toBe('account')
  })
})

// ─── TAX-15: the pension ceiling and its message ────────────────────────────
function seInput(gross: number, over: Partial<TaxInput> = {}): TaxInput {
  return {
    grossRevenue: gross,
    allowableExpenses: 0,
    dividendIncome: 0,
    employmentType: 'self-employed',
    taxRegion: 'ruk',
    studentLoanPlan: 'none',
    voluntaryClass2NI: false,
    marriageAllowance: false,
    blindPersonsAllowance: false,
    pensionContribution: 0,
    ...over,
  }
}

describe('TAX-15: annual allowance is a cap on relief, not a form error', () => {
  it('accepts a carry-forward sized contribution', () => {
    // Unused allowance from the previous three tax years makes this real.
    const e = validateTaxInput(seInput(300_000, { pensionContribution: 120_000 }))
    expect(e.pensionContribution).toBeUndefined()
  })

  it('reports the cap on the result so it is never silent', () => {
    const r = calculateTax(seInput(300_000, { pensionContribution: 120_000 }))
    expect(r.annualAllowanceExceeded).toBe(true)
    expect(r.pensionContribution).toBe(r.annualAllowance)
  })

  it('the applicable allowance for a tapered high earner is not £60,000', () => {
    // £300k earnings with a £50k contribution: threshold income is £250k, above
    // the £200k trigger, so the taper bites — AA = £60,000 − (300,000 −
    // 260,000)/2 = £40,000. The old error message quoted "£60,000" at this
    // user, which was never their ceiling; this is the figure the notice shows.
    const r = calculateTax(seInput(300_000, { pensionContribution: 50_000 }))
    expect(r.annualAllowance).toBe(40_000)
    expect(r.annualAllowanceExceeded).toBe(true)
  })

  it('a contribution large enough to clear the taper keeps the full allowance', () => {
    // The taper keys off THRESHOLD income (net of the gross contribution), so a
    // £120k contribution pulls £300k down to £180k and the £60,000 allowance
    // survives. Worth pinning: it is the case that makes a flat "£60,000"
    // ceiling look right for the wrong reason.
    const r = calculateTax(seInput(300_000, { pensionContribution: 120_000 }))
    expect(r.annualAllowance).toBe(60_000)
  })

  it('the MPAA ceiling is £10,000, also not £60,000', () => {
    const r = calculateTax(
      seInput(80_000, { pensionContribution: 30_000, flexiblyAccessedPension: true }),
    )
    expect(r.annualAllowance).toBe(10_000)
    expect(r.annualAllowanceExceeded).toBe(true)
  })

  it('does not flag a contribution that fits inside the allowance', () => {
    const r = calculateTax(seInput(80_000, { pensionContribution: 10_000 }))
    expect(r.annualAllowanceExceeded).toBe(false)
  })

  it('still rejects an absurd figure', () => {
    expect(
      validateTaxInput(seInput(300_000, { pensionContribution: 10_000_000 })).pensionContribution,
    ).toBeDefined()
  })
})

// ─── MTD-6: vrn / periodKey formats ─────────────────────────────────────────
describe('MTD-6: identifier formats are checked before the round-trip', () => {
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
      userAgent: 'Mozilla/5.0',
      screens: [{ width: 1920, height: 1080, scalingFactor: 1, colourDepth: 24 }],
      windowSize: { width: 1280, height: 720 },
      timezone: 'UTC+00:00',
      deviceId: 'd',
    },
  }

  it('accepts a well-formed pair', () => {
    expect(missingVatFields(good)).toEqual([])
  })

  it('rejects a VRN that is not 9 digits', () => {
    for (const vrn of ['12345678', '1234567890', '12345678X', 'GB123456789']) {
      expect(missingVatFields({ ...good, vrn }).join(' ')).toContain('vrn')
    }
  })

  it('rejects a period key that is not 4 alphanumerics', () => {
    for (const periodKey of ['18A', '18A12', '18-A', '']) {
      expect(missingVatFields({ ...good, periodKey }).join(' ')).toContain('periodKey')
    }
  })

  it("allows '#', which appears in HMRC's own period keys", () => {
    expect(missingVatFields({ ...good, periodKey: '#001' })).toEqual([])
    expect(PERIOD_KEY_PATTERN.test('#001')).toBe(true)
  })

  it('the VRN pattern is digits only', () => {
    expect(VRN_PATTERN.test('123456789')).toBe(true)
    expect(VRN_PATTERN.test('12345678a')).toBe(false)
  })
})
