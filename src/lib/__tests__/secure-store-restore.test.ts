/**
 * secure-store dump/restore + the encrypted backup path (TST-5).
 *
 * This is the guest/offline data path — for a user with no server copy, these
 * functions ARE the books. `secureRestoreAll` in `replace` mode genuinely
 * deletes records, and until now nothing tested it. IndexedDB is replaced with
 * an in-memory map; the AES-GCM crypto is real.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

const mem: Record<string, Map<IDBValidKey, unknown>> = {
  kv: new Map(),
  records: new Map(),
  audit_log: new Map(),
}
const deleted: string[] = []

vi.mock('@/lib/storage/idb', () => ({
  STORE_KV: 'kv',
  STORE_RECORDS: 'records',
  STORE_AUDIT: 'audit_log',
  isIDBAvailable: () => true,
  idbGet: async (store: string, key: IDBValidKey) => mem[store]!.get(key),
  idbSet: async (store: string, key: IDBValidKey, v: unknown) => void mem[store]!.set(key, v),
  idbSetStrict: async (store: string, key: IDBValidKey, v: unknown) => void mem[store]!.set(key, v),
  idbDelete: async (store: string, key: IDBValidKey) => {
    deleted.push(String(key))
    mem[store]!.delete(key)
  },
  idbKeys: async (store: string) => [...mem[store]!.keys()],
}))

vi.mock('@/lib/monitor', () => ({ reportError: vi.fn(), reportWarn: vi.fn() }))

import {
  secureWrite,
  secureRead,
  secureDumpAll,
  secureRestoreAll,
} from '@/lib/storage/secure-store'
import { createBackup, restoreBackup, type BackupFile } from '@/lib/storage/backup'
import { encryptWithPassphrase } from '@/lib/storage/crypto'

beforeEach(() => {
  // Keep the kv store (device key) across tests; the records are per-test.
  mem.records!.clear()
  deleted.length = 0
})

describe('secure-store round-trip and dump', () => {
  it('stores records encrypted at rest, not as plaintext', async () => {
    // If this fails, a sole trader's books sit readable in IndexedDB on a
    // shared machine — the encryption claim in the module header is false.
    await secureWrite('user_expenses:guest', [{ id: 'e1', amount: 42.5 }])
    const raw = JSON.stringify([...mem.records!.values()][0])
    expect(raw).not.toContain('42.5')
    expect(raw).toMatch(/"iv":/)
    expect(await secureRead('user_expenses:guest', null, [])).toEqual([{ id: 'e1', amount: 42.5 }])
  })

  it('secureDumpAll decrypts every record and skips a corrupt one instead of failing the backup', async () => {
    // If this fails, one corrupt record makes the whole backup throw — the
    // user cannot export the records that are still intact.
    await secureWrite('user_expenses:guest', [{ id: 'e1' }])
    await secureWrite('user_invoices:guest', [{ id: 'i1' }])
    mem.records!.set('user_mileage:guest', { iv: 'AAAA', ct: 'AAAA' }) // undecryptable

    const dump = await secureDumpAll()
    expect(dump).toEqual({
      'user_expenses:guest': [{ id: 'e1' }],
      'user_invoices:guest': [{ id: 'i1' }],
    })
  })
})

describe('secureRestoreAll', () => {
  it('replace mode deletes exactly the record keys absent from the snapshot', async () => {
    // If this fails, "replace" either leaves ghost records the backup never
    // held, or deletes records the snapshot still contains — destroying the
    // only local copy of a guest's books.
    await secureWrite('user_expenses:guest', [{ id: 'old-e' }])
    await secureWrite('user_invoices:guest', [{ id: 'old-i' }])

    await secureRestoreAll(
      { 'user_expenses:guest': [{ id: 'new-e' }], 'user_mileage:guest': [{ id: 'new-m' }] },
      'replace',
    )

    expect(deleted).toEqual(['user_invoices:guest'])
    expect(await secureRead('user_expenses:guest', null, [])).toEqual([{ id: 'new-e' }])
    expect(await secureRead('user_mileage:guest', null, [])).toEqual([{ id: 'new-m' }])
    expect(await secureRead('user_invoices:guest', null, 'gone')).toBe('gone')
  })

  it('merge mode overwrites incoming keys and leaves the rest untouched', async () => {
    // If this fails, a merge restore silently wipes records that were only on
    // this device.
    await secureWrite('user_invoices:guest', [{ id: 'keep-me' }])

    await secureRestoreAll({ 'user_expenses:guest': [{ id: 'new-e' }] }, 'merge')

    expect(deleted).toEqual([])
    expect(await secureRead('user_invoices:guest', null, [])).toEqual([{ id: 'keep-me' }])
  })
})

describe('encrypted backup end-to-end', () => {
  it('createBackup(passphrase) produces an encrypted envelope that restores the same records', async () => {
    // If this fails, the passphrase branch either exports plaintext or exports
    // an envelope its own restore cannot open — a backup that cannot back up.
    await secureWrite('user_expenses:guest', [{ id: 'e1', amount: 9 }])

    const file = await createBackup('correct horse battery staple')
    expect(file.encrypted).toBe(true)
    expect(JSON.stringify(file)).not.toContain('"e1"')

    mem.records!.clear()
    const { restored } = await restoreBackup(file, 'replace', 'correct horse battery staple')
    expect(restored).toBe(1)
    expect(await secureRead('user_expenses:guest', null, [])).toEqual([{ id: 'e1', amount: 9 }])
  }, 20_000)

  it('rejects an envelope whose decrypted payload is not JSON, before touching the store', async () => {
    // If this fails, garbage that happens to decrypt is written over the
    // user's records.
    const envelope = await encryptWithPassphrase('p', 'not-json{{{')
    const file: BackupFile = {
      format: 'easyacco-backup',
      version: 1,
      createdAt: new Date().toISOString(),
      encrypted: true,
      envelope,
    }
    await secureWrite('user_expenses:guest', [{ id: 'safe' }])

    await expect(restoreBackup(file, 'replace', 'p')).rejects.toThrow(/not valid JSON/i)
    expect(await secureRead('user_expenses:guest', null, [])).toEqual([{ id: 'safe' }])
  }, 20_000)
})
