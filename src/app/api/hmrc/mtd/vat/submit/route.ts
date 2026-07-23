import { type NextRequest, NextResponse } from 'next/server'
import { buildFraudHeaders, type BrowserFraudData } from '@/lib/hmrc/fraud-headers'
import { mapHmrcError } from '@/lib/hmrc/mtd-errors'
import { getValidAccessToken, readHmrcEnv } from '@/lib/hmrc/oauth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// MTD-VAT Return submission.
// Endpoint: POST /organisations/vat/{vrn}/returns
// Spec:     https://developer.service.hmrc.gov.uk/api-documentation/docs/api/service/vat-api/1.0
// Scope:    write:vat

type RequestBody = {
  vrn: string
  periodKey: string // 4 alphanumeric chars, may include '#'
  vatDueSales: number
  vatDueAcquisitions: number
  totalVatDue: number
  vatReclaimedCurrPeriod: number
  netVatDue: number
  totalValueSalesExVAT: number
  totalValuePurchasesExVAT: number
  totalValueGoodsSuppliedExVAT: number
  totalAcquisitionsExVAT: number
  finalised: boolean
  browser: BrowserFraudData
  userId: string
  govTestScenario?: string
}

type SubmitOk = {
  ok: true
  refreshed: boolean
  hmrcStatus: number
  hmrcBody: Record<string, unknown>
  hmrcHeaders: { receiptId?: string; receiptTimestamp?: string; correlationId?: string }
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

const REQUIRED_NUMERIC_KEYS = [
  'vatDueSales',
  'vatDueAcquisitions',
  'totalVatDue',
  'vatReclaimedCurrPeriod',
  'netVatDue',
  'totalValueSalesExVAT',
  'totalValuePurchasesExVAT',
  'totalValueGoodsSuppliedExVAT',
  'totalAcquisitionsExVAT',
] as const

function validate(body: Partial<RequestBody>): string[] {
  const missing: string[] = []
  if (!body.vrn) missing.push('vrn')
  if (!body.periodKey) missing.push('periodKey')
  for (const k of REQUIRED_NUMERIC_KEYS) {
    if (typeof body[k] !== 'number') missing.push(k)
  }
  if (typeof body.finalised !== 'boolean') missing.push('finalised')
  if (!body.browser) missing.push('browser')
  if (!body.userId) missing.push('userId')
  return missing
}

// HMRC's spec requires:
//   totalVatDue       = vatDueSales + vatDueAcquisitions
//   netVatDue         = | totalVatDue - vatReclaimedCurrPeriod |
// We fail fast with a clear message rather than letting HMRC return
// VAT_TOTAL_VALUE / VAT_NET_VALUE, which is the same outcome but slower.
function arithmeticErrors(body: RequestBody): string[] {
  const errors: string[] = []
  const tolerance = 0.005 // monetary fields have 2 dp precision; tolerate sub-penny rounding
  const expectedTotal = body.vatDueSales + body.vatDueAcquisitions
  if (Math.abs(body.totalVatDue - expectedTotal) > tolerance) {
    errors.push(
      `totalVatDue (${body.totalVatDue}) must equal vatDueSales + vatDueAcquisitions (${expectedTotal})`,
    )
  }
  const expectedNet = Math.abs(body.totalVatDue - body.vatReclaimedCurrPeriod)
  if (Math.abs(body.netVatDue - expectedNet) > tolerance) {
    errors.push(
      `netVatDue (${body.netVatDue}) must equal |totalVatDue - vatReclaimedCurrPeriod| (${expectedNet})`,
    )
  }
  return errors
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

  const missing = validate(body)
  if (missing.length > 0) {
    return NextResponse.json<SubmitFail>(
      {
        ok: false,
        stage: 'validation',
        message: `Missing or invalid required fields: ${missing.join(', ')}`,
      },
      { status: 400 },
    )
  }

  if (!body.finalised) {
    return NextResponse.json<SubmitFail>(
      {
        ok: false,
        stage: 'validation',
        message: 'You must mark the return as finalised before submitting.',
      },
      { status: 400 },
    )
  }

  const mathErrors = arithmeticErrors(body)
  if (mathErrors.length > 0) {
    return NextResponse.json<SubmitFail>(
      { ok: false, stage: 'validation', message: mathErrors.join('; ') },
      { status: 400 },
    )
  }

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
    periodKey: body.periodKey,
    vatDueSales: body.vatDueSales,
    vatDueAcquisitions: body.vatDueAcquisitions,
    totalVatDue: body.totalVatDue,
    vatReclaimedCurrPeriod: body.vatReclaimedCurrPeriod,
    netVatDue: body.netVatDue,
    totalValueSalesExVAT: body.totalValueSalesExVAT,
    totalValuePurchasesExVAT: body.totalValuePurchasesExVAT,
    totalValueGoodsSuppliedExVAT: body.totalValueGoodsSuppliedExVAT,
    totalAcquisitionsExVAT: body.totalAcquisitionsExVAT,
    finalised: body.finalised,
  }

  const url = `${env.apiBase}/organisations/vat/${encodeURIComponent(body.vrn)}/returns`

  const fetchHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/vnd.hmrc.1.0+json',
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
    console.error('[hmrc/mtd/vat/submit] network error:', err instanceof Error ? err.message : err)
    return NextResponse.json<SubmitFail>(
      { ok: false, stage: 'submit', message: 'Network error reaching HMRC MTD-VAT endpoint.' },
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

  // HMRC returns receipt headers we want to surface to the user.
  const okBody: SubmitOk = {
    ok: true,
    refreshed: auth.refreshed,
    hmrcStatus: submitRes.status,
    hmrcBody:
      typeof submitBody === 'object' && submitBody !== null
        ? (submitBody as Record<string, unknown>)
        : { raw: submitRaw },
    hmrcHeaders: {
      receiptId: submitRes.headers.get('Receipt-ID') ?? undefined,
      receiptTimestamp: submitRes.headers.get('Receipt-Timestamp') ?? undefined,
      correlationId: submitRes.headers.get('X-CorrelationId') ?? undefined,
    },
    fraudHeaders,
    requestBody: hmrcRequestBody,
  }

  const finalRes = NextResponse.json<SubmitOk>(okBody)
  for (const cookie of resPlaceholder.cookies.getAll()) {
    finalRes.cookies.set(cookie)
  }
  return finalRes
}
