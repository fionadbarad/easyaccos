import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import type { NextRequest } from 'next/server'
import {
  buildForwardedHeader,
  buildFraudHeaders,
  buildScreensHeader,
  extractClientIp,
  observeClient,
  type BrowserFraudData,
  type ClientObservation,
} from '../fraud-headers'

// vitest runs in node; constructing a NextRequest needs Request + cast,
// which is fine because these helpers only read .headers.get(...).
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

const OBSERVED_AT = '2026-07-25T12:34:56.789Z'
function obs(ip: string, observedAt = OBSERVED_AT): ClientObservation {
  return { ip, observedAt }
}

describe('extractClientIp', () => {
  afterEach(() => {
    delete process.env.HMRC_TRUSTED_PROXY_HOPS
  })

  test('with one trusted proxy, a single x-forwarded-for entry is the client IP', () => {
    expect(extractClientIp(mockReq({ 'x-forwarded-for': '198.51.100.1' }))).toBe('198.51.100.1')
  })

  // The security case: a caller sends their own X-Forwarded-For, our edge
  // appends the IP it actually saw. The appended (rightmost) entry is the real
  // one; the leftmost is attacker-controlled. (MTD-2)
  test('ignores a client-spoofed leading x-forwarded-for entry', () => {
    expect(extractClientIp(mockReq({ 'x-forwarded-for': '203.0.113.99, 198.51.100.1' }))).toBe(
      '198.51.100.1',
    )
  })

  test('ignores several spoofed leading entries', () => {
    expect(
      extractClientIp(mockReq({ 'x-forwarded-for': '1.1.1.1, 2.2.2.2, 3.3.3.3, 198.51.100.1' })),
    ).toBe('198.51.100.1')
  })

  test('honours HMRC_TRUSTED_PROXY_HOPS when more proxies sit in front', () => {
    process.env.HMRC_TRUSTED_PROXY_HOPS = '2'
    // spoofed, real client (seen by outer proxy), outer proxy (seen by inner)
    expect(
      extractClientIp(mockReq({ 'x-forwarded-for': '203.0.113.99, 198.51.100.1, 10.0.0.1' })),
    ).toBe('198.51.100.1')
  })

  test('falls back to x-real-ip when the chain is shorter than the trusted hop count', () => {
    process.env.HMRC_TRUSTED_PROXY_HOPS = '3'
    expect(
      extractClientIp(mockReq({ 'x-forwarded-for': '198.51.100.1', 'x-real-ip': '198.51.100.7' })),
    ).toBe('198.51.100.7')
  })

  test('ignores a non-numeric HMRC_TRUSTED_PROXY_HOPS and uses the default', () => {
    process.env.HMRC_TRUSTED_PROXY_HOPS = 'banana'
    expect(extractClientIp(mockReq({ 'x-forwarded-for': '203.0.113.99, 198.51.100.1' }))).toBe(
      '198.51.100.1',
    )
  })

  test('trims whitespace around entries', () => {
    expect(extractClientIp(mockReq({ 'x-forwarded-for': '  198.51.100.5  ' }))).toBe('198.51.100.5')
  })

  test('falls back to x-real-ip when x-forwarded-for is absent', () => {
    expect(extractClientIp(mockReq({ 'x-real-ip': '198.51.100.2' }))).toBe('198.51.100.2')
  })

  test('returns empty string when no IP header present', () => {
    expect(extractClientIp(mockReq({}))).toBe('')
  })
})

describe('observeClient', () => {
  test('captures the IP and a spec-shaped timestamp together', () => {
    const observation = observeClient(mockReq({ 'x-forwarded-for': '198.51.100.1' }))
    expect(observation.ip).toBe('198.51.100.1')
    expect(observation.observedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
  })

  // The whole point of separating observation from header-building: the
  // timestamp must reflect when we saw the IP, even if the headers are built
  // seconds later after a token refresh. (MTD-2)
  test('the observed timestamp is preserved verbatim into the header', () => {
    const headers = buildFraudHeaders(obs('198.51.100.1'), BROWSER, 'user-123')
    expect(headers['Gov-Client-Public-IP-Timestamp']).toBe(OBSERVED_AT)
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
    delete process.env.NEXT_PUBLIC_APP_VERSION
  })

  test('Gov-Client-Connection-Method is always WEB_APP_VIA_SERVER', () => {
    const headers = buildFraudHeaders(obs(''), BROWSER, 'user-123')
    expect(headers['Gov-Client-Connection-Method']).toBe('WEB_APP_VIA_SERVER')
  })

  test('includes all 10 unconditionally-required Gov-* headers', () => {
    const headers = buildFraudHeaders(obs(''), BROWSER, 'user-123')
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
    const headers = buildFraudHeaders(observeClient(mockReq({})), BROWSER, 'user-123')
    expect(headers['Gov-Client-Public-IP-Timestamp']).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
    )
  })

  test('Gov-Client-Public-IP is included when the observation carries an IP', () => {
    const headers = buildFraudHeaders(obs('198.51.100.1'), BROWSER, 'user-123')
    expect(headers['Gov-Client-Public-IP']).toBe('198.51.100.1')
  })

  test('Gov-Client-Public-IP is omitted when no client IP could be determined', () => {
    const headers = buildFraudHeaders(obs(''), BROWSER, 'user-123')
    expect(headers['Gov-Client-Public-IP']).toBeUndefined()
  })

  test('Gov-Client-User-IDs percent-encodes the user identifier', () => {
    const headers = buildFraudHeaders(obs(''), BROWSER, 'alice user@example')
    // & and @ both encode, space becomes %20
    expect(headers['Gov-Client-User-IDs']).toBe('easyacco=alice%20user%40example')
  })

  test('Gov-Client-User-IDs keeps separators (=) literal', () => {
    const headers = buildFraudHeaders(obs(''), BROWSER, 'plain-id-123')
    expect(headers['Gov-Client-User-IDs']).toBe('easyacco=plain-id-123')
  })

  test('Gov-Client-User-IDs carries a Supabase-shaped UUID unmangled', () => {
    const headers = buildFraudHeaders(obs(''), BROWSER, '0b7f1e6a-5c3d-4a2b-9f10-6d8e2c4b7a91')
    expect(headers['Gov-Client-User-IDs']).toBe('easyacco=0b7f1e6a-5c3d-4a2b-9f10-6d8e2c4b7a91')
  })

  test('Gov-Client-Timezone passes through verbatim from browser data', () => {
    const headers = buildFraudHeaders(obs(''), { ...BROWSER, timezone: 'UTC+05:30' }, 'user-123')
    expect(headers['Gov-Client-Timezone']).toBe('UTC+05:30')
  })

  test('Gov-Client-Window-Size matches the spec format', () => {
    const headers = buildFraudHeaders(obs(''), BROWSER, 'user-123')
    expect(headers['Gov-Client-Window-Size']).toBe('width=1280&height=800')
  })

  test('Gov-Vendor-Product-Name is percent-encoded (easyacco has no special chars but encoding is still applied)', () => {
    const headers = buildFraudHeaders(obs(''), BROWSER, 'user-123')
    expect(headers['Gov-Vendor-Product-Name']).toBe('easyacco')
  })

  test('Gov-Vendor-Version follows software-name=version-number format', () => {
    const headers = buildFraudHeaders(obs(''), BROWSER, 'user-123')
    expect(headers['Gov-Vendor-Version']).toMatch(/^easyacco=[\d.]+$/)
  })

  test('Gov-Vendor-Version tracks NEXT_PUBLIC_APP_VERSION when set', () => {
    process.env.NEXT_PUBLIC_APP_VERSION = '2.4.1'
    const headers = buildFraudHeaders(obs(''), BROWSER, 'user-123')
    expect(headers['Gov-Vendor-Version']).toBe('easyacco=2.4.1')
  })

  test('Gov-Vendor-Forwarded combines server (by) and client (for) when both known', () => {
    const headers = buildFraudHeaders(obs('198.51.100.1'), BROWSER, 'user-123')
    expect(headers['Gov-Vendor-Forwarded']).toBe('by=203.0.113.6&for=198.51.100.1')
  })

  test('Gov-Vendor-Public-IP comes from HMRC_VENDOR_PUBLIC_IP env var', () => {
    const headers = buildFraudHeaders(obs(''), BROWSER, 'user-123')
    expect(headers['Gov-Vendor-Public-IP']).toBe('203.0.113.6')
  })

  test('Gov-Vendor-Public-IP is omitted when HMRC_VENDOR_PUBLIC_IP is not set', () => {
    delete process.env.HMRC_VENDOR_PUBLIC_IP
    const headers = buildFraudHeaders(obs(''), BROWSER, 'user-123')
    expect(headers['Gov-Vendor-Public-IP']).toBeUndefined()
  })
})
