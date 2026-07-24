/**
 * High-level local store: encrypted IndexedDB with a transparent localStorage
 * migration path so existing guest data is never lost.
 *
 * Device key is lazily created and persisted in IndexedDB. Reads and writes
 * always go through AES-GCM. SSR-safe: all functions return sensible defaults
 * when IndexedDB is unavailable.
 */

import { STORE_KV, STORE_RECORDS, idbGet, idbSet, idbDelete, idbKeys, isIDBAvailable } from './idb'
import { generateDeviceKey, encryptWithKey, decryptWithKey } from './crypto'
import { reportError, reportWarn } from '@/lib/monitor'

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
      await secureWrite(recordKey, legacy)
      if (legacyLocalKey && typeof localStorage !== 'undefined') {
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

export async function secureWrite<T>(recordKey: string, value: T): Promise<boolean> {
  if (!isIDBAvailable()) {
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(legacyFromRecord(recordKey), JSON.stringify(value))
        return true
      } catch (err) {
        reportError('secureStore.write', err, { recordKey })
        return false
      }
    }
    return false
  }
  try {
    const key = await getDeviceKey()
    const env = await encryptWithKey(key, JSON.stringify(value))
    await idbSet(STORE_RECORDS, recordKey, env)
    return true
  } catch (err) {
    reportError('secureStore.write', err, { recordKey })
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
    } catch (err) {
      // Skip records that won't decrypt/parse so one bad blob can't abort the
      // whole backup — but warn, because a corrupt record is real data loss the
      // user should be able to find out about.
      reportWarn('secureStore.dumpCorruptRecord', 'skipped undecryptable record during backup', {
        recordKey: k,
        error: err instanceof Error ? err.message : String(err),
      })
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
