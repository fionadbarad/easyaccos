// @vitest-environment happy-dom

/**
 * useUserData.persist — the write path (TST-1).
 *
 * The read side is pinned by use-user-data.test.tsx and storage-sync.test.ts;
 * until now nothing exercised `persist()` itself: the DAT-5 write-attribution
 * wait, the retry/backoff and syncStatus transitions, the audit diff, or the
 * server-newer conflict merge. The comments in use-user-data.ts cite real
 * incidents for each — these tests replace the comments as the thing holding
 * them.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act, waitFor } from '@testing-library/react'

// ── Fakes ─────────────────────────────────────────────────────────────────────

interface Row {
  id: string
  amount?: number
  updated_at?: string
}

type SessionResolver = (value: { data: { session: { user: { id: string; email?: string } } | null } }) => void
type QueryResult = { data: unknown; error: { message: string } | null }

let resolveSession: SessionResolver
const unsubscribe = vi.fn()

/**
 * Extends the storage-sync.test.ts fake: same thenable query builder, plus the
 * auth surface the hook needs and a transient-failure knob so the retry loop
 * can be driven. `state.failMetaSelects` fails the next N `select('id,
 * updated_at')` calls — the first thing syncSupabaseRows awaits — which makes
 * a whole persist attempt fail without faking anything deeper.
 */
function makeFakeSupabase(serverRows: Row[]) {
  const calls = {
    upserted: [] as Array<Array<Row & { user_id?: string }>>,
    deleted: [] as string[][],
    metaSelects: 0,
  }
  const state = { failMetaSelects: 0 }

  function from() {
    let selectCols = ''
    let filterId: string | null = null

    const builder: Record<string, unknown> = {
      select(cols: string) {
        selectCols = cols
        return builder
      },
      delete() {
        return builder
      },
      eq(col: string, val: string) {
        if (col === 'id') filterId = val
        return builder
      },
      order() {
        return Promise.resolve({ data: serverRows, error: null })
      },
      single() {
        const row = serverRows.find((r) => r.id === filterId) ?? null
        return Promise.resolve({ data: row, error: null })
      },
      in(_col: string, ids: string[]) {
        calls.deleted.push(ids)
        return Promise.resolve({ error: null })
      },
      upsert(rows: Array<Row & { user_id?: string }>) {
        calls.upserted.push(rows)
        return Promise.resolve({ error: null })
      },
      then(resolve: (value: QueryResult) => void) {
        if (selectCols === 'id, updated_at') {
          calls.metaSelects++
          if (state.failMetaSelects > 0) {
            state.failMetaSelects--
            resolve({ data: null, error: { message: 'transient network failure' } })
            return
          }
          resolve({
            data: serverRows.map((r) => ({ id: r.id, updated_at: r.updated_at ?? null })),
            error: null,
          })
          return
        }
        resolve({ data: null, error: null })
      },
    }
    return builder
  }

  return {
    client: {
      auth: {
        getSession: vi.fn(
          () =>
            new Promise((res) => {
              resolveSession = res as SessionResolver
            }),
        ),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe } } }),
      },
      from,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any,
    calls,
    state,
  }
}

let fake: ReturnType<typeof makeFakeSupabase>

vi.mock('@/lib/supabase-client-singleton', () => ({
  getSupabaseBrowserClient: () => fake.client,
}))

vi.mock('@/lib/monitor', () => ({ reportError: vi.fn(), reportWarn: vi.fn() }))

let guestSnapshot: Row[] = []
const secureWrites: Array<{ key: string; data: Row[] }> = []
vi.mock('@/lib/storage/secure-store', () => ({
  secureRead: async () => guestSnapshot,
  secureWrite: async (key: string, data: Row[]) => {
    secureWrites.push({ key, data })
    return true
  },
}))

const appendAuditLog = vi.fn(async () => {})
vi.mock('@/lib/audit', () => ({
  appendAuditLog: (...a: unknown[]) => appendAuditLog(...(a as [])),
}))

// ── Harness ───────────────────────────────────────────────────────────────────

import { useUserData, syncSupabaseRows } from '@/lib/use-user-data'

const STABLE_SEED: never[] = []
let persistFn: ((next: Row[]) => Promise<void>) | null = null

function Probe() {
  const { persist, loading, syncStatus, items } = useUserData<Row>(
    'user_expenses',
    'easyacco_expenses',
    STABLE_SEED,
  )
  persistFn = persist
  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="sync">{syncStatus}</span>
      <span data-testid="ids">{items.map((i) => i.id).join(',')}</span>
    </div>
  )
}

beforeEach(() => {
  fake = makeFakeSupabase([])
  persistFn = null
  guestSnapshot = []
  secureWrites.length = 0
  appendAuditLog.mockClear()
  unsubscribe.mockClear()
})

afterEach(() => {
  vi.useRealTimers()
})

// ── DAT-5: write fired while the session is still resolving ───────────────────

describe('persist during session resolution', () => {
  it('waits for the session and attributes the write to the real account, not guest', async () => {
    // If this fails, an action taken in the first ~200ms of a page load writes
    // the rows to the guest store and later syncs them into the wrong account —
    // the DAT-5 cross-account corruption incident.
    render(<Probe />)
    let p!: Promise<void>
    await act(async () => {
      p = persistFn!([{ id: 'r1', amount: 5 }])
      resolveSession({ data: { session: { user: { id: 'u1' } } } })
      await p
    })

    expect(fake.calls.upserted.length).toBe(1)
    expect(fake.calls.upserted[0]![0]!.user_id).toBe('u1')
    expect(secureWrites.some((w) => w.key === 'user_expenses:u1')).toBe(true)
    expect(secureWrites.some((w) => w.key.includes('guest'))).toBe(false)
  })

  it('writes a resolved guest to the guest store and never calls Supabase', async () => {
    // If this fails, guest (offline) users either lose their write or leak it
    // into a network call that has no account to land in.
    render(<Probe />)
    await act(async () => {
      resolveSession({ data: { session: null } })
    })
    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'))

    await act(async () => {
      await persistFn!([{ id: 'g1', amount: 2 }])
    })

    expect(fake.calls.upserted).toEqual([])
    expect(secureWrites.some((w) => w.key === 'user_expenses:guest')).toBe(true)
  })
})

// ── Retry / syncStatus ────────────────────────────────────────────────────────

async function renderSignedIn() {
  render(<Probe />)
  await act(async () => {
    resolveSession({ data: { session: { user: { id: 'u1' } } } })
  })
  await waitFor(() => expect(screen.getByTestId('sync').textContent).toBe('synced'))
}

describe('persist retry and syncStatus', () => {
  it('retries a failed sync with backoff and lands on synced', async () => {
    // If this fails, one transient network blip permanently drops the user's
    // write instead of retrying, with no error surfaced.
    await renderSignedIn()
    fake.state.failMetaSelects = 1
    vi.useFakeTimers()

    await act(async () => {
      const p = persistFn!([{ id: 'n1', amount: 1 }])
      await vi.advanceTimersByTimeAsync(2100)
      await p
    })

    expect(fake.calls.metaSelects).toBe(2)
    expect(fake.calls.upserted.length).toBe(1)
    expect(screen.getByTestId('sync').textContent).toBe('synced')
  })

  it('gives up after 3 attempts and reports syncStatus error', async () => {
    // If this fails, a dead connection leaves syncStatus claiming 'synced' and
    // the user believes rows are on the server when they are not.
    await renderSignedIn()
    fake.state.failMetaSelects = 3
    vi.useFakeTimers()

    await act(async () => {
      const p = persistFn!([{ id: 'n1', amount: 1 }])
      await vi.advanceTimersByTimeAsync(7000)
      await p
    })

    expect(fake.calls.metaSelects).toBe(3)
    expect(fake.calls.upserted).toEqual([])
    expect(screen.getByTestId('sync').textContent).toBe('error')
    // The rows still reach the local cache so the data is not lost outright.
    expect(secureWrites.some((w) => w.key === 'user_expenses:u1')).toBe(true)
  })
})

// ── emitAuditDiff ─────────────────────────────────────────────────────────────

describe('audit diff on persist', () => {
  it('emits exactly one entry per changed row — create, update, delete — and none for unchanged', async () => {
    // If this fails, the audit trail either misses a change (a compliance gap)
    // or logs untouched rows (noise that buries the real changes).
    guestSnapshot = [
      { id: 'a', amount: 1 },
      { id: 'b', amount: 2 },
      { id: 'd', amount: 4 },
    ]
    render(<Probe />)
    await act(async () => {
      resolveSession({ data: { session: null } })
    })
    await waitFor(() => expect(screen.getByTestId('ids').textContent).toBe('a,b,d'))

    await act(async () => {
      await persistFn!([
        { id: 'a', amount: 9 }, // changed
        { id: 'b', amount: 2 }, // untouched
        { id: 'c', amount: 3 }, // new
      ]) // 'd' removed
    })

    const entries = appendAuditLog.mock.calls.map(
      (c) => c[0] as { entityId: string; op: string; actor: string },
    )
    expect(entries).toHaveLength(3)
    expect(entries.find((e) => e.entityId === 'a')?.op).toBe('update')
    expect(entries.find((e) => e.entityId === 'c')?.op).toBe('create')
    expect(entries.find((e) => e.entityId === 'd')?.op).toBe('delete')
    expect(entries.every((e) => e.actor === 'guest')).toBe(true)
  })
})

// ── Server-newer conflict merge ───────────────────────────────────────────────

describe('syncSupabaseRows conflict branch', () => {
  it('publishes the newer server row through setItems without mutating the callers array', async () => {
    // If this fails, a stale tab either overwrites newer server data or mutates
    // live React state in place — the value changes without a re-render.
    const serverRow: Row = { id: 'a', amount: 99, updated_at: '2026-08-10T12:00:00.000Z' }
    const local: Row = { id: 'a', amount: 1, updated_at: '2026-08-01T00:00:00.000Z' }
    const conflicted = makeFakeSupabase([serverRow])
    const updaters: Array<(prev: Row[]) => Row[]> = []

    const ok = await syncSupabaseRows(
      conflicted.client,
      'user_expenses',
      'u1',
      [local],
      [],
      '2026-08-10T13:00:00.000Z',
      (u) => updaters.push(u as (prev: Row[]) => Row[]),
    )

    expect(ok).toBe(true)
    // The stale local row is never pushed up over the newer server row.
    expect(conflicted.calls.upserted).toEqual([])
    expect(updaters).toHaveLength(1)
    const prev = [{ ...local }]
    const out = updaters[0]!(prev)
    expect(out).not.toBe(prev)
    expect(out[0]!.amount).toBe(99)
    expect(prev[0]!.amount).toBe(1) // caller's array untouched
  })
})
