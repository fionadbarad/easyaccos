/**
 * The MTD submit routes are the two endpoints that file with HMRC under a real
 * taxpayer's credentials. Both were authenticated but unmetered: a signed-in
 * session — or a loop in the page that calls them — could submit without limit.
 *
 * Filing is a rare, deliberate act, so the cap is set where no person can reach
 * it. What the tests below pin down is the placement as much as the number:
 *
 *   - after validation, so correcting a figure and resubmitting is free
 *   - before getValidAccessToken, so a blocked call makes no HMRC round-trip
 *   - keyed on the SESSION's user id, so one account cannot spend another's
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

const VAT = '@/app/api/hmrc/mtd/vat/submit/route'
const IT = '@/app/api/hmrc/mtd/it/submit/route'

const session = vi.hoisted(() => ({ userId: 'user-1' }))
const tokenCalls = vi.hoisted(() => ({ count: 0 }))

vi.mock('@/lib/hmrc/identity', () => ({
  resolveSubmissionUserId: async () => ({ ok: true, userId: session.userId }),
}))

vi.mock('@/lib/hmrc/oauth', () => ({
  readHmrcEnv: () => ({
    clientId: 'id',
    clientSecret: 'secret',
    apiBase: 'https://test-api.service.hmrc.gov.uk',
    loginBase: 'https://test-www.tax.service.gov.uk',
    redirectUri: 'https://easyacco.uk/api/hmrc/auth/callback',
    scopes: 'write:vat',
  }),
  getValidAccessToken: async () => {
    tokenCalls.count++
    return { ok: true, accessToken: 'tok', tokens: {}, refreshed: false }
  },
}))

// fraud-headers is deliberately NOT mocked: the routes validate the browser
// payload through it, so a fixture that would be rejected in production must be
// rejected here too. Otherwise these tests could pass against a body that never
// reaches the limiter at all.
const browser = {
  userAgent: 'Mozilla/5.0 (test)',
  screens: [{ width: 1920, height: 1080, scalingFactor: 1, colourDepth: 24 }],
  windowSize: { width: 1280, height: 800 },
  timezone: 'UTC+00:00',
  deviceId: '11111111-2222-4333-8444-555555555555',
}

// Arithmetically consistent: totalVatDue = sales + acquisitions, and
// netVatDue = |totalVatDue - reclaimed|. Anything else fails validation before
// the limiter is reached, which would make these tests prove nothing.
const vatBody = {
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
  browser,
}

const itBody = {
  nino: 'AA123456A',
  businessId: 'XBIS00000000001',
  periodStartDate: '2026-04-06',
  periodEndDate: '2027-04-05',
  income: { turnover: 42000 },
  browser,
}

function post(url: string, body: unknown) {
  return new Request(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }) as never
}

let fetchSpy: ReturnType<typeof vi.fn>

beforeEach(async () => {
  vi.resetModules()
  session.userId = 'user-1'
  tokenCalls.count = 0
  fetchSpy = vi.fn().mockResolvedValue({
    ok: true,
    status: 201,
    text: async () => JSON.stringify({ processingDate: '2026-08-04T00:00:00.000Z' }),
    headers: new Headers({ 'Receipt-ID': 'r-1' }),
  })
  vi.stubGlobal('fetch', fetchSpy)
  const { __resetRateLimitForTests } = await import('@/lib/rate-limit')
  __resetRateLimitForTests()
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('MTD VAT submit is metered', () => {
  it('allows five filings then 429s the sixth without reaching HMRC', async () => {
    const { POST } = await import(VAT)

    for (let i = 0; i < 5; i++) {
      const res = await POST(post('https://easyacco.uk/api/hmrc/mtd/vat/submit', vatBody))
      expect(res.status, `filing ${i + 1}`).toBe(200)
    }
    const callsWhileAllowed = fetchSpy.mock.calls.length
    const tokensWhileAllowed = tokenCalls.count

    const blocked = await POST(post('https://easyacco.uk/api/hmrc/mtd/vat/submit', vatBody))
    expect(blocked.status).toBe(429)
    expect(blocked.headers.get('Retry-After')).toBeTruthy()

    // Nothing reached HMRC, and no access token was even resolved for it.
    expect(fetchSpy.mock.calls.length).toBe(callsWhileAllowed)
    expect(tokenCalls.count).toBe(tokensWhileAllowed)
  })

  it('does not spend budget on submissions that fail validation', async () => {
    const { POST } = await import(VAT)

    // Ten arithmetically inconsistent returns — the kind a user generates while
    // correcting a figure. None of these should count against the limit.
    for (let i = 0; i < 10; i++) {
      const res = await POST(
        post('https://easyacco.uk/api/hmrc/mtd/vat/submit', { ...vatBody, netVatDue: 999 }),
      )
      expect(res.status).toBe(400)
    }

    const res = await POST(post('https://easyacco.uk/api/hmrc/mtd/vat/submit', vatBody))
    expect(res.status).toBe(200)
  })

  it('meters each taxpayer separately', async () => {
    const { POST } = await import(VAT)

    session.userId = 'filer-a'
    for (let i = 0; i < 5; i++) {
      await POST(post('https://easyacco.uk/api/hmrc/mtd/vat/submit', vatBody))
    }
    expect((await POST(post('https://easyacco.uk/api/hmrc/mtd/vat/submit', vatBody))).status).toBe(
      429,
    )

    session.userId = 'filer-b'
    expect((await POST(post('https://easyacco.uk/api/hmrc/mtd/vat/submit', vatBody))).status).toBe(
      200,
    )
  })
})

describe('MTD Self Assessment submit is metered', () => {
  it('429s the sixth filing and keeps its own budget, separate from VAT', async () => {
    const { POST: submitIt } = await import(IT)
    const { POST: submitVat } = await import(VAT)

    for (let i = 0; i < 5; i++) {
      const res = await submitIt(post('https://easyacco.uk/api/hmrc/mtd/it/submit', itBody))
      expect(res.status, `filing ${i + 1}`).toBeLessThan(400)
    }
    expect(
      (await submitIt(post('https://easyacco.uk/api/hmrc/mtd/it/submit', itBody))).status,
    ).toBe(429)

    // Exhausting the SA budget must not lock the user out of filing VAT.
    const vat = await submitVat(post('https://easyacco.uk/api/hmrc/mtd/vat/submit', vatBody))
    expect(vat.status).toBeLessThan(400)
  })
})
