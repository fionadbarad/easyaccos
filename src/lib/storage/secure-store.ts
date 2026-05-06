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
  idbKeys,
  isIDBAvailable,
} from './idb'
import {
  generateDeviceKey,
  encryptWithKey,
  decryptWithKey,
} from './crypto'

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
  return !!x && typeof x === 'object'
    && typeof (x as CipherBlob).iv === 'string'
    && typeof (x as CipherBlob).ct === 'string'
}

/** Read + decrypt a record. Falls back to `localStorage[legacyKey]` once, then
 *  re-saves it encrypted so subsequent reads are clean. */
export async function secureRead<T>(recordKey: string, legacyLocalKey: string | null, fallback: T): Promise<T> {
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
    // No IDB record - try to migrate from legacy localStorage
    const legacy = readLegacy<T | undefined>(legacyLocalKey, undefined)
    if (legacy !== undefined) {
      await secureWrite(recordKey, legacy)
      if (legacyLocalKey && typeof localStorage !== 'undefined') {
        try { localStorage.removeItem(legacyLocalKey) } catch { /* noop */ }
      }
      return legacy
    }
    return fallback
  } catch (err) {
    console.error(`secureRead(${recordKey}) failed, falling back to legacy:`, err)
    return readLegacy<T>(legacyLocalKey, fallback)
  }
}

export async function secureWrite<T>(recordKey: string, value: T): Promise<void> {
  if (!isIDBAvailable()) {
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(legacyFromRecord(recordKey), JSON.stringify(value))
      } catch (err) {
        console.error(`secureWrite(${recordKey}) localStorage fallback failed:`, err)
      }
    }
    return
  }
  try {
    const key = await getDeviceKey()
    const env = await encryptWithKey(key, JSON.stringify(value))
    await idbSet(STORE_RECORDS, recordKey, env)
  } catch (err) {
    // Caller has optimistic state in memory; we just lose persistence on this write.
    console.error(`secureWrite(${recordKey}) failed:`, err)
  }
}

function legacyFromRecord(recordKey: string): string {
  // e.g. "user_expenses:guest" → "user_expenses" for localStorage compat
  return recordKey.split(':')[0]
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
      console.error(`secureDumpAll: skipping corrupt record ${k}:`, err)
    }
  }
  return out
}

/** Write a full record snapshot (used by restore). */
export async function secureRestoreAll(records: Record<string, unknown>, mode: 'merge' | 'replace'): Promise<void> {
  if (!isIDBAvailable()) return
  if (mode === 'replace') {
    const keys = await idbKeys(STORE_RECORDS)
    const key = await getDeviceKey()
    for (const k of keys) {
      if (typeof k !== 'string') continue
      if (!(k in records)) {
        await idbSet(STORE_RECORDS, k, await encryptWithKey(key, JSON.stringify([])))
      }
    }
  }
  for (const [k, v] of Object.entries(records)) {
    await secureWrite(k, v)
  }
}
