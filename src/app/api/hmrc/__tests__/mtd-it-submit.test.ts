/**
 * What the Self Assessment route actually SENDS to HMRC.
 *
 * `it-return.test.ts` covers the field rules and `mtd-submit-rate-limit.test.ts`
 * the meter. What neither could see is the translation step between them: the
 * flat body the browser posts becomes HMRC's nested `periodDates` /
 * `periodIncome` / `periodExpenses` shape, and that mapping was unverified.
 *
 * It also had a hole. `periodExpenses` was built by spreading the caller's
 * `expenses` object, while validation only ever inspected the categories HMRC
 * publishes — so an invented key went to HMRC unchecked, including one carrying
 * a third decimal place, which is exactly what `isMoneyAmount` exists to stop.
 * The last case in the first block is that regression.
 *
 * `fraud-headers` is deliberately not mocked — see the VAT suite.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

const ROUTE = '@/app/api/hmrc/mtd/it/submit/route'

const H = vi.hoisted(() => ({
  apiBase: 'https://test-api.service.hmrc.gov.uk',
  session: { userId: 'session-user' },
  auth: { refreshed: false, rotateCookie: false },
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
    scopes: 'write:self-assessment',
  }),
  getValidAccessToken: async (
    _env: unknown,
    _req: unknown,
    res: { cookies: { set: (n: string, v: string, o: unknown) => void } },
  ) => {
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

const itBody = {
  nino: 'AA123456A',
  businessId: 'XBIS00000000001',
  periodStartDate: '2026-04-06',
  periodEndDate: '2027-04-05',
  income: { turnover: 42000 },
  browser,
}

function post(body: unknown, headers: Record<string, string> = {}) {
  return new Request('https://easyacco.uk/api/hmrc/mtd/it/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  }) as never
}

let fetchSpy: ReturnType<typeof vi.fn>

function sent() {
  const call = fetchSpy.mock.calls.at(-1)
  expect(call, 'expected a call to HMRC').toBeDefined()
  const [url, init] = call as [
    string,
    { method: string; headers: Record<string, string>; body: string },
  ]
  return { url, method: init.method, headers: init.headers, body: JSON.parse(init.body) }
}

function hmrcReplies(init: { ok?: boolean; status?: number; body?: unknown }) {
  fetchSpy.mockResolvedValue({
    ok: init.ok ?? true,
    status: init.status ?? 200,
    text: async () => JSON.stringify(init.body ?? {}),
    headers: new Headers(),
  })
}

beforeEach(async () => {
  vi.resetModules()
  H.session.userId = 'session-user'
  H.auth.refreshed = false
  H.auth.rotateCookie = false
  fetchSpy = vi.fn()
  hmrcReplies({ status: 200, body: { periodId: '2026-04-06_2027-04-05' } })
  vi.stubGlobal('fetch', fetchSpy)
  const { __resetRateLimitForTests } = await import('@/lib/rate-limit')
  __resetRateLimitForTests()
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('POST /api/hmrc/mtd/it/submit — the period summary HMRC receives', () => {
  it('nests the flat body into HMRC’s periodDates / periodIncome shape', async () => {
    const { POST } = await import(ROUTE)
    const res = await POST(post(itBody))

    expect(res.status).toBe(200)
    const req = sent()
    expect(req.url).toBe(
      `${H.apiBase}/individuals/business/self-employment/AA123456A/XBIS00000000001/period`,
    )
    expect(req.method).toBe('POST')
    expect(req.headers.Accept).toBe('application/vnd.hmrc.5.0+json')
    expect(req.headers.Authorization).toBe('Bearer access-token')

    expect(req.body).toEqual({
      periodDates: { periodStartDate: '2026-04-06', periodEndDate: '2027-04-05' },
      periodIncome: { turnover: 42000 },
    })
    // The taxpayer's identity travels in the path; the fraud payload is headers.
    expect(req.body.nino).toBeUndefined()
    expect(req.body.browser).toBeUndefined()
  })

  it('includes income.other only when it carries a figure', async () => {
    const { POST } = await import(ROUTE)

    await POST(post(itBody))
    expect(sent().body.periodIncome).toEqual({ turnover: 42000 })

    await POST(post({ ...itBody, income: { turnover: 42000, other: 250.5 } }))
    expect(sent().body.periodIncome).toEqual({ turnover: 42000, other: 250.5 })
  })

  it('sends consolidated expenses as HMRC’s single-figure alternative', async () => {
    const { POST } = await import(ROUTE)
    await POST(post({ ...itBody, consolidatedExpenses: 1200 }))

    expect(sent().body.periodExpenses).toEqual({ consolidatedExpenses: 1200 })
  })

  it('sends only the detailed categories that carry a figure', async () => {
    const { POST } = await import(ROUTE)
    await POST(
      post({
        ...itBody,
        expenses: { adminCosts: 500, depreciation: 25.5, otherExpenses: undefined },
      }),
    )

    // An omitted category must be absent, not present as null — HMRC's schema
    // rejects a null where it expects a number.
    expect(sent().body.periodExpenses).toEqual({ adminCosts: 500, depreciation: 25.5 })
  })

  it('never forwards an expense category HMRC does not publish', async () => {
    const { POST } = await import(ROUTE)
    const res = await POST(
      post({ ...itBody, expenses: { adminCosts: 500, sneaky: 999, madeUp: 1.234 } }),
    )
    const json = await res.json()

    // Rejected outright rather than quietly dropped: an expense category lost
    // to a typo understates expenses and overstates the taxable profit.
    expect(res.status).toBe(400)
    expect(json.message).toContain('expenses.sneaky (not an expense category HMRC accepts)')
    expect(json.message).toContain('expenses.madeUp')
    // And nothing was sent while we worked that out.
    expect(fetchSpy).not.toHaveBeenCalled()
  })
})

describe('POST /api/hmrc/mtd/it/submit — what the filer gets back', () => {
  it('returns HMRC’s period id and echoes what was submitted', async () => {
    const { POST } = await import(ROUTE)
    const res = await POST(post({ ...itBody, expenses: { adminCosts: 500 } }))
    const json = await res.json()

    expect(json.ok).toBe(true)
    expect(json.hmrcStatus).toBe(200)
    expect(json.hmrcBody.periodId).toBe('2026-04-06_2027-04-05')
    // requestBody is what the confirmation screen shows the user they filed, so
    // it has to be the payload that actually went, not the one they typed.
    expect(json.requestBody.periodExpenses).toEqual({ adminCosts: 500 })
    expect(json.fraudHeaders['Gov-Client-User-IDs']).toBe('easyacco=session-user')
  })

  it('translates HMRC’s "no such business" into something the filer can act on', async () => {
    hmrcReplies({
      ok: false,
      status: 404,
      body: { code: 'MATCHING_RESOURCE_NOT_FOUND', message: 'Not found' },
    })
    const { POST } = await import(ROUTE)
    const res = await POST(post(itBody))
    const json = await res.json()

    expect(res.status).toBe(404)
    expect(json.message).toBe('No self-employment business found with this NINO and business ID.')
    expect(json.body.code).toBe('MATCHING_RESOURCE_NOT_FOUND')
  })

  it('reports an HMRC outage as 502 rather than echoing the 5xx', async () => {
    hmrcReplies({ ok: false, status: 500, body: { code: 'SERVER_ERROR' } })
    const { POST } = await import(ROUTE)
    const res = await POST(post(itBody))

    expect(res.status).toBe(502)
    expect((await res.json()).status).toBe(500)
  })

  it('keeps the rotated token cookie on every exit once a refresh has happened', async () => {
    H.auth.refreshed = true
    H.auth.rotateCookie = true
    const { POST } = await import(ROUTE)

    const okRes = await POST(post(itBody))
    expect(okRes.cookies.get('hmrc_tokens')?.value).toBe('rotated')

    hmrcReplies({ ok: false, status: 400, body: { code: 'RULE_DUPLICATE_SUBMISSION' } })
    const rejected = await POST(post(itBody))
    expect(rejected.status).toBe(400)
    expect(rejected.cookies.get('hmrc_tokens')?.value).toBe('rotated')

    fetchSpy.mockRejectedValue(new Error('ECONNRESET'))
    const failed = await POST(post(itBody))
    expect(failed.status).toBe(502)
    expect(failed.cookies.get('hmrc_tokens')?.value).toBe('rotated')
  })
})
