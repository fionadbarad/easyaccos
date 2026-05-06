/**
 * Minimal, typed IndexedDB wrapper - no external deps.
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
export const STORE_KV      = 'kv'
export const STORE_RECORDS = 'records'
export const STORE_AUDIT   = 'audit_log'

export type StoreName = typeof STORE_KV | typeof STORE_RECORDS | typeof STORE_AUDIT

function hasIDB(): boolean {
  return typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined'
}

let dbPromise: Promise<IDBDatabase> | null = null

function openDB(): Promise<IDBDatabase> {
  if (!hasIDB()) return Promise.reject(new Error('IndexedDB unavailable'))
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE_KV))      db.createObjectStore(STORE_KV)
      if (!db.objectStoreNames.contains(STORE_RECORDS)) db.createObjectStore(STORE_RECORDS)
      if (!db.objectStoreNames.contains(STORE_AUDIT)) {
        const s = db.createObjectStore(STORE_AUDIT, { keyPath: 'id' })
        s.createIndex('ts',     'ts',     { unique: false })
        s.createIndex('entity', 'entity', { unique: false })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error ?? new Error('IndexedDB open failed'))
  })
  return dbPromise
}

function tx<T>(store: StoreName, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDB().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(store, mode)
        const req = fn(t.objectStore(store))
        req.onsuccess = () => resolve(req.result as T)
        req.onerror = () => reject(req.error)
      }),
  )
}

export async function idbGet<T>(store: StoreName, key: IDBValidKey): Promise<T | undefined> {
  if (!hasIDB()) return undefined
  try {
    return await tx<T | undefined>(store, 'readonly', (s) => s.get(key) as IDBRequest<T | undefined>)
  } catch {
    return undefined
  }
}

export async function idbSet(store: StoreName, key: IDBValidKey, value: unknown): Promise<void> {
  if (!hasIDB()) return
  try {
    await tx<IDBValidKey>(store, 'readwrite', (s) => s.put(value, key) as IDBRequest<IDBValidKey>)
  } catch {
    /* swallow - caller falls back */
  }
}

export async function idbDelete(store: StoreName, key: IDBValidKey): Promise<void> {
  if (!hasIDB()) return
  try {
    await tx<undefined>(store, 'readwrite', (s) => s.delete(key) as IDBRequest<undefined>)
  } catch {
    /* swallow */
  }
}

export async function idbKeys(store: StoreName): Promise<IDBValidKey[]> {
  if (!hasIDB()) return []
  try {
    return await tx<IDBValidKey[]>(store, 'readonly', (s) => s.getAllKeys() as IDBRequest<IDBValidKey[]>)
  } catch {
    return []
  }
}

export async function idbClear(store: StoreName): Promise<void> {
  if (!hasIDB()) return
  try {
    await tx<undefined>(store, 'readwrite', (s) => s.clear() as IDBRequest<undefined>)
  } catch {
    /* swallow */
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
