/**
 * High-level local store: encrypted IndexedDB with a transparent localStorage
 * migration path so existing guest data is never lost.
 *
 * Device key is lazily created and persisted in IndexedDB. Reads and writes
 * always go through AES-GCM. SSR-safe: all functions return sensible defaults
 * when IndexedDB is unavailable.
 */

import {
  STORE_KV,
  STORE_RECORDS,
  idbGet,
  idbSet,
  idbSetStrict,
  idbDelete,
  idbKeys,
  isIDBAvailable,
} from './idb'
import { generateDeviceKey, encryptWithKey, decryptWithKey } from './crypto'
import { reportError } from '@/lib/monitor'

const DEVICE_KEY_ID = 'device-key'

let keyPromise: Promise<CryptoKey> | null = null

async function getDeviceKey(): Promise<CryptoKey> {
  if (keyPromise) return keyPromise
  keyPromise = (async () => {
    const existing = await idbGet<CryptoKey>(STORE_KV, DEVICE_KEY_ID)
    if (existing) return existing
    const key = await generateDeviceKey()
    await idbSet(STORE_KV, DEVICE_KEY_ID, key)
    return key
  })()
  return keyPromise
}

type CipherBlob = { iv: string; ct: string }

function isCipherBlob(x: unknown): x is CipherBlob {
  return (
    !!x &&
    typeof x === 'object' &&
    typeof (x as CipherBlob).iv === 'string' &&
    typeof (x as CipherBlob).ct === 'string'
  )
}

/** Read + decrypt a record. Falls back to `localStorage[legacyKey]` once, then
 *  re-saves it encrypted so subsequent reads are clean. */
export async function secureRead<T>(
  recordKey: string,
  legacyLocalKey: string | null,
  fallback: T,
): Promise<T> {
  if (!isIDBAvailable()) {
    return readLegacy<T>(legacyLocalKey, fallback)
  }
  try {
    const blob = await idbGet<CipherBlob>(STORE_RECORDS, recordKey)
    if (isCipherBlob(blob)) {
      const key = await getDeviceKey()
      const json = await decryptWithKey(key, blob)
      return JSON.parse(json) as T
    }
    // No IDB record — try to migrate from legacy localStorage
    const legacy = readLegacy<T | undefined>(legacyLocalKey, undefined)
    if (legacy !== undefined) {
      // Migration is copy-then-delete, and the delete happens ONLY once the copy
      // is known to have landed in IndexedDB. Two ways this used to destroy
      // data: an encrypted write that failed (quota, blocked storage) still
      // reported success, and a write that fell back to localStorage wrote this
      // very key — so removing it afterwards deleted the only surviving copy.
      // Leaving the legacy key in place costs one duplicate read next time.
      const landedIn = await writeRecord(recordKey, legacy, legacyLocalKey)
      if (landedIn === 'idb' && legacyLocalKey && typeof localStorage !== 'undefined') {
        try {
          localStorage.removeItem(legacyLocalKey)
        } catch {
          /* noop */
        }
      }
      return legacy
    }
    return fallback
  } catch {
    return readLegacy<T>(legacyLocalKey, fallback)
  }
}

/** Which tier a write actually reached. `'failed'` means nothing was stored. */
type WriteTier = 'idb' | 'legacy' | 'failed'

/**
 * Write a record and report which tier it reached.
 *
 * The distinction matters to the migration path in secureRead: only an `'idb'`
 * result means the value now lives somewhere other than the legacy
 * localStorage key, and therefore only `'idb'` licenses deleting that key.
 */
async function writeRecord<T>(
  recordKey: string,
  value: T,
  legacyLocalKey?: string | null,
): Promise<WriteTier> {
  if (!isIDBAvailable()) {
    return writeLegacy(recordKey, value, legacyLocalKey) ? 'legacy' : 'failed'
  }
  try {
    const key = await getDeviceKey()
    const env = await encryptWithKey(key, JSON.stringify(value))
    // idbSetStrict, not idbSet: the plain helper logs and resolves on failure,
    // so this try could never see a rejected write and the fallback below was
    // unreachable — every quota/blocked-storage failure was reported as a
    // successful save.
    await idbSetStrict(STORE_RECORDS, recordKey, env)
    return 'idb'
  } catch (err) {
    reportError('secureStore.write', err, { recordKey })
    // `window.indexedDB` existing is not the same as IndexedDB working: a
    // private window, a blocked-storage policy or a quota rejection all fail
    // here after isIDBAvailable() said yes. secureRead already degrades to
    // localStorage in that case, so the write must too — otherwise the user's
    // entry is simply gone.
    return writeLegacy(recordKey, value, legacyLocalKey) ? 'legacy' : 'failed'
  }
}

/** True when the value was stored somewhere durable — encrypted IDB or the
 *  plaintext localStorage fallback. False means it was not stored at all. */
export async function secureWrite<T>(
  recordKey: string,
  value: T,
  legacyLocalKey?: string | null,
): Promise<boolean> {
  return (await writeRecord(recordKey, value, legacyLocalKey)) !== 'failed'
}

/**
 * Plaintext localStorage fallback for when IndexedDB is unavailable.
 *
 * The key must be the SAME one secureRead falls back to. Deriving it from the
 * record key instead ("user_expenses:guest" → "user_expenses") produced a key
 * nothing ever reads, because secureRead's fallback reads `legacyLocalKey`
 * ("easyacco_expenses") — so every write in this path landed somewhere
 * unreadable and the data vanished on refresh.
 *
 * Note this tier is NOT encrypted: there is no IndexedDB to hold the device key,
 * so there is no key to encrypt with. It is the difference between keeping the
 * user's data and losing it, not a security tier.
 */
function writeLegacy<T>(recordKey: string, value: T, legacyLocalKey?: string | null): boolean {
  if (typeof localStorage === 'undefined') return false
  try {
    localStorage.setItem(legacyLocalKey ?? legacyFromRecord(recordKey), JSON.stringify(value))
    return true
  } catch (err) {
    reportError('secureStore.writeLegacy', err, { recordKey })
    return false
  }
}

function legacyFromRecord(recordKey: string): string {
  // e.g. "user_expenses:guest" → "user_expenses" for localStorage compat
  return recordKey.split(':')[0] ?? recordKey
}

function readLegacy<T>(legacyKey: string | null, fallback: T): T {
  if (!legacyKey || typeof localStorage === 'undefined') return fallback
  try {
    const raw = localStorage.getItem(legacyKey)
    if (raw == null) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

/** Dump every stored record, decrypted, for backup. Returns `{ [recordKey]: value }`. */
export async function secureDumpAll(): Promise<Record<string, unknown>> {
  if (!isIDBAvailable()) return {}
  const keys = await idbKeys(STORE_RECORDS)
  const key = await getDeviceKey()
  const out: Record<string, unknown> = {}
  for (const k of keys) {
    if (typeof k !== 'string') continue
    const blob = await idbGet<CipherBlob>(STORE_RECORDS, k)
    if (!isCipherBlob(blob)) continue
    try {
      out[k] = JSON.parse(await decryptWithKey(key, blob))
    } catch {
      /* skip corrupt record */
    }
  }
  return out
}

/** Write a full record snapshot (used by restore).
 *
 * In `replace` mode any existing record key NOT present in the incoming
 * snapshot is truly deleted from IndexedDB rather than overwritten with an
 * empty array. This keeps the encrypted store consistent with the backup
 * file and avoids ghost records lingering after a restore. */
export async function secureRestoreAll(
  records: Record<string, unknown>,
  mode: 'merge' | 'replace',
): Promise<void> {
  if (!isIDBAvailable()) return
  if (mode === 'replace') {
    const keys = await idbKeys(STORE_RECORDS)
    for (const k of keys) {
      if (typeof k !== 'string') continue
      if (!(k in records)) {
        await idbDelete(STORE_RECORDS, k)
      }
    }
  }
  for (const [k, v] of Object.entries(records)) {
    await secureWrite(k, v)
  }
}
