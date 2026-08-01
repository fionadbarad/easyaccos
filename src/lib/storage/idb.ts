import { reportError } from '@/lib/monitor'
/**
 * Minimal, typed IndexedDB wrapper — no external deps.
 *
 * Single database "easyacco" with two object stores:
 *   - "kv"      : arbitrary key/value (holds the device CryptoKey, settings)
 *   - "records" : encrypted record bundles keyed by logical name (e.g. "user_expenses:guest")
 *
 * All access is async and SSR-safe: methods return null / no-op when window/indexedDB
 * is unavailable so importing modules can be rendered server-side.
 */

const DB_NAME = 'easyacco'
const DB_VERSION = 2
export const STORE_KV = 'kv'
export const STORE_RECORDS = 'records'
export const STORE_AUDIT = 'audit_log'

export type StoreName = typeof STORE_KV | typeof STORE_RECORDS | typeof STORE_AUDIT

function hasIDB(): boolean {
  return typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined'
}

let dbPromise: Promise<IDBDatabase> | null = null

function openDB(): Promise<IDBDatabase> {
  if (!hasIDB()) return Promise.reject(new Error('IndexedDB unavailable'))
  if (dbPromise) return dbPromise
  const pending = new Promise<IDBDatabase>((resolve, reject) => {
    let req: IDBOpenDBRequest
    try {
      req = indexedDB.open(DB_NAME, DB_VERSION)
    } catch (err) {
      // Firefox in a private window and some enterprise storage policies throw
      // synchronously from open() even though `window.indexedDB` exists.
      reject(err instanceof Error ? err : new Error('IndexedDB open threw'))
      return
    }
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE_KV)) db.createObjectStore(STORE_KV)
      if (!db.objectStoreNames.contains(STORE_RECORDS)) db.createObjectStore(STORE_RECORDS)
      if (!db.objectStoreNames.contains(STORE_AUDIT)) {
        const s = db.createObjectStore(STORE_AUDIT, { keyPath: 'id' })
        s.createIndex('ts', 'ts', { unique: false })
        s.createIndex('entity', 'entity', { unique: false })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error ?? new Error('IndexedDB open failed'))
    // A version upgrade is BLOCKED while another tab still holds the old
    // version open. Neither onsuccess nor onerror fires in that state, so
    // without this the promise never settles — and because every caller awaits
    // openDB, the whole local store stalls silently with `loading` stuck on.
    // Reject instead, so callers fall back rather than hang.
    req.onblocked = () =>
      reject(new Error('IndexedDB upgrade blocked by another open tab — close it and reload'))
  })
  // Never cache a rejection: a transient failure would otherwise poison every
  // later call for the lifetime of the page.
  dbPromise = pending
  pending.catch(() => {
    if (dbPromise === pending) dbPromise = null
  })
  return pending
}

function tx<T>(
  store: StoreName,
  mode: IDBTransactionMode,
  fn: (s: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openDB().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        let t: IDBTransaction
        let req: IDBRequest<T>
        try {
          t = db.transaction(store, mode)
          req = fn(t.objectStore(store))
        } catch (err) {
          // put()/get() can throw synchronously (DataError, DataCloneError on a
          // value structured-clone can't handle). Reject rather than leaving the
          // promise pending forever.
          reject(err instanceof Error ? err : new Error('IndexedDB request threw'))
          return
        }
        // A request can succeed and the TRANSACTION still fail at commit —
        // QuotaExceededError being the common one. That fires on the
        // transaction, not the request. So settle on the transaction: resolving
        // on req.onsuccess alone reported a write as durable before it was, and
        // left the promise pending forever when the commit then failed.
        let result: T | undefined
        req.onsuccess = () => {
          result = req.result as T
        }
        req.onerror = () => reject(req.error)
        t.oncomplete = () => resolve(result as T)
        t.onabort = () => reject(t.error ?? new Error(`IndexedDB transaction aborted [${store}]`))
        t.onerror = () => reject(t.error ?? new Error(`IndexedDB transaction failed [${store}]`))
      }),
  )
}

export async function idbGet<T>(store: StoreName, key: IDBValidKey): Promise<T | undefined> {
  if (!hasIDB()) return undefined
  try {
    return await tx<T | undefined>(
      store,
      'readonly',
      (s) => s.get(key) as IDBRequest<T | undefined>,
    )
  } catch {
    return undefined
  }
}

/**
 * Minimal shape of the object store this module writes through. Declared so
 * `putRecord` can be unit-tested without a real IndexedDB implementation.
 */
export interface PutTarget {
  keyPath: string | string[] | null
  put(value: unknown, key?: IDBValidKey): unknown
}

/**
 * Writes a value through `put`, supplying the key only when the store needs it.
 *
 * `STORE_AUDIT` is created with `keyPath: 'id'` (in-line keys); `kv` and
 * `records` are out-of-line. IndexedDB throws `DataError` if an explicit key is
 * passed to `put()` on an in-line store — which is what every audit-log write
 * was doing, silently, because `idbSet` swallows the failure. Let the store
 * decide rather than assuming.
 */
export function putRecord(store: PutTarget, key: IDBValidKey, value: unknown): unknown {
  return store.keyPath === null ? store.put(value, key) : store.put(value)
}

/**
 * Write a value, PROPAGATING failure to the caller.
 *
 * Rejects when IndexedDB is unavailable, when the transaction aborts
 * (QuotaExceededError being the common one), or when the store rejects the
 * value. Callers that have somewhere else to put the data — `secureWrite`'s
 * localStorage tier — need to know a write did not land; `idbSet` below
 * swallows that, which made the fallback unreachable and let `secureWrite`
 * report success for data it had dropped.
 */
export async function idbSetStrict(
  store: StoreName,
  key: IDBValidKey,
  value: unknown,
): Promise<void> {
  if (!hasIDB()) throw new Error('IndexedDB unavailable')
  await tx<IDBValidKey>(
    store,
    'readwrite',
    (s) => putRecord(s, key, value) as IDBRequest<IDBValidKey>,
  )
}

/**
 * Best-effort write: logs and continues on failure.
 *
 * Only for writes with no recovery path and no user-visible consequence — the
 * audit mirror, for instance, which must never block the action it records.
 * Anything holding user data the app would otherwise lose must use
 * `idbSetStrict` and handle the rejection.
 */
export async function idbSet(store: StoreName, key: IDBValidKey, value: unknown): Promise<void> {
  if (!hasIDB()) return
  try {
    await idbSetStrict(store, key, value)
  } catch (err) {
    reportError('idb.set', err, { store })
  }
}

export async function idbDelete(store: StoreName, key: IDBValidKey): Promise<void> {
  if (!hasIDB()) return
  try {
    await tx<undefined>(store, 'readwrite', (s) => s.delete(key) as IDBRequest<undefined>)
  } catch (err) {
    reportError('idb.delete', err, { store })
  }
}

export async function idbKeys(store: StoreName): Promise<IDBValidKey[]> {
  if (!hasIDB()) return []
  try {
    return await tx<IDBValidKey[]>(
      store,
      'readonly',
      (s) => s.getAllKeys() as IDBRequest<IDBValidKey[]>,
    )
  } catch {
    return []
  }
}

export async function idbClear(store: StoreName): Promise<void> {
  if (!hasIDB()) return
  try {
    await tx<undefined>(store, 'readwrite', (s) => s.clear() as IDBRequest<undefined>)
  } catch (err) {
    reportError('idb.clear', err, { store })
  }
}

/** Range query ordered by `ts` index, descending. Returns at most `limit` entries. */
export async function idbAuditRange(limit = 500): Promise<unknown[]> {
  if (!hasIDB()) return []
  try {
    const db = await openDB()
    return new Promise<unknown[]>((resolve) => {
      const t = db.transaction(STORE_AUDIT, 'readonly')
      const req = t.objectStore(STORE_AUDIT).index('ts').openCursor(null, 'prev')
      const out: unknown[] = []
      req.onsuccess = () => {
        const cursor = req.result as IDBCursorWithValue | null
        if (cursor && out.length < limit) {
          out.push(cursor.value)
          cursor.continue()
        } else {
          resolve(out)
        }
      }
      req.onerror = () => resolve(out)
    })
  } catch {
    return []
  }
}

export function isIDBAvailable(): boolean {
  return hasIDB()
}
