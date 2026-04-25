import { LEGACY_KEY_MAP } from '@/lib/storageKeys'

/**
 * One-time migration: copies any data stored under old easyacco_ prefixed keys
 * to the canonical ea_ keys, then removes the old entries.
 * Safe to call repeatedly — skips migration if the new key already has data.
 */
export function migrateStorageKeys(): void {
  if (typeof window === 'undefined') return
  for (const [oldKey, newKey] of Object.entries(LEGACY_KEY_MAP)) {
    try {
      const oldValue = localStorage.getItem(oldKey)
      if (oldValue === null) continue
      if (localStorage.getItem(newKey) === null) {
        localStorage.setItem(newKey, oldValue)
      }
      localStorage.removeItem(oldKey)
    } catch {
      // localStorage unavailable or quota exceeded — skip silently
    }
  }
}
