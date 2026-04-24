import { describe, it, expect } from 'vitest'
import {
  isBackupFile,
  restoreBackup,
  readBackupFromFile,
  type BackupFile,
} from '@/lib/storage/backup'
import {
  encryptWithPassphrase,
  decryptWithPassphrase,
} from '@/lib/storage/crypto'

// Exercise the backup codec — envelope shape, integrity on round-trip, and
// error paths. Does not touch IndexedDB (absent in vitest's node env); the
// IDB-side (secureDumpAll/secureRestoreAll) no-ops safely, which is by design.

function stubPlainBackup(records: Record<string, unknown>): BackupFile {
  return {
    format:    'easyacco-backup',
    version:   1,
    createdAt: new Date().toISOString(),
    encrypted: false,
    records,
  }
}

async function stubEncryptedBackup(
  passphrase: string,
  records: Record<string, unknown>,
): Promise<BackupFile> {
  const envelope = await encryptWithPassphrase(passphrase, JSON.stringify(records))
  return {
    format:    'easyacco-backup',
    version:   1,
    createdAt: new Date().toISOString(),
    encrypted: true,
    envelope,
  }
}

describe('backup format guard', () => {
  it('accepts a well-formed plain backup shape', () => {
    expect(isBackupFile(stubPlainBackup({}))).toBe(true)
  })

  it('accepts a well-formed encrypted backup shape', () => {
    expect(
      isBackupFile({
        format: 'easyacco-backup',
        version: 1,
        createdAt: new Date().toISOString(),
        encrypted: true,
        envelope: {
          v: 1, kdf: 'PBKDF2', hash: 'SHA-256', iterations: 310000,
          salt: 'AAAA', cipher: 'AES-GCM', iv: 'AAAA', ct: 'AAAA',
        },
      }),
    ).toBe(true)
  })

  it('rejects foreign or malformed files', () => {
    expect(isBackupFile(null)).toBe(false)
    expect(isBackupFile({})).toBe(false)
    expect(isBackupFile({ format: 'other', version: 1, encrypted: false })).toBe(false)
    expect(isBackupFile({ format: 'easyacco-backup', version: 99, encrypted: false })).toBe(false)
  })
})

describe('backup — encrypted round-trip', () => {
  it('preserves record integrity through encrypt, serialise, parse, decrypt', async () => {
    const original = {
      'user_expenses:guest': [
        { id: '1', date: '2026-04-06', description: 'Train', category: 'Travel', amount: 42.50 },
        { id: '2', date: '2026-04-07', description: 'Coffee', category: 'Meals', amount: 3.20 },
      ],
      'user_invoices:guest': [
        { id: 'inv-1', number: '0001', client: 'Acme', amount: 1_000, vat: true, status: 'sent' },
      ],
    }
    const backup = await stubEncryptedBackup('correct horse battery staple', original)
    const roundTripped = JSON.parse(JSON.stringify(backup)) as BackupFile
    if (!roundTripped.encrypted) throw new Error('expected encrypted')
    const plaintext = await decryptWithPassphrase('correct horse battery staple', roundTripped.envelope)
    expect(JSON.parse(plaintext)).toEqual(original)
  }, 15_000)

  it('rejects restore when the passphrase is wrong', async () => {
    const file = await stubEncryptedBackup('right', { k: [1, 2, 3] })
    await expect(restoreBackup(file, 'merge', 'wrong'))
      .rejects.toThrow(/passphrase|corrupted/i)
  }, 15_000)

  it('rejects restore of an encrypted backup with no passphrase supplied', async () => {
    const file = await stubEncryptedBackup('x', { k: [1] })
    await expect(restoreBackup(file, 'merge'))
      .rejects.toThrow(/passphrase required/i)
  }, 15_000)
})

describe('backup — plain file restore', () => {
  it('accepts a well-formed plain backup (IDB no-ops in node)', async () => {
    const file = stubPlainBackup({ 'user_expenses:guest': [] })
    await expect(restoreBackup(file, 'merge')).resolves.toEqual({ restored: 1 })
  })

  it('throws on a payload whose records field is not an object', async () => {
    const file: BackupFile = {
      format:    'easyacco-backup',
      version:   1,
      createdAt: new Date().toISOString(),
      encrypted: false,
      records:   null as unknown as Record<string, unknown>,
    }
    await expect(restoreBackup(file, 'merge')).rejects.toThrow(/invalid backup payload/i)
  })
})

describe('backup — readBackupFromFile', () => {
  it('parses a valid backup out of a File blob', async () => {
    const original = stubPlainBackup({ a: [1, 2, 3] })
    const blob = new File([JSON.stringify(original)], 'backup.json', { type: 'application/json' })
    const parsed = await readBackupFromFile(blob)
    expect(parsed.format).toBe('easyacco-backup')
    if (parsed.encrypted) throw new Error('expected plain')
    expect(parsed.records).toEqual({ a: [1, 2, 3] })
  })

  it('throws on a file that is not an EasyAcco backup', async () => {
    const blob = new File(['{"hello":"world"}'], 'other.json', { type: 'application/json' })
    await expect(readBackupFromFile(blob))
      .rejects.toThrow(/not a valid easyacco backup/i)
  })
})
