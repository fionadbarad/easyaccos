/**
 * Backup & restore codec.
 *
 * Export produces a self-contained JSON file. If the user supplies a passphrase,
 * the payload is AES-GCM encrypted with a PBKDF2-derived key; otherwise the
 * payload is written in cleartext (clearly marked). Restore auto-detects the
 * envelope type.
 */

import { z } from 'zod'
import {
  encryptWithPassphrase,
  decryptWithPassphrase,
  type PassphraseEnvelope,
} from './crypto'
import {
  secureDumpAll,
  secureRestoreAll,
} from './secure-store'
import { reportError } from '@/lib/monitor'

const FORMAT = 'easyacco-backup'
const FORMAT_VERSION = 1

type PlainBackup = {
  format: typeof FORMAT
  version: typeof FORMAT_VERSION
  createdAt: string
  encrypted: false
  records: Record<string, unknown>
}

type EncryptedBackup = {
  format: typeof FORMAT
  version: typeof FORMAT_VERSION
  createdAt: string
  encrypted: true
  envelope: PassphraseEnvelope
}

export type BackupFile = PlainBackup | EncryptedBackup

export async function createBackup(passphrase?: string): Promise<BackupFile> {
  const records = await secureDumpAll()
  const createdAt = new Date().toISOString()
  if (passphrase) {
    const envelope = await encryptWithPassphrase(passphrase, JSON.stringify(records))
    return { format: FORMAT, version: FORMAT_VERSION, createdAt, encrypted: true, envelope }
  }
  return { format: FORMAT, version: FORMAT_VERSION, createdAt, encrypted: false, records }
}

export function isBackupFile(x: unknown): x is BackupFile {
  if (!x || typeof x !== 'object') return false
  const b = x as Partial<BackupFile>
  return b.format === FORMAT && b.version === FORMAT_VERSION && typeof b.encrypted === 'boolean'
}

// Restored records are user data destined for IndexedDB. We don't pin field
// shapes (those vary by record key), but we DO require: an object map keyed
// by record-key strings, with each value either an array of objects or a
// plain object. Anything else is rejected before it can hit the store.
const RecordValueSchema = z.union([
  z.array(z.record(z.string(), z.unknown())),
  z.record(z.string(), z.unknown()),
])
const RestoreRecordsSchema = z.record(
  z.string().min(1, 'record key cannot be empty'),
  RecordValueSchema,
)

export async function restoreBackup(
  file: BackupFile,
  mode: 'merge' | 'replace',
  passphrase?: string,
): Promise<{ restored: number }> {
  let raw: unknown
  if (file.encrypted) {
    if (!passphrase) throw new Error('This backup is encrypted — passphrase required')
    const json = await decryptWithPassphrase(passphrase, file.envelope)
    try {
      raw = JSON.parse(json)
    } catch (err) {
      reportError('restoreBackup.parse', err)
      throw new Error('Decrypted backup is not valid JSON')
    }
  } else {
    raw = file.records
  }

  const parsed = RestoreRecordsSchema.safeParse(raw)
  if (!parsed.success) {
    reportError('restoreBackup.validate', parsed.error, { issues: parsed.error.issues })
    throw new Error('Backup payload failed schema validation — refusing to write to store')
  }

  const records = parsed.data
  await secureRestoreAll(records, mode)
  return { restored: Object.keys(records).length }
}

export function downloadBackup(file: BackupFile): void {
  if (typeof window === 'undefined') return
  const blob = new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const ts = file.createdAt.replace(/[:.]/g, '-')
  a.href = url
  a.download = `easyacco-backup-${ts}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export async function readBackupFromFile(file: File): Promise<BackupFile> {
  const text = await file.text()
  const parsed: unknown = JSON.parse(text)
  if (!isBackupFile(parsed)) throw new Error('Not a valid EasyAcco backup file')
  return parsed
}
