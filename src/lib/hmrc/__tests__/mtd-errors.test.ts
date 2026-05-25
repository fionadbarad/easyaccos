import { describe, expect, test } from 'vitest'
import { HMRC_ERROR_MESSAGES, mapHmrcError } from '../mtd-errors'

describe('mapHmrcError', () => {
  test('maps a single known error code to human-readable message', () => {
    expect(mapHmrcError({ code: 'FORMAT_NINO', message: 'raw' })).toBe(
      HMRC_ERROR_MESSAGES.FORMAT_NINO,
    )
  })

  test('prefers inner error code over outer code when both present', () => {
    const body = {
      code: 'INVALID_REQUEST',
      message: 'Invalid request',
      errors: [
        { code: 'FORMAT_NINO', message: 'inner1' },
        { code: 'FORMAT_BUSINESS_ID', message: 'inner2' },
      ],
    }
    // First inner error wins
    expect(mapHmrcError(body)).toBe(HMRC_ERROR_MESSAGES.FORMAT_NINO)
  })

  test('falls back to inner error message when inner code is unknown', () => {
    const body = {
      code: 'INVALID_REQUEST',
      errors: [{ code: 'UNKNOWN_THING', message: 'specific raw message' }],
    }
    expect(mapHmrcError(body)).toBe('specific raw message')
  })

  test('returns the outer message when no mapping and no inner errors', () => {
    const body = { code: 'UNKNOWN_CODE', message: 'literally unmapped' }
    expect(mapHmrcError(body)).toBe('literally unmapped')
  })

  test('returns the outer code when nothing else available', () => {
    expect(mapHmrcError({ code: 'WEIRD_CODE_NO_MSG' })).toBe('WEIRD_CODE_NO_MSG')
  })

  test('handles null body', () => {
    expect(mapHmrcError(null)).toMatch(/Unexpected response/)
  })

  test('handles string body (non-JSON HMRC response)', () => {
    expect(mapHmrcError('<html>some error page</html>')).toMatch(/Unexpected response/)
  })

  test('maps MTD-VAT error codes', () => {
    expect(mapHmrcError({ code: 'VRN_INVALID' })).toBe(HMRC_ERROR_MESSAGES.VRN_INVALID)
    expect(mapHmrcError({ code: 'NOT_FINALISED' })).toBe(HMRC_ERROR_MESSAGES.NOT_FINALISED)
    expect(mapHmrcError({ code: 'DUPLICATE_SUBMISSION' })).toBe(
      HMRC_ERROR_MESSAGES.DUPLICATE_SUBMISSION,
    )
  })

  test('maps MTD-IT business rule errors', () => {
    expect(mapHmrcError({ code: 'RULE_OVERLAPPING_PERIOD' })).toBe(
      HMRC_ERROR_MESSAGES.RULE_OVERLAPPING_PERIOD,
    )
    expect(mapHmrcError({ code: 'RULE_TAX_YEAR_NOT_SUPPORTED' })).toBe(
      HMRC_ERROR_MESSAGES.RULE_TAX_YEAR_NOT_SUPPORTED,
    )
  })

  test('maps shared auth error CLIENT_OR_AGENT_NOT_AUTHORISED', () => {
    expect(mapHmrcError({ code: 'CLIENT_OR_AGENT_NOT_AUTHORISED' })).toBe(
      HMRC_ERROR_MESSAGES.CLIENT_OR_AGENT_NOT_AUTHORISED,
    )
  })
})
