/**
 * resolveSubmissionUserId() decides who is allowed to file a tax return. It is
 * the whole implementation of SEC-7: the Gov-Client-User-IDs value comes from
 * the server-side Supabase session and never from the client. Every submit
 * route test mocks this module out, so these are the only tests that execute
 * it. (TST-12)
 *
 * The four branches below are the access-control contract: a verified session
 * passes its user id through; a failed or absent session is a 401; and if the
 * auth infrastructure itself is down, the caller gets a 503 and
 * `reportError('hmrc.identity.sessionLookup', …)` is the only signal anyone
 * gets that it happened.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

type GetUserResult = { data: { user: { id: string } | null }; error: { message: string } | null }

const supabase = vi.hoisted(() => ({
  createClient: undefined as (() => Promise<unknown>) | undefined,
}))

vi.mock('@/lib/supabase-server', () => ({
  createClient: () => {
    if (!supabase.createClient) throw new Error('test forgot to set createClient')
    return supabase.createClient()
  },
}))

const reportError = vi.hoisted(() => vi.fn())

vi.mock('@/lib/monitor', () => ({ reportError }))

function clientReturning(result: GetUserResult) {
  return async () => ({ auth: { getUser: async () => result } })
}

beforeEach(() => {
  vi.resetModules()
  supabase.createClient = undefined
  reportError.mockReset()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('resolveSubmissionUserId', () => {
  it('returns the session user id when getUser() verifies a user', async () => {
    supabase.createClient = clientReturning({ data: { user: { id: 'user-abc' } }, error: null })

    const { resolveSubmissionUserId } = await import('@/lib/hmrc/identity')
    const result = await resolveSubmissionUserId()

    expect(result).toEqual({ ok: true, userId: 'user-abc' })
    expect(reportError).not.toHaveBeenCalled()
  })

  it('401s when getUser() returns an error, asking the caller to sign in again', async () => {
    // A getUser() error means the cookie could not be verified against
    // Supabase — the caller is not identified, so they must not file.
    supabase.createClient = clientReturning({
      data: { user: { id: 'stale-cookie-user' } },
      error: { message: 'invalid JWT' },
    })

    const { resolveSubmissionUserId } = await import('@/lib/hmrc/identity')
    const result = await resolveSubmissionUserId()

    expect(result).toEqual({
      ok: false,
      status: 401,
      message: 'Could not verify your session. Please sign in again before submitting.',
    })
  })

  it('401s a signed-out caller (getUser() returns user: null)', async () => {
    // The SEC-7 behaviour change: an HMRC OAuth cookie alone is not enough —
    // an authenticated Supabase session is required to submit.
    supabase.createClient = clientReturning({ data: { user: null }, error: null })

    const { resolveSubmissionUserId } = await import('@/lib/hmrc/identity')
    const result = await resolveSubmissionUserId()

    expect(result).toEqual({
      ok: false,
      status: 401,
      message: 'You must be signed in to easyacco to submit to HMRC.',
    })
  })

  it('503s and reports when createClient() throws — auth infrastructure down', async () => {
    const outage = new Error('supabase unreachable')
    supabase.createClient = async () => {
      throw outage
    }

    const { resolveSubmissionUserId } = await import('@/lib/hmrc/identity')
    const result = await resolveSubmissionUserId()

    expect(result).toEqual({
      ok: false,
      status: 503,
      message: 'Sign-in service is unavailable, so the submission cannot be attributed to you.',
    })
    // The tag is the only signal anyone gets that auth infrastructure is down.
    expect(reportError).toHaveBeenCalledWith('hmrc.identity.sessionLookup', outage)
  })
})
