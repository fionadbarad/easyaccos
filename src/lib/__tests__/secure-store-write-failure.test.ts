/**
 * The two ways a failed IndexedDB write used to destroy user data.
 *
 * 1. `idbSet` catches everything and resolves, so `await idbSet(...)` inside
 *    secureWrite's try could never reject — the localStorage fallback written
 *    for exactly that case was unreachable, and secureWrite returned `true` for
 *    data it had dropped on the floor.
 *
 * 2. secureRead's localStorage → IndexedDB migration read the legacy value,
 *    called secureWrite (always `true`, per 1), then deleted the legacy key.
 *    A quota rejection or a blocked-storage policy therefore deleted the user's
 *    whole ledger and wrote nothing in its place.
 *
 * These run in the `node` environment, where `window` is absent. The IDB layer
 * is driven through a fake `window.indexedDB` so the failure modes are real
 * transaction aborts rather than mocked-out functions.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

const RECORD_KEY = 'user_expenses:guest'
const LEGACY_KEY = 'easyacco_expenses'

function fakeLocalStorage() {
  const map = new Map<string, string>()
  return {
    store: map,
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
  }
}

let ls: ReturnType<typeof fakeLocalStorage>

/**
 * Minimal IndexedDB stand-in. `failWrites` makes every readwrite transaction
 * abort at commit, which is how a QuotaExceededError actually surfaces.
 */
function installFakeIDB(opts: { failWrites: boolean }) {
  const data = new Map<string, Map<unknown, unknown>>()
  const storeNames = ['kv', 'records', 'audit_log']
  for (const n of storeNames) data.set(n, new Map())

  type Handler = (() => void) | null
  const settle = (fn: () => void) => queueMicrotask(fn)

  const makeRequest = <T>(exec: () => T) => {
    const req: {
      result?: T
      error?: unknown
      onsuccess: Handler
      onerror: Handler
      readyState?: string
    } = { onsuccess: null, onerror: null }
    settle(() => {
      req.result = exec()
      req.onsuccess?.()
    })
    return req
  }

  const db = {
    objectStoreNames: { contains: (n: string) => storeNames.includes(n) },
    createObjectStore: () => ({ createIndex: () => undefined }),
    transaction(storeName: string, mode: string) {
      const tx: {
        oncomplete: Handler
        onabort: Handler
        onerror: Handler
        error: unknown
        objectStore: (n: string) => unknown
      } = {
        oncomplete: null,
        onabort: null,
        onerror: null,
        error: null,
        objectStore: (n: string) => {
          const store = data.get(n)!
          return {
            keyPath: n === 'audit_log' ? 'id' : null,
            get: (k: unknown) => makeRequest(() => store.get(k)),
            put: (v: unknown, k: unknown) => makeRequest(() => (store.set(k, v), k)),
            delete: (k: unknown) => makeRequest(() => void store.delete(k)),
            getAllKeys: () => makeRequest(() => [...store.keys()]),
            clear: () => makeRequest(() => store.clear()),
          }
        },
      }
      // Settle the transaction after the request microtasks have run.
      settle(() =>
        settle(() => {
          if (opts.failWrites && mode === 'readwrite') {
            tx.error = new Error('QuotaExceededError')
            tx.onabort?.()
          } else {
            tx.oncomplete?.()
          }
        }),
      )
      return tx
    },
  }

  const indexedDB = {
    open: () => {
      const req: {
        result?: unknown
        error?: unknown
        onsuccess: Handler
        onerror: Handler
        onupgradeneeded: Handler
        onblocked: Handler
      } = { onsuccess: null, onerror: null, onupgradeneeded: null, onblocked: null }
      settle(() => {
        req.result = db
        req.onsuccess?.()
      })
      return req
    },
  }

  vi.stubGlobal('window', { indexedDB })
  vi.stubGlobal('indexedDB', indexedDB)
  return { data }
}

beforeEach(() => {
  ls = fakeLocalStorage()
  vi.stubGlobal('localStorage', ls)
  vi.resetModules()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('a failed IndexedDB write is reported, not swallowed', () => {
  it('idbSetStrict rejects when the transaction aborts', async () => {
    installFakeIDB({ failWrites: true })
    const { idbSetStrict, STORE_RECORDS } = await import('@/lib/storage/idb')
    await expect(idbSetStrict(STORE_RECORDS, 'k', { a: 1 })).rejects.toThrow()
  })

  it('idbSet stays best-effort for callers with no recovery path', async () => {
    installFakeIDB({ failWrites: true })
    const { idbSet, STORE_AUDIT } = await import('@/lib/storage/idb')
    await expect(idbSet(STORE_AUDIT, 'k', { id: 'k' })).resolves.toBeUndefined()
  })

  it('secureWrite falls back to localStorage instead of claiming success', async () => {
    installFakeIDB({ failWrites: true })
    const { secureWrite } = await import('@/lib/storage/secure-store')

    // The write cannot reach IndexedDB, so the only honest outcomes are "stored
    // in the fallback tier" or "false". It must never be `true` with nothing
    // written anywhere — which is exactly what it used to return.
    const ok = await secureWrite(RECORD_KEY, [{ id: 'e1', amount: 42 }], LEGACY_KEY)
    expect(ok).toBe(true)
    expect(ls.store.has(LEGACY_KEY)).toBe(true)
    expect(JSON.parse(ls.store.get(LEGACY_KEY)!)).toEqual([{ id: 'e1', amount: 42 }])
  })

  it('secureWrite reports false when neither tier accepts the write', async () => {
    installFakeIDB({ failWrites: true })
    vi.stubGlobal('localStorage', {
      ...ls,
      setItem: () => {
        throw new Error('QuotaExceededError')
      },
    })
    const { secureWrite } = await import('@/lib/storage/secure-store')
    expect(await secureWrite(RECORD_KEY, [{ id: 'e1' }], LEGACY_KEY)).toBe(false)
  })
})

describe('the legacy migration never deletes the only surviving copy', () => {
  it('keeps the localStorage record when the IndexedDB write fails', async () => {
    installFakeIDB({ failWrites: true })
    const rows = [{ id: 'e1', amount: 42 }]
    ls.store.set(LEGACY_KEY, JSON.stringify(rows))

    const { secureRead } = await import('@/lib/storage/secure-store')
    expect(await secureRead(RECORD_KEY, LEGACY_KEY, [])).toEqual(rows)

    // The migration could not copy the data anywhere durable, so the source has
    // to stay. Deleting it here is what wiped users' ledgers.
    expect(ls.store.has(LEGACY_KEY)).toBe(true)
    expect(JSON.parse(ls.store.get(LEGACY_KEY)!)).toEqual(rows)
  })

  it('a second read still finds the data after a failed migration', async () => {
    installFakeIDB({ failWrites: true })
    const rows = [{ id: 'e1', amount: 42 }]
    ls.store.set(LEGACY_KEY, JSON.stringify(rows))

    const { secureRead } = await import('@/lib/storage/secure-store')
    await secureRead(RECORD_KEY, LEGACY_KEY, [])
    expect(await secureRead(RECORD_KEY, LEGACY_KEY, [])).toEqual(rows)
  })

  it('does delete the legacy key once the encrypted copy has landed', async () => {
    installFakeIDB({ failWrites: false })
    const rows = [{ id: 'e1', amount: 42 }]
    ls.store.set(LEGACY_KEY, JSON.stringify(rows))

    const { secureRead } = await import('@/lib/storage/secure-store')
    expect(await secureRead(RECORD_KEY, LEGACY_KEY, [])).toEqual(rows)
    expect(ls.store.has(LEGACY_KEY)).toBe(false)

    // …and the value is now readable from the encrypted store alone.
    expect(await secureRead(RECORD_KEY, LEGACY_KEY, [])).toEqual(rows)
  })
})
