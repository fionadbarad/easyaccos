import { describe, it, expect } from 'vitest'
import { isBackupFile } from '@/lib/storage/backup'

describe('backup format guard', () => {
  it('accepts a well-formed plain backup shape', () => {
    expect(
      isBackupFile({
        format: 'easyacco-backup',
        version: 1,
        createdAt: new Date().toISOString(),
        encrypted: false,
        records: {},
      }),
    ).toBe(true)
  })

  it('accepts a well-formed encrypted backup shape', () => {
    expect(
      isBackupFile({
        format: 'easyacco-backup',
        version: 1,
        createdAt: new Date().toISOString(),
        encrypted: true,
        envelope: {
          v: 1,
          kdf: 'PBKDF2',
          hash: 'SHA-256',
          iterations: 310000,
          salt: 'AAAA',
          cipher: 'AES-GCM',
          iv: 'AAAA',
          ct: 'AAAA',
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
