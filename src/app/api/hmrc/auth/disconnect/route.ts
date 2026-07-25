import { NextResponse } from 'next/server'
import { clearStateCookie, clearTokensCookie } from '@/lib/hmrc/cookies'
import { MANAGE_AUTHORITY_URL_PROD } from '@/lib/hmrc/constants'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type DisconnectBody = {
  ok: true
  /** Where the user must go to actually withdraw the grant at HMRC's end. */
  manageAuthorityUrl: string
  message: string
}

/**
 * Disconnect from HMRC.
 *
 * WHAT THIS DOES: deletes our encrypted token cookie, so this application can
 * no longer call HMRC on the user's behalf. That is the part we control, and it
 * takes effect immediately.
 *
 * WHAT THIS CANNOT DO: revoke the grant at HMRC. HMRC's OAuth implementation
 * publishes no token-revocation endpoint (there is no RFC-7009 `/oauth/revoke`
 * in their API catalogue) — a user withdraws authority through HMRC's own
 * "Manage authorised applications" service, and until they do, the grant stands
 * for its normal lifetime. We therefore return that URL so the UI can tell the
 * user the truth rather than implying a full revoke happened. (SEC-10)
 *
 * If HMRC later ships a revocation endpoint, the call belongs here, before the
 * cookies are cleared — we still need the refresh token to make it.
 */
export async function POST(): Promise<NextResponse<DisconnectBody>> {
  const res = NextResponse.json<DisconnectBody>({
    ok: true,
    manageAuthorityUrl: process.env.HMRC_MANAGE_AUTHORITY_URL ?? MANAGE_AUTHORITY_URL_PROD,
    message:
      'Disconnected. easyacco can no longer reach HMRC for you. To withdraw the ' +
      'authorisation at HMRC’s end as well, use their Manage authorised applications service.',
  })
  clearTokensCookie(res)
  clearStateCookie(res)
  return res
}
