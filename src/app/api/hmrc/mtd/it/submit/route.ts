import { type NextRequest, NextResponse } from 'next/server'
import { buildFraudHeaders, observeClient } from '@/lib/hmrc/fraud-headers'
import {
  itPeriodErrors,
  missingItFields,
  IT_EXPENSE_KEYS,
  type ItReturnBody as RequestBody,
} from '@/lib/hmrc/it-return'
import { resolveSubmissionUserId } from '@/lib/hmrc/identity'
import { mapHmrcError } from '@/lib/hmrc/mtd-errors'
import { getValidAccessToken, readHmrcEnv } from '@/lib/hmrc/oauth'
import { carryCookies } from '@/lib/hmrc/cookies'
import { rateLimit } from '@/lib/rate-limit'
import { reportError } from '@/lib/monitor'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// MTD-IT Self-Employment Periodic Summary submission.
// Endpoint: POST /individuals/business/self-employment/{nino}/{businessId}/period
// Spec:     https://developer.service.hmrc.gov.uk/api-documentation/docs/api/service/self-employment-business-api/5.0
// Scope:    write:self-assessment

type SubmitOk = {
  ok: true
  refreshed: boolean
  hmrcStatus: number
  hmrcBody: Record<string, unknown>
  fraudHeaders: Record<string, string>
  requestBody: Record<string, unknown>
}

type SubmitFail = {
  ok: false
  stage: 'env' | 'auth' | 'validation' | 'submit'
  message: string
  status?: number
  body?: unknown
  needsReauth?: boolean
}

export async function POST(req: NextRequest): Promise<NextResponse<SubmitOk | SubmitFail>> {
  // FIRST statement in the handler — see the VAT route for why (MTD-2).
  const observation = observeClient(req)

  const env = readHmrcEnv()
  if ('error' in env) {
    return NextResponse.json<SubmitFail>(
      { ok: false, stage: 'env', message: env.error },
      { status: 500 },
    )
  }

  let body: RequestBody
  try {
    body = (await req.json()) as RequestBody
  } catch {
    return NextResponse.json<SubmitFail>(
      { ok: false, stage: 'validation', message: 'Invalid JSON body' },
      { status: 400 },
    )
  }

  const missing = missingItFields(body)
  if (missing.length > 0) {
    return NextResponse.json<SubmitFail>(
      {
        ok: false,
        stage: 'validation',
        message: `Missing required fields: ${missing.join(', ')}`,
      },
      { status: 400 },
    )
  }

  // Cross-field rules: the period must not end before it starts, and HMRC
  // rejects a return carrying both consolidated and detailed expenses
  // (RULE_BOTH_EXPENSES_SUPPLIED). Failing fast saves a round-trip and says
  // which fields clashed. Extracted to lib/hmrc/it-return.ts so it is testable.
  const periodErrors = itPeriodErrors(body)
  if (periodErrors.length > 0) {
    return NextResponse.json<SubmitFail>(
      { ok: false, stage: 'validation', message: periodErrors.join('; ') },
      { status: 400 },
    )
  }

  const hasDetailedExpenses = IT_EXPENSE_KEYS.some((k) => body.expenses?.[k] !== undefined)
  const hasConsolidated = Number.isFinite(body.consolidatedExpenses)

  // Placeholder response so getValidAccessToken can write the refresh cookie.
  const resPlaceholder = NextResponse.json<SubmitOk | SubmitFail>(
    { ok: false, stage: 'auth', message: 'unreachable' },
    { status: 500 },
  )

  // Who is filing, according to OUR session — never according to the body (SEC-7).
  const identity = await resolveSubmissionUserId()
  if (!identity.ok) {
    return NextResponse.json<SubmitFail>(
      { ok: false, stage: 'auth', message: identity.message },
      { status: identity.status },
    )
  }

  // Same reasoning as the VAT route: a Self Assessment submission is a rare,
  // deliberate act, so five attempts in ten minutes cannot inconvenience a
  // person but does stop a loop hammering HMRC under a real taxpayer's
  // credentials (SEC-6). After validation so retrying a corrected figure is
  // free; before getValidAccessToken so a blocked call triggers no token
  // refresh against HMRC.
  const limit = rateLimit(`hmrc:mtd:it:${identity.userId}`, 5, 10 * 60_000)
  if (!limit.ok) {
    return NextResponse.json<SubmitFail>(
      {
        ok: false,
        stage: 'submit',
        message: 'Too many submission attempts. Please wait a few minutes and try again.',
      },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSec) } },
    )
  }

  const auth = await getValidAccessToken(env, req, resPlaceholder, identity.userId)
  if (!auth.ok) {
    return NextResponse.json<SubmitFail>(
      { ok: false, stage: 'auth', message: auth.message, needsReauth: auth.needsReauth },
      { status: auth.status },
    )
  }

  const fraudHeaders = buildFraudHeaders(observation, body.browser, identity.userId)

  const hmrcRequestBody: Record<string, unknown> = {
    periodDates: {
      periodStartDate: body.periodStartDate,
      periodEndDate: body.periodEndDate,
    },
    periodIncome: {
      turnover: body.income.turnover,
      ...(Number.isFinite(body.income.other) ? { other: body.income.other } : {}),
    },
  }

  if (hasConsolidated) {
    hmrcRequestBody.periodExpenses = { consolidatedExpenses: body.consolidatedExpenses }
  } else if (hasDetailedExpenses) {
    hmrcRequestBody.periodExpenses = Object.fromEntries(
      Object.entries(body.expenses!).filter(([, v]) => Number.isFinite(v)),
    )
  }

  const url = `${env.apiBase}/individuals/business/self-employment/${encodeURIComponent(body.nino)}/${encodeURIComponent(body.businessId)}/period`

  const fetchHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/vnd.hmrc.5.0+json',
    Authorization: `Bearer ${auth.accessToken}`,
    ...fraudHeaders,
  }
  if (body.govTestScenario) {
    fetchHeaders['Gov-Test-Scenario'] = body.govTestScenario
  }

  let submitRes: Response
  let submitRaw: string
  try {
    submitRes = await fetch(url, {
      method: 'POST',
      headers: fetchHeaders,
      body: JSON.stringify(hmrcRequestBody),
      cache: 'no-store',
    })
    submitRaw = await submitRes.text()
  } catch (err) {
    reportError('hmrc.mtd.it.submit.network', err)
    return carryCookies(
      resPlaceholder,
      NextResponse.json<SubmitFail>(
        { ok: false, stage: 'submit', message: 'Network error reaching HMRC MTD-IT endpoint.' },
        { status: 502 },
      ),
    )
  }

  let submitBody: unknown = submitRaw
  try {
    submitBody = JSON.parse(submitRaw)
  } catch {
    // leave as raw text
  }

  if (!submitRes.ok) {
    const humanMessage = mapHmrcError(submitBody)
    return carryCookies(
      resPlaceholder,
      NextResponse.json<SubmitFail>(
        {
          ok: false,
          stage: 'submit',
          status: submitRes.status,
          body: submitBody,
          message: humanMessage,
        },
        { status: submitRes.status >= 500 ? 502 : submitRes.status },
      ),
    )
  }

  const okBody: SubmitOk = {
    ok: true,
    refreshed: auth.refreshed,
    hmrcStatus: submitRes.status,
    hmrcBody:
      typeof submitBody === 'object' && submitBody !== null
        ? (submitBody as Record<string, unknown>)
        : { raw: submitRaw },
    fraudHeaders,
    requestBody: hmrcRequestBody,
  }

  // Preserve any Set-Cookie headers written by the auth refresh
  return carryCookies(resPlaceholder, NextResponse.json<SubmitOk>(okBody))
}
