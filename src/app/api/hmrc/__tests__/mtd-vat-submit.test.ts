/**
 * What the VAT route actually SENDS to HMRC, and what it hands back.
 *
 * `mtd-submit-rate-limit.test.ts` covers the meter in front of this route, and
 * `vat-return.test.ts` covers the field and arithmetic rules. Neither looks at
 * the request that leaves the building — so the nine-box payload, the
 * fraud-prevention headers HMRC judges us on, the receipt we show the user and
 * the token cookie that lets them file again were all unverified.
 *
 * These assert the contract, not the implementation: the URL and body shape
 * come from HMRC's VAT API spec, and the header rules from their
 * fraud-prevention guide. If a change here fails, check it against those before
 * changing the test.
 *
 * `fraud-headers` is deliberately NOT mocked, for the reason the rate-limit
 * suite gives: the route validates the browser payload through it, so a fixture
 * that production would reject has to be rejected here too.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

const ROUTE = '@/app/api/hmrc/mtd/vat/submit/route'

const H = vi.hoisted(() => ({
  apiBase: 'https://test-api.service.hmrc.gov.uk',
  session: { userId: 'session-user' },
  // Lets a test simulate the token refresh that happens mid-handler: whether it
  // rotated the cookie, and how long the round-trip to HMRC took.
  auth: { refreshed: false, rotateCookie: false, elapsedMs: 0 },
}))

vi.mock('@/lib/hmrc/identity', () => ({
  resolveSubmissionUserId: async () => ({ ok: true, userId: H.session.userId }),
}))

vi.mock('@/lib/hmrc/oauth', () => ({
  readHmrcEnv: () => ({
    clientId: 'id',
    clientSecret: 'secret',
    apiBase: H.apiBase,
    loginBase: 'https://test-www.tax.service.gov.uk',
    redirectUri: 'https://easyacco.uk/api/hmrc/auth/callback',
    scopes: 'write:vat',
  }),
  getValidAccessToken: async (
    _env: unknown,
    _req: unknown,
    res: { cookies: { set: (n: string, v: string, o: unknown) => void } },
  ) => {
    // A real refresh is a round-trip to HMRC; some tests need the clock to move
    // across it to prove which moment the timestamp header records.
    if (H.auth.elapsedMs > 0) vi.advanceTimersByTime(H.auth.elapsedMs)
    if (H.auth.rotateCookie) res.cookies.set('hmrc_tokens', 'rotated', { path: '/' })
    return { ok: true, accessToken: 'access-token', tokens: {}, refreshed: H.auth.refreshed }
  },
}))

const browser = {
  userAgent: 'Mozilla/5.0 (test)',
  screens: [{ width: 1920, height: 1080, scalingFactor: 1, colourDepth: 24 }],
  windowSize: { width: 1280, height: 800 },
  timezone: 'UTC+00:00',
  deviceId: '11111111-2222-4333-8444-555555555555',
}

/** Arithmetically consistent, or validation stops the request before it flies. */
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

function post(body: unknown, headers: Record<string, string> = {}) {
  return new Request('https://easyacco.uk/api/hmrc/mtd/vat/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  }) as never
}

let fetchSpy: ReturnType<typeof vi.fn>

/** The request that actually left for HMRC. */
function sent() {
  const call = fetchSpy.mock.calls.at(-1)
  expect(call, 'expected a call to HMRC').toBeDefined()
  const [url, init] = call as [
    string,
    { method: string; headers: Record<string, string>; body: string },
  ]
  return { url, method: init.method, headers: init.headers, body: JSON.parse(init.body) }
}

function hmrcReplies(init: {
  ok?: boolean
  status?: number
  body?: unknown
  headers?: Record<string, string>
}) {
  const payload = typeof init.body === 'string' ? init.body : JSON.stringify(init.body ?? {})
  fetchSpy.mockResolvedValue({
    ok: init.ok ?? true,
    status: init.status ?? 200,
    text: async () => payload,
    headers: new Headers(init.headers ?? {}),
  })
}

beforeEach(async () => {
  vi.resetModules()
  H.session.userId = 'session-user'
  H.auth.refreshed = false
  H.auth.rotateCookie = false
  H.auth.elapsedMs = 0
  fetchSpy = vi.fn()
  hmrcReplies({ status: 201, body: { processingDate: '2026-08-18T10:00:00.000Z' } })
  vi.stubGlobal('fetch', fetchSpy)
  const { __resetRateLimitForTests } = await import('@/lib/rate-limit')
  __resetRateLimitForTests()
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('POST /api/hmrc/mtd/vat/submit — the request that reaches HMRC', () => {
  it('posts the nine boxes to the VRN-scoped returns endpoint and nothing more', async () => {
    const { POST } = await import(ROUTE)
    const res = await POST(post({ ...vatBody, govTestScenario: undefined }))

    expect(res.status).toBe(200)
    const req = sent()
    expect(req.url).toBe(`${H.apiBase}/organisations/vat/123456789/returns`)
    expect(req.method).toBe('POST')
    expect(req.headers.Accept).toBe('application/vnd.hmrc.1.0+json')
    expect(req.headers.Authorization).toBe('Bearer access-token')

    // The VRN travels in the path, and the fraud payload never belongs in the
    // return. An extra key here is a malformed VAT return, so pin the whole set.
    expect(Object.keys(req.body).sort()).toEqual(
      [
        'finalised',
        'netVatDue',
        'periodKey',
        'totalAcquisitionsExVAT',
        'totalValueGoodsSuppliedExVAT',
        'totalValuePurchasesExVAT',
        'totalValueSalesExVAT',
        'totalVatDue',
        'vatDueAcquisitions',
        'vatDueSales',
        'vatReclaimedCurrPeriod',
      ].sort(),
    )
    expect(req.body.netVatDue).toBe(60)
    expect(req.body.finalised).toBe(true)
  })

  it('names the signed-in account in Gov-Client-User-IDs, whatever the body claims (SEC-7)', async () => {
    H.session.userId = 'real user'
    const { POST } = await import(ROUTE)
    await POST(post({ ...vatBody, userId: 'attacker', govClientUserIds: 'easyacco=attacker' }))

    const { headers } = sent()
    // Percent-encoded, per HMRC's header grammar — and derived from the session,
    // so the two decoy fields in the body change nothing.
    expect(headers['Gov-Client-User-IDs']).toBe('easyacco=real%20user')
    expect(headers['Gov-Client-Connection-Method']).toBe('WEB_APP_VIA_SERVER')
    expect(headers['Gov-Client-Device-ID']).toBe(browser.deviceId)
    expect(headers['Gov-Client-Screens']).toBe(
      'width=1920&height=1080&scaling-factor=1&colour-depth=24',
    )
  })

  it('reports the IP our own proxy observed, not the one the caller claimed (MTD-2)', async () => {
    const { POST } = await import(ROUTE)
    // Left-most entry is whatever the caller sent; the right-most was appended
    // by our single trusted hop. Sending HMRC the former is the forgery their
    // fraud headers exist to catch.
    await POST(post(vatBody, { 'x-forwarded-for': '1.2.3.4, 203.0.113.9' }))

    const { headers } = sent()
    expect(headers['Gov-Client-Public-IP']).toBe('203.0.113.9')
    expect(headers['Gov-Vendor-Forwarded']).toContain('for=203.0.113.9')
    expect(headers['Gov-Vendor-Forwarded']).not.toContain('1.2.3.4')
  })

  it('timestamps when the IP was seen, not when the headers were built (MTD-2)', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-18T10:00:00.000Z'))
    // The token refresh sits between observing the client and building the
    // headers. If the timestamp were taken at build time it would read :05.
    H.auth.elapsedMs = 5_000

    const { POST } = await import(ROUTE)
    await POST(post(vatBody, { 'x-real-ip': '203.0.113.9' }))

    expect(sent().headers['Gov-Client-Public-IP-Timestamp']).toBe('2026-08-18T10:00:00.000Z')
  })

  it('forwards Gov-Test-Scenario only when the caller asked for one', async () => {
    const { POST } = await import(ROUTE)

    await POST(post(vatBody))
    expect(sent().headers['Gov-Test-Scenario']).toBeUndefined()

    await POST(post({ ...vatBody, govTestScenario: 'DUPLICATE_SUBMISSION' }))
    expect(sent().headers['Gov-Test-Scenario']).toBe('DUPLICATE_SUBMISSION')
    // ...and it stays a header: HMRC rejects an unknown field in the return.
    expect(sent().body.govTestScenario).toBeUndefined()
  })
})

describe('POST /api/hmrc/mtd/vat/submit — what the filer gets back', () => {
  it('surfaces the receipt HMRC issued, which is the filer’s proof of submission', async () => {
    hmrcReplies({
      status: 201,
      body: { processingDate: '2026-08-18T10:00:00.000Z' },
      headers: {
        'Receipt-ID': 'receipt-123',
        'Receipt-Timestamp': '2026-08-18T10:00:01.000Z',
        'X-CorrelationId': 'corr-456',
      },
    })
    const { POST } = await import(ROUTE)
    const res = await POST(post(vatBody))
    const json = await res.json()

    expect(json.ok).toBe(true)
    expect(json.hmrcStatus).toBe(201)
    expect(json.hmrcHeaders).toEqual({
      receiptId: 'receipt-123',
      receiptTimestamp: '2026-08-18T10:00:01.000Z',
      correlationId: 'corr-456',
    })
    expect(json.hmrcBody.processingDate).toBe('2026-08-18T10:00:00.000Z')
  })

  it('translates a business-validation rejection and keeps HMRC’s own body', async () => {
    hmrcReplies({
      ok: false,
      status: 400,
      body: {
        code: 'INVALID_REQUEST',
        message: 'Invalid request',
        errors: [{ code: 'VAT_TOTAL_VALUE', message: 'totalVatDue is wrong' }],
      },
    })
    const { POST } = await import(ROUTE)
    const res = await POST(post(vatBody))
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json.ok).toBe(false)
    expect(json.stage).toBe('submit')
    // The specific inner code, not the generic outer one.
    expect(json.message).toBe('totalVatDue must equal vatDueSales + vatDueAcquisitions.')
    expect(json.body.code).toBe('INVALID_REQUEST')
    expect(json.status).toBe(400)
  })

  it('reports an HMRC outage as 502, not as the filer’s own error', async () => {
    hmrcReplies({ ok: false, status: 503, body: { code: 'SERVER_ERROR' } })
    const { POST } = await import(ROUTE)
    const res = await POST(post(vatBody))

    // A 5xx from HMRC is an upstream failure; echoing it would tell the browser
    // that easyacco fell over, and the original is still on the body.
    expect(res.status).toBe(502)
    expect((await res.json()).status).toBe(503)
  })

  it('reports a network failure as 502 without pretending the return was filed', async () => {
    fetchSpy.mockRejectedValue(new Error('ECONNRESET'))
    const { POST } = await import(ROUTE)
    const res = await POST(post(vatBody))
    const json = await res.json()

    expect(res.status).toBe(502)
    expect(json.ok).toBe(false)
    expect(json.message).toContain('Network error')
  })

  it('keeps the rotated token cookie on every exit once a refresh has happened', async () => {
    // HMRC's refresh tokens are single-use. Once getValidAccessToken redeems
    // one, only the rotated cookie can file again — so dropping it on the way
    // out leaves the browser holding a token HMRC has already retired.
    H.auth.refreshed = true
    H.auth.rotateCookie = true
    const { POST } = await import(ROUTE)

    const okRes = await POST(post(vatBody))
    expect((await okRes.json()).refreshed).toBe(true)
    expect(okRes.cookies.get('hmrc_tokens')?.value).toBe('rotated')

    hmrcReplies({ ok: false, status: 400, body: { code: 'PERIOD_KEY_INVALID' } })
    const rejected = await POST(post(vatBody))
    expect(rejected.status).toBe(400)
    expect(rejected.cookies.get('hmrc_tokens')?.value).toBe('rotated')

    fetchSpy.mockRejectedValue(new Error('ECONNRESET'))
    const failed = await POST(post(vatBody))
    expect(failed.status).toBe(502)
    expect(failed.cookies.get('hmrc_tokens')?.value).toBe('rotated')
  })
})
