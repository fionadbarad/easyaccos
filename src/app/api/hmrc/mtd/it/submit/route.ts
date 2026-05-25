import { type NextRequest, NextResponse } from 'next/server'
import { buildFraudHeaders, type BrowserFraudData } from '@/lib/hmrc/fraud-headers'
import { mapHmrcError } from '@/lib/hmrc/mtd-errors'
import { getValidAccessToken, readHmrcEnv } from '@/lib/hmrc/oauth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// MTD-IT Self-Employment Periodic Summary submission.
// Endpoint: POST /individuals/business/self-employment/{nino}/{businessId}/period
// Spec:     https://developer.service.hmrc.gov.uk/api-documentation/docs/api/service/self-employment-business-api/5.0
// Scope:    write:self-assessment

type RequestBody = {
  nino: string
  businessId: string
  periodStartDate: string  // YYYY-MM-DD
  periodEndDate: string    // YYYY-MM-DD
  income: {
    turnover: number
    other?: number
  }
  expenses?: {
    costOfGoods?: number
    paymentsToSubcontractors?: number
    wagesAndStaffCosts?: number
    carVanTravelExpenses?: number
    premisesRunningCosts?: number
    maintenanceCosts?: number
    adminCosts?: number
    businessEntertainmentCosts?: number
    advertisingCosts?: number
    interestOnBankOtherLoans?: number
    financeCharges?: number
    irrecoverableDebts?: number
    professionalFees?: number
    depreciation?: number
    otherExpenses?: number
  }
  consolidatedExpenses?: number  // alternative to detailed expenses
  browser: BrowserFraudData
  userId: string
  govTestScenario?: string
}

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

function missingFields(body: Partial<RequestBody>): string[] {
  const missing: string[] = []
  if (!body.nino) missing.push('nino')
  if (!body.businessId) missing.push('businessId')
  if (!body.periodStartDate) missing.push('periodStartDate')
  if (!body.periodEndDate) missing.push('periodEndDate')
  if (!body.income || typeof body.income.turnover !== 'number') missing.push('income.turnover')
  if (!body.browser) missing.push('browser')
  if (!body.userId) missing.push('userId')
  return missing
}

export async function POST(req: NextRequest): Promise<NextResponse<SubmitOk | SubmitFail>> {
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

  const missing = missingFields(body)
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

  // Reject if BOTH consolidated and detailed expenses provided — HMRC will
  // reject anyway with RULE_BOTH_EXPENSES_SUPPLIED, but failing fast saves a
  // round-trip and gives a clearer message.
  const hasDetailedExpenses = body.expenses && Object.keys(body.expenses).length > 0
  const hasConsolidated = typeof body.consolidatedExpenses === 'number'
  if (hasDetailedExpenses && hasConsolidated) {
    return NextResponse.json<SubmitFail>(
      {
        ok: false,
        stage: 'validation',
        message: 'Submit either consolidated expenses or detailed expenses, not both.',
      },
      { status: 400 },
    )
  }

  // Placeholder response so getValidAccessToken can write the refresh cookie.
  const resPlaceholder = NextResponse.json<SubmitOk | SubmitFail>(
    { ok: false, stage: 'auth', message: 'unreachable' },
    { status: 500 },
  )

  const auth = await getValidAccessToken(env, req, resPlaceholder)
  if (!auth.ok) {
    return NextResponse.json<SubmitFail>(
      { ok: false, stage: 'auth', message: auth.message, needsReauth: auth.needsReauth },
      { status: auth.status },
    )
  }

  const fraudHeaders = buildFraudHeaders(req, body.browser, body.userId)

  const hmrcRequestBody: Record<string, unknown> = {
    periodDates: {
      periodStartDate: body.periodStartDate,
      periodEndDate: body.periodEndDate,
    },
    periodIncome: {
      turnover: body.income.turnover,
      ...(body.income.other !== undefined ? { other: body.income.other } : {}),
    },
  }

  if (hasConsolidated) {
    hmrcRequestBody.periodExpenses = { consolidatedExpenses: body.consolidatedExpenses }
  } else if (hasDetailedExpenses) {
    hmrcRequestBody.periodExpenses = Object.fromEntries(
      Object.entries(body.expenses!).filter(([, v]) => typeof v === 'number'),
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
    console.error('[hmrc/mtd/it/submit] network error:', err instanceof Error ? err.message : err)
    return NextResponse.json<SubmitFail>(
      { ok: false, stage: 'submit', message: 'Network error reaching HMRC MTD-IT endpoint.' },
      { status: 502 },
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
    return NextResponse.json<SubmitFail>(
      {
        ok: false,
        stage: 'submit',
        status: submitRes.status,
        body: submitBody,
        message: humanMessage,
      },
      { status: submitRes.status >= 500 ? 502 : submitRes.status },
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
  const finalRes = NextResponse.json<SubmitOk>(okBody)
  for (const cookie of resPlaceholder.cookies.getAll()) {
    finalRes.cookies.set(cookie)
  }
  return finalRes
}
