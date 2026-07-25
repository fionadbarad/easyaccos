import { describe, expect, test } from 'vitest'
import type { NextRequest } from 'next/server'
import { buildFraudHeaders, observeClient, type BrowserFraudData } from '../fraud-headers'

/**
 * LIVE sandbox validation of our fraud-prevention headers against HMRC's
 * "Test Fraud Prevention Headers" API (`txm-fph-validator-api`).
 *
 * This is the check that MTD-2 was waiting on: the unit tests prove our headers
 * have the shape we *think* HMRC wants, but only HMRC's own validator proves
 * they'll accept them. Getting the IP-observation timestamp or the forwarded
 * chain wrong fails real submissions, so this asserts against the real service
 * rather than against our own assumptions.
 *
 * It deliberately imports the SAME buildFraudHeaders the submit routes use, so
 * what is validated here cannot drift from what actually ships.
 *
 * RUNNING IT (needs sandbox credentials, so it is skipped by default and in CI):
 *
 *   node --env-file=.env.local ./node_modules/.bin/vitest run fraud-headers.sandbox
 *
 * Required env:
 *   HMRC_CLIENT_ID, HMRC_CLIENT_SECRET  — sandbox application credentials
 *   HMRC_API_BASE                       — https://test-api.service.hmrc.gov.uk
 * Optional env:
 *   HMRC_VENDOR_PUBLIC_IP               — your server's public IP
 *   HMRC_FPH_VALIDATOR_URL              — override if HMRC moves the endpoint
 */

const CLIENT_ID = process.env.HMRC_CLIENT_ID
const CLIENT_SECRET = process.env.HMRC_CLIENT_SECRET
const API_BASE = process.env.HMRC_API_BASE

const haveCredentials = Boolean(CLIENT_ID && CLIENT_SECRET && API_BASE)

// Path per HMRC's Test Fraud Prevention Headers API. Overridable because we
// could not reach developer.service.hmrc.gov.uk from the build environment to
// re-confirm it — a 404 below means set HMRC_FPH_VALIDATOR_URL, not that the
// headers are wrong.
const validatorUrl = () =>
  process.env.HMRC_FPH_VALIDATOR_URL ?? `${API_BASE}/test/fraud-prevention-headers/validate`

const BROWSER: BrowserFraudData = {
  userAgent:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  screens: [{ width: 1920, height: 1080, scalingFactor: 2, colourDepth: 24 }],
  windowSize: { width: 1280, height: 800 },
  timezone: 'UTC+01:00',
  deviceId: 'beec798b-b366-47fa-b1f8-92cede14a1ce',
}

/** A request shaped like one arriving through Vercel's edge. */
function inboundRequest(): NextRequest {
  return new Request('https://easyacco.example/api/hmrc/mtd/it/submit', {
    headers: { 'x-forwarded-for': '198.51.100.1' },
  }) as unknown as NextRequest
}

async function applicationToken(): Promise<string> {
  const res = await fetch(`${API_BASE}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: CLIENT_ID!,
      client_secret: CLIENT_SECRET!,
      grant_type: 'client_credentials',
    }),
  })
  const json = (await res.json()) as { access_token?: string; error_description?: string }
  if (!json.access_token) {
    throw new Error(`No application token from HMRC (${res.status}): ${JSON.stringify(json)}`)
  }
  return json.access_token
}

type ValidatorReport = {
  specVersion?: string
  code?: string
  message?: string
  errors?: Array<{ code?: string; message?: string; headers?: string[] }>
  warnings?: Array<{ code?: string; message?: string; headers?: string[] }>
}

describe.skipIf(!haveCredentials)('HMRC fraud-header sandbox validation', () => {
  test('HMRC accepts the headers our submit routes build', async () => {
    const token = await applicationToken()

    // Exactly what a submit route does: observe at request entry, then build.
    const observation = observeClient(inboundRequest())
    const headers = buildFraudHeaders(observation, BROWSER, 'sandbox-user-0001')

    const res = await fetch(validatorUrl(), {
      headers: {
        Accept: 'application/vnd.hmrc.1.0+json',
        Authorization: `Bearer ${token}`,
        ...headers,
      },
    })

    const raw = await res.text()
    let report: ValidatorReport = {}
    try {
      report = JSON.parse(raw) as ValidatorReport
    } catch {
      throw new Error(`Validator returned non-JSON (${res.status}): ${raw.slice(0, 400)}`)
    }

    if (res.status === 404) {
      throw new Error(
        `Validator endpoint 404 at ${validatorUrl()} — set HMRC_FPH_VALIDATOR_URL to the ` +
          `current path from HMRC's Test Fraud Prevention Headers API docs.`,
      )
    }

    // Warnings are informational (e.g. optional headers we deliberately omit);
    // print them so they are visible, but only errors fail the run.
    if (report.warnings?.length) {
      console.warn('[fph] warnings:', JSON.stringify(report.warnings, null, 2))
    }
    if (report.errors?.length) {
      console.error('[fph] errors:', JSON.stringify(report.errors, null, 2))
    }

    expect(report.errors ?? []).toEqual([])
    expect(res.status).toBeLessThan(400)
  }, 30_000)
})
