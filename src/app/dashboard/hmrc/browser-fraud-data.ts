/**
 * Client-side collection of HMRC's browser fraud-prevention data.
 *
 * Shared by every MTD submission section (Income Tax and VAT). It lives in its
 * own module rather than inside one of them because a second copy of this
 * logic is a real hazard: the device ID is keyed in localStorage, the timezone
 * has a format HMRC validates, and two drifting copies would produce
 * submissions whose fraud headers disagree depending on which screen filed
 * them.
 *
 * NOTE: there is deliberately no getOrCreateUserId() here. The value for
 * HMRC's Gov-Client-User-IDs is derived from the Supabase session on the server
 * (src/lib/hmrc/identity.ts) and is not accepted from the client — a
 * browser-generated UUID identified nobody, and letting the client set a
 * fraud-prevention header defeats the point of it. (SEC-7)
 *
 * Gov-Client-Device-ID below is different: HMRC specifies it as a client-
 * generated identifier stable per *device*, so localStorage is the right home.
 */

import type { BrowserFraudData } from '@/lib/hmrc/fraud-headers'

function getOrCreateDeviceId(): string {
  const KEY = 'hmrc_device_id'
  try {
    let id = window.localStorage.getItem(KEY)
    if (!id) {
      id = window.crypto.randomUUID()
      window.localStorage.setItem(KEY, id)
    }
    return id
  } catch {
    return window.crypto.randomUUID()
  }
}

function browserTimezone(): string {
  const offsetMin = -new Date().getTimezoneOffset()
  const sign = offsetMin >= 0 ? '+' : '-'
  const abs = Math.abs(offsetMin)
  const h = String(Math.floor(abs / 60)).padStart(2, '0')
  const m = String(abs % 60).padStart(2, '0')
  return `UTC${sign}${h}:${m}`
}

export function collectBrowserFraudData(): BrowserFraudData {
  return {
    userAgent: window.navigator.userAgent,
    screens: [
      {
        width: window.screen.width,
        height: window.screen.height,
        scalingFactor: window.devicePixelRatio || 1,
        colourDepth: window.screen.colorDepth,
      },
    ],
    windowSize: { width: window.innerWidth, height: window.innerHeight },
    timezone: browserTimezone(),
    deviceId: getOrCreateDeviceId(),
  }
}
