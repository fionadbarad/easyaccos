import { createClient } from '@/lib/supabase-server'
import { reportError } from '@/lib/monitor'

/**
 * Resolves the identifier that goes into HMRC's `Gov-Client-User-IDs` header.
 *
 * That header is a fraud-prevention signal: it tells HMRC which user *of our
 * service* is behind a submission, so they can spot one account filing for many
 * taxpayers. Previously the submit routes took it from the request body, where
 * the browser had generated a random UUID into localStorage — so it identified
 * nothing, and any caller could send any value they liked in a header whose
 * entire purpose is to be trustworthy. It is now derived from the Supabase
 * session, server-side, and is not accepted from the client at all. (SEC-7)
 *
 * ACCESS-CONTROL NOTE: this makes an authenticated Supabase session a
 * requirement for submitting to HMRC. Previously the submit routes were gated
 * only by the HMRC OAuth cookie, so a signed-out visitor who had completed the
 * HMRC consent flow could file. Requiring login to file a tax return is the
 * intended behaviour, but it *is* a behaviour change — see the PR description.
 */
export type SubmissionIdentity =
  { ok: true; userId: string } | { ok: false; status: number; message: string }

export async function resolveSubmissionUserId(): Promise<SubmissionIdentity> {
  let user: { id: string } | null = null
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.getUser()
    if (error) {
      return {
        ok: false,
        status: 401,
        message: 'Could not verify your session. Please sign in again before submitting.',
      }
    }
    user = data.user
  } catch (err) {
    reportError('hmrc.identity.sessionLookup', err)
    return {
      ok: false,
      status: 503,
      message: 'Sign-in service is unavailable, so the submission cannot be attributed to you.',
    }
  }

  if (!user) {
    return {
      ok: false,
      status: 401,
      message: 'You must be signed in to easyacco to submit to HMRC.',
    }
  }

  return { ok: true, userId: user.id }
}
