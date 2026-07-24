import { describe, it, expect, vi, beforeEach } from 'vitest'
import { diffDeletedIds, syncSupabaseRows } from '@/lib/use-user-data'

vi.mock('@/lib/monitor', () => ({
  reportError: vi.fn(),
  reportWarn: vi.fn(),
}))

interface Row {
  id: string
  updated_at?: string
  amount?: number
}

type QueryResult = { data: unknown; error: null }
type Resolve = (value: QueryResult) => void

/**
 * Records every write the sync path makes against a fake Supabase table so a
 * test can assert exactly which rows were deleted / upserted. The chainable
 * builder is thenable, matching how `syncSupabaseRows` awaits the query chains
 * directly (`await supabase.from(t).select(...).eq(...)`).
 */
function makeFakeSupabase(serverRows: Row[]) {
  const calls = {
    deleted: [] as string[][],
    deleteFilters: [] as Array<{ user_id?: string }>,
    upserted: [] as Row[][],
  }

  function from() {
    let mode: 'select' | 'delete' | 'upsert' = 'select'
    let selectCols = ''
    let filterId: string | null = null
    const deleteFilter: { user_id?: string } = {}

    const builder: Record<string, unknown> = {
      select(cols: string) {
        mode = 'select'
        selectCols = cols
        return builder
      },
      delete() {
        mode = 'delete'
        return builder
      },
      upsert(rows: Row[]) {
        calls.upserted.push(rows)
        return Promise.resolve({ error: null })
      },
      eq(col: string, val: string) {
        if (mode === 'delete' && col === 'user_id') deleteFilter.user_id = val
        if (col === 'id') filterId = val
        return builder
      },
      in(_col: string, ids: string[]) {
        calls.deleted.push(ids)
        calls.deleteFilters.push({ ...deleteFilter })
        return Promise.resolve({ error: null })
      },
      order() {
        return builder
      },
      single() {
        const row = serverRows.find((r) => r.id === filterId) ?? null
        return Promise.resolve({ data: row, error: null })
      },
      then(resolve: Resolve) {
        if (mode === 'select') {
          const data =
            selectCols === 'id, updated_at'
              ? serverRows.map((r) => ({ id: r.id, updated_at: r.updated_at ?? null }))
              : serverRows
          resolve({ data, error: null })
        } else {
          resolve({ data: null, error: null })
        }
      },
    }
    return builder
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { client: { from } as any, calls }
}

describe('diffDeletedIds', () => {
  it('returns ids present in prev but removed from next', () => {
    const prev: Row[] = [{ id: 'a' }, { id: 'b' }, { id: 'c' }]
    const next: Row[] = [{ id: 'a' }, { id: 'c' }]
    expect(diffDeletedIds(prev, next)).toEqual(['b'])
  })

  it('returns nothing when prev is empty (auth race / failed load)', () => {
    expect(diffDeletedIds([], [{ id: 'a' }, { id: 'b' }])).toEqual([])
  })

  it('returns nothing when nothing was removed', () => {
    const rows: Row[] = [{ id: 'a' }, { id: 'b' }]
    expect(diffDeletedIds(rows, rows)).toEqual([])
  })
})

describe('syncSupabaseRows — DAT-1 data-loss guard', () => {
  const now = '2026-07-24T00:00:00.000Z'
  const noop = () => {}

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('never deletes server rows the client never loaded (partial local state)', async () => {
    // Server holds three real records. The client only ever loaded one row and
    // is now persisting just that row. The old set-difference logic would have
    // deleted the two unloaded rows — the exact DAT-1 data-loss bug.
    const server: Row[] = [{ id: 'a' }, { id: 'b' }, { id: 'c' }]
    const { client, calls } = makeFakeSupabase(server)

    const ok = await syncSupabaseRows(
      client,
      'user_transactions',
      'user-1',
      [{ id: 'a', updated_at: now }],
      diffDeletedIds([], [{ id: 'a' }]), // caller loaded nothing → no delete intent
      now,
      noop,
    )

    expect(ok).toBe(true)
    expect(calls.deleted).toEqual([]) // no delete issued at all
  })

  it('deletes exactly the row the user removed from a fully loaded view', async () => {
    const server: Row[] = [{ id: 'a' }, { id: 'b' }, { id: 'c' }]
    const prev: Row[] = [{ id: 'a' }, { id: 'b' }, { id: 'c' }]
    const next: Row[] = [{ id: 'a' }, { id: 'c' }] // user deleted 'b'
    const { client, calls } = makeFakeSupabase(server)

    await syncSupabaseRows(
      client,
      'user_transactions',
      'user-1',
      next.map((r) => ({ ...r, updated_at: now })),
      diffDeletedIds(prev, next),
      now,
      noop,
    )

    expect(calls.deleted).toEqual([['b']])
    // defence-in-depth: delete is scoped to the owner, not RLS-only
    expect(calls.deleteFilters).toEqual([{ user_id: 'user-1' }])
  })

  it('skips the delete round-trip entirely when nothing was removed', async () => {
    const server: Row[] = [{ id: 'a' }]
    const { client, calls } = makeFakeSupabase(server)

    await syncSupabaseRows(
      client,
      'user_transactions',
      'user-1',
      [{ id: 'a', updated_at: now }],
      diffDeletedIds([{ id: 'a' }], [{ id: 'a' }]),
      now,
      noop,
    )

    expect(calls.deleted).toEqual([])
    expect(calls.upserted.length).toBe(1)
  })

  it('does not delete a removed id that is absent from the server', async () => {
    // User removed a locally-created row that had never been synced. There is
    // nothing to delete server-side, so no delete call should be made.
    const server: Row[] = [{ id: 'a' }]
    const { client, calls } = makeFakeSupabase(server)

    await syncSupabaseRows(
      client,
      'user_transactions',
      'user-1',
      [{ id: 'a', updated_at: now }],
      diffDeletedIds([{ id: 'a' }, { id: 'local-only' }], [{ id: 'a' }]),
      now,
      noop,
    )

    expect(calls.deleted).toEqual([])
  })
})
