// @vitest-environment happy-dom

/**
 * useUserData — the session-resolution invariants.
 *
 * This hook is what every dashboard page reads its data through, and its
 * comments record five separate bugs that already happened here. Until now not
 * one of them had a regression test, because the logic lives in effects and
 * refs rather than in a function you can call. `diffDeletedIds` and
 * `syncSupabaseRows` were extracted and covered; the orchestration was not.
 *
 * The worst of the five is DAT-5. `user` had two states, so "still resolving"
 * was indistinguishable from "signed out", and every mount loaded the GUEST
 * snapshot before the session came back. Usually that was a flash of the wrong
 * data — but a user who acted inside that window ran `persist` holding guest
 * items and, milliseconds later, an authenticated user, upserting guest rows
 * into their real account. That is silent cross-account data corruption in a
 * tax app, and the only thing preventing its return is an `=== null` check that
 * reads like a style choice.
 *
 * These tests hold the session open deliberately, which is the state the bugs
 * live in and the one you cannot reach by clicking around.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act, waitFor } from '@testing-library/react'

// ── Fakes ─────────────────────────────────────────────────────────────────────

type SessionResolver = (value: { data: { session: { user: { id: string } } | null } }) => void

let resolveSession: SessionResolver
let authCallback: ((event: string, session: { user: { id: string } } | null) => void) | null = null
let selectCalls = 0
const unsubscribe = vi.fn()

function makeSupabase() {
  return {
    auth: {
      getSession: vi.fn(
        () =>
          new Promise((res) => {
            resolveSession = res as SessionResolver
          }),
      ),
      onAuthStateChange: (cb: typeof authCallback) => {
        authCallback = cb
        return { data: { subscription: { unsubscribe } } }
      },
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          order: () => {
            selectCalls++
            return Promise.resolve({ data: [{ id: 'remote-1' }], error: null })
          },
        }),
      }),
    }),
  }
}

let supabaseInstance: ReturnType<typeof makeSupabase> | null = null

vi.mock('@/lib/supabase-client-singleton', () => ({
  getSupabaseBrowserClient: () => supabaseInstance,
}))

vi.mock('@/lib/monitor', () => ({ reportError: vi.fn(), reportWarn: vi.fn() }))

const secureRead = vi.fn(async () => [{ id: 'guest-1' }])
const secureWrite = vi.fn(async () => true)
vi.mock('@/lib/storage/secure-store', () => ({
  secureRead: (...a: unknown[]) => secureRead(...(a as [])),
  secureWrite: (...a: unknown[]) => secureWrite(...(a as [])),
}))

vi.mock('@/lib/audit', () => ({ appendAuditLog: vi.fn(async () => {}) }))

// ── Harness ───────────────────────────────────────────────────────────────────

import { useUserData } from '@/lib/use-user-data'

// A single array identity, reused across every render — the control case.
const STABLE_SEED: never[] = []

function Probe({ seedInline }: { seedInline?: boolean }) {
  // An inline [] is a fresh identity every render — the exact shape that caused
  // the unbounded reload loop when `seed` was a dependency of the load effect.
  const { items, loading, isAuthenticated } = useUserData(
    'expenses' as never,
    'easyacco_expenses',
    seedInline ? [] : STABLE_SEED,
  )
  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="auth">{String(isAuthenticated)}</span>
      <span data-testid="ids">{items.map((i) => (i as { id: string }).id).join(',')}</span>
    </div>
  )
}

beforeEach(() => {
  supabaseInstance = makeSupabase()
  authCallback = null
  selectCalls = 0
  secureRead.mockClear()
  secureWrite.mockClear()
  unsubscribe.mockClear()
})

afterEach(() => {
  vi.useRealTimers()
})

// ── DAT-5: the three-state user ───────────────────────────────────────────────

describe('while the session is still resolving', () => {
  it('loads nothing at all — not the guest snapshot', async () => {
    render(<Probe />)
    // Session deliberately left unresolved. This is the window in which the old
    // code showed guest rows to a signed-in user.
    await act(async () => {
      await Promise.resolve()
    })
    expect(secureRead).not.toHaveBeenCalled()
    expect(screen.getByTestId('ids').textContent).toBe('')
  })

  it('keeps loading true rather than settling on a guess', async () => {
    render(<Probe />)
    await act(async () => {
      await Promise.resolve()
    })
    expect(screen.getByTestId('loading').textContent).toBe('true')
  })

  it('reports not-authenticated without claiming the user is a guest', async () => {
    render(<Probe />)
    await act(async () => {
      await Promise.resolve()
    })
    // isAuthenticated is false, but crucially no guest DATA was loaded above.
    expect(screen.getByTestId('auth').textContent).toBe('false')
  })
})

describe('once the session resolves', () => {
  it('loads remote rows for a signed-in user', async () => {
    render(<Probe />)
    await act(async () => {
      resolveSession({ data: { session: { user: { id: 'u1' } } } })
    })
    await waitFor(() => expect(screen.getByTestId('ids').textContent).toBe('remote-1'))
    expect(screen.getByTestId('auth').textContent).toBe('true')
    expect(secureRead).not.toHaveBeenCalled()
  })

  it('loads the guest snapshot only after resolving to signed-out', async () => {
    render(<Probe />)
    expect(secureRead).not.toHaveBeenCalled()
    await act(async () => {
      resolveSession({ data: { session: null } })
    })
    await waitFor(() => expect(secureRead).toHaveBeenCalled())
    await waitFor(() => expect(screen.getByTestId('ids').textContent).toBe('guest-1'))
  })

  it('treats a failed session lookup as signed-out instead of hanging forever', async () => {
    // A rejected getSession is still an answer. Leaving `user` undefined would
    // strand the loader on true for the life of the page.
    supabaseInstance!.auth.getSession = vi.fn(() => Promise.reject(new Error('network')))
    render(<Probe />)
    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'))
    expect(screen.getByTestId('ids').textContent).toBe('guest-1')
  })
})

// ── The reload loop ───────────────────────────────────────────────────────────

describe('seed identity', () => {
  it('does not re-run the load when seed is a fresh array each render', async () => {
    // Four call sites pass an inline []. With `seed` in the effect deps, each
    // load's setItems triggered a render, which made a new array, which re-ran
    // the effect — an unbounded stream of Supabase selects for as long as the
    // page stayed open.
    const { rerender } = render(<Probe seedInline />)
    await act(async () => {
      resolveSession({ data: { session: { user: { id: 'u1' } } } })
    })
    await waitFor(() => expect(selectCalls).toBe(1))
    for (let i = 0; i < 5; i++) {
      rerender(<Probe seedInline />)
      await act(async () => {
        await Promise.resolve()
      })
    }
    expect(selectCalls).toBe(1)
  })
})

// ── Cleanup ───────────────────────────────────────────────────────────────────

describe('unmount', () => {
  it('unsubscribes from auth changes', async () => {
    const { unmount } = render(<Probe />)
    await act(async () => {
      resolveSession({ data: { session: null } })
    })
    unmount()
    expect(unsubscribe).toHaveBeenCalled()
  })

  it('does not set state after unmount when the session resolves late', async () => {
    // The `mounted` flag exists for this. A React state update on an unmounted
    // component is the classic source of a console error nobody can reproduce.
    const errors: unknown[] = []
    const spy = vi.spyOn(console, 'error').mockImplementation((...a) => errors.push(a))
    const { unmount } = render(<Probe />)
    unmount()
    await act(async () => {
      resolveSession({ data: { session: { user: { id: 'u1' } } } })
    })
    expect(errors).toEqual([])
    spy.mockRestore()
  })
})

// ── Auth changes ──────────────────────────────────────────────────────────────

describe('auth state change', () => {
  it('reloads for the new account after the debounce', async () => {
    vi.useFakeTimers()
    render(<Probe />)
    await act(async () => {
      resolveSession({ data: { session: null } })
      await Promise.resolve()
    })
    await act(async () => {
      authCallback?.('SIGNED_IN', { user: { id: 'u2' } })
      vi.advanceTimersByTime(60)
    })
    await act(async () => {
      await Promise.resolve()
    })
    expect(screen.getByTestId('auth').textContent).toBe('true')
  })
})
