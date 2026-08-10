/**
 * audit.ts — the AUD-2 contract (TST-6). docs/AUDIT.md says the Supabase
 * mirror is best-effort, retried once, reported rather than swallowed, and
 * never throws. Until now the doc was the only thing asserting any of it.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

const flag = { on: true }
vi.mock('@/lib/feature-flags', () => ({
  FLAG_AUDIT: 'audit',
  isFlagEnabled: () => flag.on,
}))

const idbSet = vi.fn(async (..._a: unknown[]) => {})
const idbAuditRange = vi.fn(async (..._a: unknown[]) => [{ id: 'a1' }])
vi.mock('@/lib/storage/idb', () => ({
  STORE_AUDIT: 'audit_log',
  isIDBAvailable: () => true,
  idbSet: (...a: unknown[]) => idbSet(...(a as [])),
  idbAuditRange: (...a: unknown[]) => idbAuditRange(...(a as [])),
}))

vi.mock('@/lib/supabase-browser', () => ({ isSupabaseConfigured: true }))

const reportError = vi.fn()
vi.mock('@/lib/monitor', () => ({
  reportError: (...a: unknown[]) => reportError(...(a as [])),
  reportWarn: vi.fn(),
}))

import { appendAuditLog, readAuditLog } from '@/lib/audit'

const ENTRY = {
  entity: 'expenses',
  entityId: 'e1',
  op: 'update' as const,
  before: { amount: 1 },
  after: { amount: 2 },
  actor: 'user@example.com',
}

function makeSupabase(insert: ReturnType<typeof vi.fn>) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { from: () => ({ insert }) } as any
}

beforeEach(() => {
  flag.on = true
  idbSet.mockClear()
  idbAuditRange.mockClear()
  reportError.mockClear()
})

describe('appendAuditLog', () => {
  it('short-circuits entirely when the audit flag is off', async () => {
    // If this fails, turning the flag off still records user data — the
    // opt-out documented to users would be a lie.
    flag.on = false
    const insert = vi.fn()
    await appendAuditLog(ENTRY, makeSupabase(insert), 'u1')
    expect(idbSet).not.toHaveBeenCalled()
    expect(insert).not.toHaveBeenCalled()
    expect(await readAuditLog()).toEqual([])
    expect(idbAuditRange).not.toHaveBeenCalled()
  })

  it('writes the stamped entry locally and skips the mirror when signed out', async () => {
    // If this fails, guest changes leave no audit trail at all.
    await appendAuditLog(ENTRY, null, null)
    expect(idbSet).toHaveBeenCalledTimes(1)
    const stored = idbSet.mock.calls[0]![2] as { id: string; ts: string; entity: string }
    expect(stored.id).toBeTruthy()
    expect(stored.ts).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    expect(stored.entity).toBe('expenses')
  })

  it('retries the mirror once and stays silent when the retry lands (AUD-2)', async () => {
    // If this fails, one transient failure drops the mirror row — or a
    // successful retry still pages someone.
    const insert = vi
      .fn()
      .mockResolvedValueOnce({ error: { message: 'transient' } })
      .mockResolvedValueOnce({ error: null })
    await appendAuditLog(ENTRY, makeSupabase(insert), 'u1')
    expect(insert).toHaveBeenCalledTimes(2)
    expect(reportError).not.toHaveBeenCalled()
  })

  it('never throws when the mirror fails twice — reported, not swallowed, not blocking (AUD-2)', async () => {
    // If this fails, an audit-mirror outage starts throwing inside persist()
    // and blocks the user's actual save.
    const insert = vi.fn().mockRejectedValue(new Error('db down'))
    await expect(appendAuditLog(ENTRY, makeSupabase(insert), 'u1')).resolves.toBeUndefined()
    expect(insert).toHaveBeenCalledTimes(2)
    expect(reportError).toHaveBeenCalledTimes(1)
    expect(reportError.mock.calls[0]![0]).toBe('audit.mirror')
  })
})
