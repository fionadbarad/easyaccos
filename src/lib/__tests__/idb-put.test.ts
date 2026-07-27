import { describe, it, expect } from 'vitest'
import { putRecord, type PutTarget } from '@/lib/storage/idb'

/**
 * The audit-trail write bug.
 *
 * `audit_log` is created with `keyPath: 'id'` (in-line keys) while `kv` and
 * `records` are out-of-line. `idbSet` passed an explicit key to `put()` in all
 * three cases, and IndexedDB rejects that on an in-line store with:
 *
 *   DataError: The object store uses in-line keys and the key parameter was provided
 *
 * `idbSet` swallows failures into console.error, so every audit entry was being
 * dropped without anything surfacing — on the store the code calls
 * "authoritative". Observed live in the browser before the fix.
 */
function fakeStore(keyPath: string | string[] | null) {
  const calls: Array<{ value: unknown; key: IDBValidKey | undefined; argc: number }> = []
  const store: PutTarget & { calls: typeof calls } = {
    keyPath,
    calls,
    put(value: unknown, key?: IDBValidKey) {
      calls.push({ value, key, argc: arguments.length })
      // Mirror the real DataError so a regression fails loudly here too.
      if (keyPath !== null && arguments.length > 1) {
        throw new Error('DataError: in-line keys and the key parameter was provided')
      }
      return { result: key }
    },
  }
  return store
}

describe('putRecord', () => {
  it('omits the key for an in-line-key store (audit_log)', () => {
    const s = fakeStore('id')
    expect(() => putRecord(s, 'abc', { id: 'abc', entity: 'transactions' })).not.toThrow()
    expect(s.calls).toHaveLength(1)
    expect(s.calls[0]!.argc).toBe(1)
    expect(s.calls[0]!.value).toEqual({ id: 'abc', entity: 'transactions' })
  })

  it('passes the key for an out-of-line store (kv, records)', () => {
    const s = fakeStore(null)
    putRecord(s, 'device-key', { k: 1 })
    expect(s.calls[0]!.argc).toBe(2)
    expect(s.calls[0]!.key).toBe('device-key')
  })

  it('handles a compound in-line keyPath', () => {
    const s = fakeStore(['user_id', 'id'])
    expect(() => putRecord(s, 'x', { user_id: 'u', id: 'x' })).not.toThrow()
    expect(s.calls[0]!.argc).toBe(1)
  })

  it('reproduces the original failure when the key is forced', () => {
    // Guards the guard: if the fake ever stops modelling DataError, the test
    // above would pass for the wrong reason.
    const s = fakeStore('id')
    expect(() => s.put({ id: 'abc' }, 'abc')).toThrow(/in-line keys/)
  })
})
