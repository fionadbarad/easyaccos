import type { NextRequest } from 'next/server'

// Browser-side data collected before the API call and sent in the request body.
// The server cannot read screen dimensions, timezone, or localStorage — the
// client must collect these and forward them so the server can build the
// correct Gov-Client-* headers.
export type BrowserFraudData = {
  userAgent: string
  screens: Array<{
    width: number
    height: number
    scalingFactor: number
    colourDepth: number
  }>
  windowSize: { width: number; height: number }
  timezone: string // UTC±hh:mm, e.g. "UTC+01:00" or "UTC-05:30"
  deviceId: string // UUIDv4 stored in localStorage, stable per device
}

// A single observation of the calling client, captured at the moment the
// request lands on our server. Both fields MUST be captured together: HMRC's
// Gov-Client-Public-IP-Timestamp is defined as the time at which the public IP
// in Gov-Client-Public-IP was collected, which for a WEB_APP_VIA_SERVER
// connection is when the backend receives the request from the client — NOT
// whenever we happen to get round to building the outbound headers. (MTD-2)
export type ClientObservation = {
  ip: string
  observedAt: string // ISO-8601 UTC, ms precision: yyyy-MM-ddThh:mm:ss.sssZ
}

// Percent-encode a value per HMRC spec: encode the value, NOT the key=value
// separators. Standard encodeURIComponent covers this correctly.
function pct(v: string): string {
  return encodeURIComponent(v)
}

// How many reverse proxies sit between the public internet and this app.
// On Vercel that is exactly one (the edge network). Self-hosting behind an
// extra load balancer or CDN means raising this.
const DEFAULT_TRUSTED_PROXY_HOPS = 1

function trustedProxyHops(): number {
  const raw = process.env.HMRC_TRUSTED_PROXY_HOPS
  if (!raw) return DEFAULT_TRUSTED_PROXY_HOPS
  const n = Number.parseInt(raw, 10)
  return Number.isInteger(n) && n >= 1 ? n : DEFAULT_TRUSTED_PROXY_HOPS
}

// Reads the originating client IP from the request.
//
// X-Forwarded-For is APPENDED to as a request crosses each proxy, so the list
// reads `<what the client claimed>, <observed by hop 1>, <observed by hop 2>…`.
// Only the entries our own trusted proxies appended are trustworthy: anything
// to the left of those was supplied by the caller and is trivially forged by
// sending an X-Forwarded-For header of their own.
//
// We therefore count in from the RIGHT by the number of proxies we actually run
// (`HMRC_TRUSTED_PROXY_HOPS`, default 1 for Vercel's edge). Sending HMRC a
// spoofed public IP in a fraud-prevention header is precisely the thing those
// headers exist to stop, so this must not read the leftmost entry. (MTD-2)
export function extractClientIp(req: NextRequest): string {
  const xff = req.headers.get('x-forwarded-for')
  if (xff) {
    const hops = xff
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    const idx = hops.length - trustedProxyHops()
    // idx < 0 means the request reached us with fewer hops than we expect our
    // own infrastructure to add — the chain isn't what we assume, so we can't
    // pick a trustworthy entry out of it. Fall through to x-real-ip.
    if (idx >= 0 && idx < hops.length) return hops[idx]!
  }
  return req.headers.get('x-real-ip')?.trim() ?? ''
}

// Captures the client IP together with the timestamp of that observation.
// Call this at the TOP of a route handler, before any awaited work (token
// refresh, database reads) — otherwise the timestamp drifts away from the
// moment the IP was actually seen.
export function observeClient(req: NextRequest): ClientObservation {
  return {
    ip: extractClientIp(req),
    observedAt: new Date().toISOString(),
  }
}

/**
 * Field-level validation of the client-supplied fraud payload.
 *
 * `buildFraudHeaders` walks into `browser.screens` and `browser.windowSize`
 * without guarding, and it runs OUTSIDE the submit routes' try/catch — so a
 * body of `{"browser":{}}` reached it as a TypeError and surfaced as a bare
 * 500 with nothing telling the caller what was wrong. The routes only ever
 * checked that `browser` was truthy, which `{}` is.
 *
 * Header values are also checked for CR/LF: Node's fetch rejects those outright,
 * turning a malformed user agent into a misleading "network error reaching
 * HMRC" rather than the 400 it is.
 *
 * Returns the list of unusable field paths — empty when the payload is safe.
 */
/** Gov-Client-Device-ID is a UUID; ours comes from crypto.randomUUID(). */
const DEVICE_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Gov-Client-Timezone is 'UTC' plus a signed offset, e.g. UTC+01:00, UTC-05:30. */
const TIMEZONE_PATTERN = /^UTC[+-](?:0\d|1[0-4]):[0-5]\d$/

export function invalidBrowserFields(browser: unknown): string[] {
  const bad: string[] = []
  if (!browser || typeof browser !== 'object') return ['browser']
  const b = browser as Partial<BrowserFraudData>

  const headerSafe = (v: unknown): v is string =>
    typeof v === 'string' && v.length > 0 && !/[\r\n]/.test(v)

  if (!headerSafe(b.userAgent)) bad.push('browser.userAgent')

  // deviceId and timezone are not free text: HMRC specifies a format for each,
  // and a value that merely contains no newlines still gets the submission
  // rejected on the fraud-prevention headers rather than on its contents —
  // which is the slowest possible way to learn about a typo.
  //
  // Both are ours to get right rather than the user's: deviceId comes from
  // crypto.randomUUID() and timezone is formatted by the client, so a value
  // failing here means our own code sent something malformed.
  if (!headerSafe(b.deviceId)) bad.push('browser.deviceId')
  else if (!DEVICE_ID_PATTERN.test(b.deviceId)) bad.push('browser.deviceId (must be a UUID)')

  if (!headerSafe(b.timezone)) bad.push('browser.timezone')
  else if (!TIMEZONE_PATTERN.test(b.timezone)) {
    bad.push('browser.timezone (must be UTC±hh:mm)')
  }

  if (!Array.isArray(b.screens) || b.screens.length === 0) {
    bad.push('browser.screens')
  } else if (
    !b.screens.every(
      (s) =>
        s &&
        typeof s === 'object' &&
        Number.isFinite(s.width) &&
        Number.isFinite(s.height) &&
        Number.isFinite(s.scalingFactor) &&
        Number.isFinite(s.colourDepth),
    )
  ) {
    bad.push('browser.screens')
  }

  const w = b.windowSize
  if (!w || typeof w !== 'object' || !Number.isFinite(w.width) || !Number.isFinite(w.height)) {
    bad.push('browser.windowSize')
  }

  return bad
}

// Gov-Client-Screens: comma-separated list of screen entries, one per display.
// Each entry: width=X&height=Y&scaling-factor=Z&colour-depth=W
export function buildScreensHeader(screens: BrowserFraudData['screens']): string {
  return screens
    .map(
      (s) =>
        `width=${s.width}&height=${s.height}&scaling-factor=${s.scalingFactor}&colour-depth=${s.colourDepth}`,
    )
    .join(',')
}

// Gov-Vendor-Forwarded: by=<server_ip>&for=<client_ip>
// Describes the proxy hop: our server (by) forwarding on behalf of the user (for).
// Values are percent-encoded; separators (= and &) are not.
export function buildForwardedHeader(clientIp: string, serverIp: string): string {
  const parts: string[] = []
  if (serverIp) parts.push(`by=${pct(serverIp)}`)
  if (clientIp) parts.push(`for=${pct(clientIp)}`)
  return parts.join('&')
}

// Builds all required Gov-Client-* and Gov-Vendor-* fraud prevention headers
// for a WEB_APP_VIA_SERVER connection to HMRC's MTD APIs.
//
// Spec: https://developer.service.hmrc.gov.uk/guides/fraud-prevention/
//       connection-method/web-app-via-server/
//
// Required unconditionally (11):
//   Gov-Client-Connection-Method, Gov-Client-Browser-JS-User-Agent,
//   Gov-Client-Device-ID, Gov-Client-Public-IP-Timestamp,
//   Gov-Client-Screens, Gov-Client-Timezone, Gov-Client-User-IDs,
//   Gov-Client-Window-Size, Gov-Vendor-Product-Name, Gov-Vendor-Version,
//   Gov-Vendor-Forwarded (required; omitted only when no IP info available)
//
// Conditional (included when available):
//   Gov-Client-Public-IP, Gov-Vendor-Public-IP
//
// Omitted (not applicable to easyacco):
//   Gov-Client-Multi-Factor (only if MFA was used during login)
//   Gov-Client-Public-Port (excluded for standard HTTPS port 443)
//   Gov-Vendor-License-IDs (no licensed third-party software involved)
//
// `userId` identifies the user WITHIN OUR SERVICE and must be derived from the
// authenticated server-side session — never from the request body, or a caller
// can put anything they like in a fraud-prevention header. (SEC-7)
export function buildFraudHeaders(
  observation: ClientObservation,
  browser: BrowserFraudData,
  userId: string,
): Record<string, string> {
  const serverIp = process.env.HMRC_VENDOR_PUBLIC_IP ?? ''

  const headers: Record<string, string> = {
    'Gov-Client-Connection-Method': 'WEB_APP_VIA_SERVER',
    'Gov-Client-Browser-JS-User-Agent': browser.userAgent,
    'Gov-Client-Device-ID': browser.deviceId,
    'Gov-Client-Public-IP-Timestamp': observation.observedAt,
    'Gov-Client-Screens': buildScreensHeader(browser.screens),
    'Gov-Client-Timezone': browser.timezone,
    'Gov-Client-User-IDs': `easyacco=${pct(userId)}`,
    'Gov-Client-Window-Size': `width=${browser.windowSize.width}&height=${browser.windowSize.height}`,
    'Gov-Vendor-Product-Name': pct('easyacco'),
    'Gov-Vendor-Version': `easyacco=${pct(vendorVersion())}`,
  }

  // Gov-Client-Public-IP: conditional — include when we can determine client IP
  if (observation.ip) {
    headers['Gov-Client-Public-IP'] = observation.ip
  }

  // Gov-Vendor-Forwarded: required when IP info is available
  const forwarded = buildForwardedHeader(observation.ip, serverIp)
  if (forwarded) {
    headers['Gov-Vendor-Forwarded'] = forwarded
  }

  // Gov-Vendor-Public-IP: conditional — include when HMRC_VENDOR_PUBLIC_IP is set
  if (serverIp) {
    headers['Gov-Vendor-Public-IP'] = serverIp
  }

  return headers
}

// HMRC expects the version of the software actually making the call. Kept as a
// plain dotted version: HMRC's checker is strict about this field's shape, so
// this deliberately does NOT append build metadata (a commit SHA etc.) until
// that has been validated against their Test Fraud Prevention Headers API.
function vendorVersion(): string {
  return process.env.NEXT_PUBLIC_APP_VERSION ?? '1.0.0'
}
