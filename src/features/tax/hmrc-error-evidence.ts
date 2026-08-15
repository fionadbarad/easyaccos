/**
 * HMRC sandbox error evidence behind /validation.
 *
 * Gov-Test-Scenario header values that drive specific sandbox responses, paired
 * with the exact error body each triggers. The page runs every one through
 * `mapHmrcError` — the same mapper the live submission routes use — so it
 * proves the real mapping rather than a copy of it.
 *
 * Extracted from the page so CI can assert the claim: that every documented
 * code maps to a human-readable message, and that no code falls through the
 * buckets unlabelled.
 */

import { HMRC_ERROR_MESSAGES, mapHmrcError } from '@/lib/hmrc/mtd-errors'

export type ScenarioCase = {
  govTestScenario: string
  surface: 'MTD-IT' | 'MTD-VAT'
  why: string
  responseStatus: number
  responseBody: unknown
}

export const HMRC_SCENARIOS: ScenarioCase[] = [
  {
    govTestScenario: 'OVERLAPPING_PERIOD',
    surface: 'MTD-IT',
    why:
      'Sandbox simulates a quarterly period that overlaps a period already on file. ' +
      'HMRC enforces non-overlapping period summaries — submitting one is a hard rejection, not a warning.',
    responseStatus: 403,
    responseBody: {
      code: 'RULE_OVERLAPPING_PERIOD',
      message: 'The period overlaps an existing summary',
    },
  },
  {
    govTestScenario: 'DUPLICATE_SUBMISSION',
    surface: 'MTD-IT',
    why:
      'Sandbox simulates the same period summary being submitted twice. HMRC returns RULE_DUPLICATE_SUBMISSION ' +
      'rather than silently overwriting — important: easyacco must surface this so the user does not assume the second send is a correction.',
    responseStatus: 403,
    responseBody: {
      code: 'RULE_DUPLICATE_SUBMISSION',
      message: 'Submission already exists for this period',
    },
  },
  {
    govTestScenario: 'CLIENT_OR_AGENT_NOT_AUTHORISED',
    surface: 'MTD-IT',
    why:
      'Sandbox simulates the access token being valid but not scoped to this taxpayer (e.g. wrong NINO). ' +
      'In production this is the canonical "your auth went through but you are not allowed to act for this user" failure.',
    responseStatus: 403,
    responseBody: { code: 'CLIENT_OR_AGENT_NOT_AUTHORISED', message: 'Not authorised' },
  },
  {
    govTestScenario: 'VAT_TOTAL_VALUE',
    surface: 'MTD-VAT',
    why:
      'Sandbox simulates totalVatDue not equalling vatDueSales + vatDueAcquisitions. easyacco pre-validates this client-side, ' +
      'so this code only appears if a request bypasses the dashboard — proves the server-side mapping still degrades gracefully.',
    responseStatus: 400,
    responseBody: {
      code: 'INVALID_REQUEST',
      message: 'Invalid request',
      errors: [
        { code: 'VAT_TOTAL_VALUE', message: 'totalVatDue does not equal sales + acquisitions' },
      ],
    },
  },
  {
    govTestScenario: 'TAX_PERIOD_NOT_ENDED',
    surface: 'MTD-VAT',
    why:
      'Sandbox simulates submitting a VAT return for a period that has not finished yet. HMRC rejects rather than ' +
      'accepting a partial-period return — easyacco surfaces the cause so the user knows to wait, not to fix data.',
    responseStatus: 403,
    responseBody: { code: 'TAX_PERIOD_NOT_ENDED', message: 'Tax period has not ended' },
  },
]

export const ERROR_BUCKETS: { label: string; prefix: (code: string) => boolean }[] = [
  { label: 'MTD-IT format errors', prefix: (c) => c.startsWith('FORMAT_') },
  {
    label: 'MTD-IT business rules',
    prefix: (c) => c.startsWith('RULE_') || c === 'MATCHING_RESOURCE_NOT_FOUND',
  },
  {
    label: 'MTD-VAT format errors',
    prefix: (c) =>
      [
        'VRN_INVALID',
        'PERIOD_KEY_INVALID',
        'INVALID_REQUEST',
        'INVALID_NUMERIC_VALUE',
        'INVALID_MONETARY_AMOUNT',
        'VAT_TOTAL_VALUE',
        'VAT_NET_VALUE',
      ].includes(c),
  },
  {
    label: 'MTD-VAT business rules',
    prefix: (c) =>
      [
        'NOT_FINALISED',
        'DUPLICATE_SUBMISSION',
        'TAX_PERIOD_NOT_ENDED',
        'RULE_INSOLVENT_TRADER',
      ].includes(c),
  },
  {
    label: 'Auth & rate limits',
    prefix: (c) =>
      [
        'CLIENT_OR_AGENT_NOT_AUTHORISED',
        'INVALID_CREDENTIALS',
        'INVALID_SCOPE',
        'TOO_MANY_REQUESTS',
      ].includes(c),
  },
]

export function bucketErrors(): { label: string; entries: [string, string][] }[] {
  const codes = Object.keys(HMRC_ERROR_MESSAGES)
  const used = new Set<string>()
  const out = ERROR_BUCKETS.map((b) => {
    const entries = codes
      .filter((c) => b.prefix(c) && !used.has(c))
      .map((c) => {
        used.add(c)
        return [c, HMRC_ERROR_MESSAGES[c]] as [string, string]
      })
    return { label: b.label, entries }
  })
  const leftover = codes
    .filter((c) => !used.has(c))
    .map((c) => [c, HMRC_ERROR_MESSAGES[c]] as [string, string])
  if (leftover.length) out.push({ label: 'Other', entries: leftover })
  return out
}

// Extracts the most-specific HMRC code from an error body (first inner error,
// else top-level) — the code mapHmrcError keys off internally.
export function errorCodeOf(body: unknown): string {
  if (typeof body !== 'object' || body === null) return '—'
  const b = body as { code?: string; errors?: Array<{ code?: string }> }
  if (Array.isArray(b.errors) && b.errors[0]?.code) return b.errors[0].code
  return b.code ?? '—'
}

export type MappedScenario = ScenarioCase & {
  rawCode: string
  friendly: string
}

/**
 * Map every sandbox scenario through the production error mapper.
 *
 * Pure, so the test can assert what the page displays: that each scenario
 * resolves to a real code and a message that is not the generic fallback.
 */
export function runHmrcScenarios(): MappedScenario[] {
  return HMRC_SCENARIOS.map((s) => ({
    ...s,
    rawCode: errorCodeOf(s.responseBody),
    friendly: mapHmrcError(s.responseBody),
  }))
}

/** Total number of codes the mapper knows — the page's headline figure. */
export function totalErrorCodes(): number {
  return Object.keys(HMRC_ERROR_MESSAGES).length
}
