import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import type { NextRequest } from 'next/server'
import {
  buildForwardedHeader,
  buildFraudHeaders,
  buildScreensHeader,
  extractClientIp,
  type BrowserFraudData,
} from '../fraud-headers'

// vitest runs in node; constructing a NextRequest needs Request + cast,
// which is fine because buildFraudHeaders only reads .headers.get(...).
function mockReq(headers: Record<string, string>): NextRequest {
  return new Request('https://example.com', { headers }) as unknown as NextRequest
}

const BROWSER: BrowserFraudData = {
  userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
  screens: [{ width: 1920, height: 1080, scalingFactor: 1, colourDepth: 24 }],
  windowSize: { width: 1280, height: 800 },
  timezone: 'UTC+00:00',
  deviceId: 'beec798b-b366-47fa-b1f8-92cede14a1ce',
}

describe('extractClientIp', () => {
  test('reads first entry from x-forwarded-for', () => {
    expect(extractClientIp(mockReq({ 'x-forwarded-for': '198.51.100.1, 10.0.0.1' }))).toBe(
      '198.51.100.1',
    )
  })

  test('trims whitespace around x-forwarded-for first entry', () => {
    expect(extractClientIp(mockReq({ 'x-forwarded-for': '  198.51.100.5  ' }))).toBe('198.51.100.5')
  })

  test('falls back to x-real-ip when x-forwarded-for is absent', () => {
    expect(extractClientIp(mockReq({ 'x-real-ip': '198.51.100.2' }))).toBe('198.51.100.2')
  })

  test('returns empty string when no IP header present', () => {
    expect(extractClientIp(mockReq({}))).toBe('')
  })
})

describe('buildScreensHeader', () => {
  test('formats a single screen with the spec-mandated keys', () => {
    expect(
      buildScreensHeader([{ width: 1920, height: 1080, scalingFactor: 2, colourDepth: 24 }]),
    ).toBe('width=1920&height=1080&scaling-factor=2&colour-depth=24')
  })

  test('joins multiple screens with comma separator', () => {
    const result = buildScreensHeader([
      { width: 1920, height: 1080, scalingFactor: 1, colourDepth: 24 },
      { width: 1280, height: 720, scalingFactor: 1, colourDepth: 16 },
    ])
    const entries = result.split(',')
    expect(entries).toHaveLength(2)
    expect(entries[0]).toContain('width=1920')
    expect(entries[1]).toContain('width=1280')
  })
})

describe('buildForwardedHeader', () => {
  test('includes both by and for when both IPs present', () => {
    const result = buildForwardedHeader('198.51.100.1', '203.0.113.6')
    expect(result).toBe('by=203.0.113.6&for=198.51.100.1')
  })

  test('omits by when serverIp is empty', () => {
    expect(buildForwardedHeader('198.51.100.1', '')).toBe('for=198.51.100.1')
  })

  test('omits for when clientIp is empty', () => {
    expect(buildForwardedHeader('', '203.0.113.6')).toBe('by=203.0.113.6')
  })

  test('returns empty string when both IPs empty', () => {
    expect(buildForwardedHeader('', '')).toBe('')
  })

  test('percent-encodes IPv6 colons in values, not in separators', () => {
    const result = buildForwardedHeader('2001:db8::1', '2001:db8::2')
    // Values are encoded (colons -> %3A); the &/= separators are not
    expect(result).toContain('%3A')
    expect(result).toContain('&')
    expect(result).toContain('=')
    // Decoding the value side should give us back the original IPv6
    const forPart =
      result
        .split('&')
        .find((p) => p.startsWith('for='))
        ?.slice(4) ?? ''
    expect(decodeURIComponent(forPart)).toBe('2001:db8::1')
  })
})

describe('buildFraudHeaders', () => {
  beforeEach(() => {
    process.env.HMRC_VENDOR_PUBLIC_IP = '203.0.113.6'
  })

  afterEach(() => {
    delete process.env.HMRC_VENDOR_PUBLIC_IP
  })

  test('Gov-Client-Connection-Method is always WEB_APP_VIA_SERVER', () => {
    const headers = buildFraudHeaders(mockReq({}), BROWSER, 'user-123')
    expect(headers['Gov-Client-Connection-Method']).toBe('WEB_APP_VIA_SERVER')
  })

  test('includes all 10 unconditionally-required Gov-* headers', () => {
    const headers = buildFraudHeaders(mockReq({}), BROWSER, 'user-123')
    const required = [
      'Gov-Client-Connection-Method',
      'Gov-Client-Browser-JS-User-Agent',
      'Gov-Client-Device-ID',
      'Gov-Client-Public-IP-Timestamp',
      'Gov-Client-Screens',
      'Gov-Client-Timezone',
      'Gov-Client-User-IDs',
      'Gov-Client-Window-Size',
      'Gov-Vendor-Product-Name',
      'Gov-Vendor-Version',
    ]
    for (const key of required) {
      expect(headers[key]).toBeTruthy()
    }
  })

  test('Gov-Client-Public-IP-Timestamp is ISO-8601 with millisecond precision and Z suffix', () => {
    const headers = buildFraudHeaders(mockReq({}), BROWSER, 'user-123')
    expect(headers['Gov-Client-Public-IP-Timestamp']).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
    )
  })

  test('Gov-Client-Public-IP is included when x-forwarded-for is present', () => {
    const headers = buildFraudHeaders(
      mockReq({ 'x-forwarded-for': '198.51.100.1' }),
      BROWSER,
      'user-123',
    )
    expect(headers['Gov-Client-Public-IP']).toBe('198.51.100.1')
  })

  test('Gov-Client-Public-IP is omitted when no client IP can be determined', () => {
    const headers = buildFraudHeaders(mockReq({}), BROWSER, 'user-123')
    expect(headers['Gov-Client-Public-IP']).toBeUndefined()
  })

  test('Gov-Client-User-IDs percent-encodes the user identifier', () => {
    const headers = buildFraudHeaders(mockReq({}), BROWSER, 'alice user@example')
    // & and @ both encode, space becomes %20
    expect(headers['Gov-Client-User-IDs']).toBe('easyacco=alice%20user%40example')
  })

  test('Gov-Client-User-IDs keeps separators (=) literal', () => {
    const headers = buildFraudHeaders(mockReq({}), BROWSER, 'plain-id-123')
    expect(headers['Gov-Client-User-IDs']).toBe('easyacco=plain-id-123')
  })

  test('Gov-Client-Timezone passes through verbatim from browser data', () => {
    const headers = buildFraudHeaders(
      mockReq({}),
      { ...BROWSER, timezone: 'UTC+05:30' },
      'user-123',
    )
    expect(headers['Gov-Client-Timezone']).toBe('UTC+05:30')
  })

  test('Gov-Client-Window-Size matches the spec format', () => {
    const headers = buildFraudHeaders(mockReq({}), BROWSER, 'user-123')
    expect(headers['Gov-Client-Window-Size']).toBe('width=1280&height=800')
  })

  test('Gov-Vendor-Product-Name is percent-encoded (easyacco has no special chars but encoding is still applied)', () => {
    const headers = buildFraudHeaders(mockReq({}), BROWSER, 'user-123')
    expect(headers['Gov-Vendor-Product-Name']).toBe('easyacco')
  })

  test('Gov-Vendor-Version follows software-name=version-number format', () => {
    const headers = buildFraudHeaders(mockReq({}), BROWSER, 'user-123')
    expect(headers['Gov-Vendor-Version']).toMatch(/^easyacco=[\d.]+$/)
  })

  test('Gov-Vendor-Forwarded combines server (by) and client (for) when both known', () => {
    const headers = buildFraudHeaders(
      mockReq({ 'x-forwarded-for': '198.51.100.1' }),
      BROWSER,
      'user-123',
    )
    expect(headers['Gov-Vendor-Forwarded']).toBe('by=203.0.113.6&for=198.51.100.1')
  })

  test('Gov-Vendor-Public-IP comes from HMRC_VENDOR_PUBLIC_IP env var', () => {
    const headers = buildFraudHeaders(mockReq({}), BROWSER, 'user-123')
    expect(headers['Gov-Vendor-Public-IP']).toBe('203.0.113.6')
  })

  test('Gov-Vendor-Public-IP is omitted when HMRC_VENDOR_PUBLIC_IP is not set', () => {
    delete process.env.HMRC_VENDOR_PUBLIC_IP
    const headers = buildFraudHeaders(mockReq({}), BROWSER, 'user-123')
    expect(headers['Gov-Vendor-Public-IP']).toBeUndefined()
  })
})
