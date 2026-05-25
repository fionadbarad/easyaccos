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
  timezone: string  // UTC±hh:mm, e.g. "UTC+01:00" or "UTC-05:30"
  deviceId: string  // UUIDv4 stored in localStorage, stable per device
}

// Percent-encode a value per HMRC spec: encode the value, NOT the key=value
// separators. Standard encodeURIComponent covers this correctly.
function pct(v: string): string {
  return encodeURIComponent(v)
}

// Reads the originating client IP from the request, preferring the first entry
// of x-forwarded-for (set by Vercel / proxies) and falling back to x-real-ip.
export function extractClientIp(req: NextRequest): string {
  const xff = req.headers.get('x-forwarded-for')
  if (xff) return xff.split(',')[0]?.trim() ?? ''
  return req.headers.get('x-real-ip') ?? ''
}

// Gov-Client-Screens: comma-separated list of screen entries, one per display.
// Each entry: width=X&height=Y&scaling-factor=Z&colour-depth=W
export function buildScreensHeader(screens: BrowserFraudData['screens']): string {
  return screens
    .map(
      s =>
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
export function buildFraudHeaders(
  req: NextRequest,
  browser: BrowserFraudData,
  userId: string,
): Record<string, string> {
  const clientIp = extractClientIp(req)
  const serverIp = process.env.HMRC_VENDOR_PUBLIC_IP ?? ''

  const headers: Record<string, string> = {
    'Gov-Client-Connection-Method': 'WEB_APP_VIA_SERVER',
    'Gov-Client-Browser-JS-User-Agent': browser.userAgent,
    'Gov-Client-Device-ID': browser.deviceId,
    'Gov-Client-Public-IP-Timestamp': new Date().toISOString(),
    'Gov-Client-Screens': buildScreensHeader(browser.screens),
    'Gov-Client-Timezone': browser.timezone,
    'Gov-Client-User-IDs': `easyacco=${pct(userId)}`,
    'Gov-Client-Window-Size': `width=${browser.windowSize.width}&height=${browser.windowSize.height}`,
    'Gov-Vendor-Product-Name': pct('easyacco'),
    'Gov-Vendor-Version': `easyacco=${pct('1.0.0')}`,
  }

  // Gov-Client-Public-IP: conditional — include when we can determine client IP
  if (clientIp) {
    headers['Gov-Client-Public-IP'] = clientIp
  }

  // Gov-Vendor-Forwarded: required when IP info is available
  const forwarded = buildForwardedHeader(clientIp, serverIp)
  if (forwarded) {
    headers['Gov-Vendor-Forwarded'] = forwarded
  }

  // Gov-Vendor-Public-IP: conditional — include when HMRC_VENDOR_PUBLIC_IP is set
  if (serverIp) {
    headers['Gov-Vendor-Public-IP'] = serverIp
  }

  return headers
}
