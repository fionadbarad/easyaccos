/**
 * The no-IndexedDB fallback tier wrote and read different localStorage keys.
 *
 * secureWrite derived its key from the RECORD key ("user_expenses:guest" →
 * "user_expenses") while secureRead's fallback reads the LEGACY key the caller
 * passes ("easyacco_expenses"). Nothing ever read what was written, so wherever
 * IndexedDB is unavailable — a Firefox private window, storage blocked by
 * policy — every guest entry disappeared on refresh.
 *
 * These run in the `node` environment, so `window.indexedDB` is absent and
 * isIDBAvailable() is false: the fallback tier is the code under test.
 */

import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import { secureRead, secureWrite } from '@/lib/storage/secure-store'

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
const original = (globalThis as { localStorage?: unknown }).localStorage

beforeEach(() => {
  ls = fakeLocalStorage()
  ;(globalThis as { localStorage?: unknown }).localStorage = ls
})

afterAll(() => {
  ;(globalThis as { localStorage?: unknown }).localStorage = original
})

describe('secureWrite / secureRead without IndexedDB', () => {
  it('round-trips a value through the fallback tier', async () => {
    const rows = [{ id: 'e1', amount: 42 }]
    expect(await secureWrite(RECORD_KEY, rows, LEGACY_KEY)).toBe(true)
    expect(await secureRead(RECORD_KEY, LEGACY_KEY, [])).toEqual(rows)
  })

  it('writes under the key the reader actually looks at', async () => {
    await secureWrite(RECORD_KEY, [{ id: 'e1' }], LEGACY_KEY)
    expect(ls.store.has(LEGACY_KEY)).toBe(true)
    // The old derived key is what made the data unreachable.
    expect(ls.store.has('user_expenses')).toBe(false)
  })

  it('falls back to the derived key when no legacy key is supplied', async () => {
    await secureWrite(RECORD_KEY, [{ id: 'e1' }])
    expect(ls.store.has('user_expenses')).toBe(true)
  })

  it('returns the fallback value when nothing is stored', async () => {
    const seed = [{ id: 'seed' }]
    expect(await secureRead('user_invoices:guest', 'ea_invoices', seed)).toEqual(seed)
  })

  it('reports failure rather than throwing when the quota is exhausted', async () => {
    ;(globalThis as { localStorage?: unknown }).localStorage = {
      ...ls,
      setItem: () => {
        throw new Error('QuotaExceededError')
      },
    }
    expect(await secureWrite(RECORD_KEY, [{ id: 'e1' }], LEGACY_KEY)).toBe(false)
  })
})
