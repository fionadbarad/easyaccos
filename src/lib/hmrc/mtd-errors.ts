// Maps HMRC MTD error codes to human-readable messages.
//
// HMRC returns errors in one of two shapes:
//
//   Single error:
//     { "code": "FORMAT_NINO", "message": "The NINO is invalid" }
//
//   Multiple errors (BVR - business validation rule):
//     {
//       "code": "INVALID_REQUEST",
//       "message": "Invalid request",
//       "errors": [
//         { "code": "FORMAT_NINO", "message": "..." },
//         { "code": "RULE_TAX_YEAR_NOT_SUPPORTED", "message": "..." }
//       ]
//     }
//
// We surface the FIRST inner error code if available (it's the most specific),
// otherwise the top-level code.

// Combined map of all error codes from the Self-Employment Business API
// and the VAT API endpoints we use. Codes from HMRC's published OpenAPI specs.
export const HMRC_ERROR_MESSAGES: Record<string, string> = {
  // MTD-IT Self-Employment Business — format errors
  FORMAT_NINO: 'National Insurance number is not in the correct format (e.g. AA999999A).',
  FORMAT_BUSINESS_ID: 'Business ID is not in the correct format (15 characters, e.g. XBIS12345678901).',
  FORMAT_START_DATE: 'Start date must be in YYYY-MM-DD format.',
  FORMAT_END_DATE: 'End date must be in YYYY-MM-DD format.',
  FORMAT_VALUE: 'One of the monetary values is not in the correct format (must be a number with up to 2 decimal places).',

  // MTD-IT Self-Employment Business — business rule errors
  RULE_END_DATE_BEFORE_START_DATE: 'End date must be on or after the start date.',
  RULE_INCORRECT_OR_EMPTY_BODY_SUBMITTED: 'The request body is empty or missing required fields.',
  RULE_TAX_YEAR_NOT_SUPPORTED: 'Submissions for this tax year are not yet supported by HMRC.',
  RULE_OVERLAPPING_PERIOD: 'This period overlaps with an existing period summary.',
  RULE_BOTH_EXPENSES_SUPPLIED: 'Submit either consolidated expenses or detailed expenses, not both.',
  RULE_MISALIGNED_PERIOD: 'The period must start on 6 April or align with existing period summaries.',
  RULE_NOT_CONTIGUOUS_PERIOD: 'There is a gap between this period and the previous one.',
  RULE_NOT_ALLOWED_CONSOLIDATED_EXPENSES: 'Consolidated expenses are not allowed when turnover exceeds the threshold.',
  RULE_DUPLICATE_SUBMISSION: 'A summary for this period has already been submitted.',
  RULE_BUSINESS_INCOME_RESTRICTION: 'Business income period restriction applies.',
  RULE_INCORRECT_GOV_TEST_SCENARIO: 'The Gov-Test-Scenario value is not valid for this endpoint.',
  MATCHING_RESOURCE_NOT_FOUND: 'No self-employment business found with this NINO and business ID.',

  // MTD-VAT — format errors
  VRN_INVALID: 'VAT registration number is invalid (must be 9 digits).',
  PERIOD_KEY_INVALID: 'The period key is invalid for the obligation.',
  INVALID_REQUEST: 'The request is not valid — see field-level errors.',
  INVALID_NUMERIC_VALUE: 'One of the monetary fields is not a valid number.',
  INVALID_MONETARY_AMOUNT: 'A monetary amount is outside the allowed range or has too many decimal places.',
  VAT_TOTAL_VALUE: 'totalVatDue must equal vatDueSales + vatDueAcquisitions.',
  VAT_NET_VALUE: 'netVatDue must equal the absolute difference between totalVatDue and vatReclaimedCurrPeriod.',

  // MTD-VAT — rule errors
  NOT_FINALISED: 'You must declare the return as finalised before submitting (set finalised: true).',
  DUPLICATE_SUBMISSION: 'A VAT return has already been submitted for this period.',
  TAX_PERIOD_NOT_ENDED: 'The submission is for a tax period that has not ended yet.',
  RULE_INSOLVENT_TRADER: 'Insolvent traders are not supported by this endpoint.',

  // Shared
  CLIENT_OR_AGENT_NOT_AUTHORISED:
    'You are not authorised to submit for this taxpayer — check that the sandbox test user matches the NINO/VRN you entered.',
  INVALID_CREDENTIALS: 'The access token is invalid or expired. Please reconnect HMRC.',
  INVALID_SCOPE: 'The access token does not have the required scope. Reconnect with the new scope.',
  TOO_MANY_REQUESTS: 'HMRC rate limit exceeded. Wait a moment and try again.',
}

type HmrcErrorShape = {
  code?: string
  message?: string
  errors?: Array<{ code?: string; message?: string }>
}

// Maps an HMRC error response body to a human-readable message.
// Falls back to the raw message/code from HMRC when we don't have a mapping,
// so unknown errors are still visible rather than swallowed.
export function mapHmrcError(body: unknown): string {
  if (typeof body !== 'object' || body === null) {
    return 'Unexpected response from HMRC (non-JSON body).'
  }
  const b = body as HmrcErrorShape

  // Prefer the first inner error — it's the most specific.
  if (Array.isArray(b.errors) && b.errors.length > 0) {
    const first = b.errors[0]
    const innerMapped = first?.code ? HMRC_ERROR_MESSAGES[first.code] : undefined
    if (innerMapped) return innerMapped
    if (first?.message) return first.message
    if (first?.code) return `HMRC error: ${first.code}`
  }

  const outerMapped = b.code ? HMRC_ERROR_MESSAGES[b.code] : undefined
  if (outerMapped) return outerMapped

  return b.message ?? b.code ?? 'Unexpected error from HMRC.'
}
