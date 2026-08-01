import { type NextRequest, NextResponse } from 'next/server'
import { buildFraudHeaders, observeClient } from '@/lib/hmrc/fraud-headers'
import { resolveSubmissionUserId } from '@/lib/hmrc/identity'
import { mapHmrcError } from '@/lib/hmrc/mtd-errors'
import { getValidAccessToken, readHmrcEnv } from '@/lib/hmrc/oauth'
import { carryCookies } from '@/lib/hmrc/cookies'
import {
  arithmeticErrors,
  missingVatFields,
  type VatReturnBody as RequestBody,
} from '@/lib/hmrc/vat-return'
import { reportError } from '@/lib/monitor'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// MTD-VAT Return submission.
// Endpoint: POST /organisations/vat/{vrn}/returns
// Spec:     https://developer.service.hmrc.gov.uk/api-documentation/docs/api/service/vat-api/1.0
// Scope:    write:vat

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

export async function POST(req: NextRequest): Promise<NextResponse<SubmitOk | SubmitFail>> {
  // FIRST statement in the handler: Gov-Client-Public-IP-Timestamp must record
  // when we observed the caller's IP, not when we get round to building the
  // outbound headers (which is after a possible token-refresh round-trip to
  // HMRC). (MTD-2)
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

  const missing = missingVatFields(body)
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

  // Who is filing, according to OUR session — never according to the body (SEC-7).
  const identity = await resolveSubmissionUserId()
  if (!identity.ok) {
    return NextResponse.json<SubmitFail>(
      { ok: false, stage: 'auth', message: identity.message },
      { status: identity.status },
    )
  }

  const auth = await getValidAccessToken(env, req, resPlaceholder)
  if (!auth.ok) {
    return NextResponse.json<SubmitFail>(
      { ok: false, stage: 'auth', message: auth.message, needsReauth: auth.needsReauth },
      { status: auth.status },
    )
  }

  const fraudHeaders = buildFraudHeaders(observation, body.browser, identity.userId)

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
    reportError('hmrc.mtd.vat.submit.network', err)
    return carryCookies(
      resPlaceholder,
      NextResponse.json<SubmitFail>(
        { ok: false, stage: 'submit', message: 'Network error reaching HMRC MTD-VAT endpoint.' },
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

  return carryCookies(resPlaceholder, NextResponse.json<SubmitOk>(okBody))
}
