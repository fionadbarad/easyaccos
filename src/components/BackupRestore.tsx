'use client'

import { useRef, useState } from 'react'
import { Download, Upload, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import {
  createBackup,
  downloadBackup,
  readBackupFromFile,
  restoreBackup,
  isBackupFile,
  type BackupFile,
} from '@/lib/storage/backup'
import { emitRestoreEvent } from '@/lib/use-user-data'
import { reportError } from '@/lib/monitor'

type Status =
  | { kind: 'idle' }
  | { kind: 'working'; msg: string }
  | { kind: 'ok'; msg: string }
  | { kind: 'error'; msg: string }

const inputCls =
  'w-full rounded bg-sa-gray border border-sa-border ' +
  'text-sa-white text-sm px-3 py-2 outline-none focus:border-sa-line'
const labelCls = 'block uppercase tracking-[0.07em] text-xs font-semibold ' + 'text-sa-muted mb-1.5'
const btnPrimary =
  'inline-flex items-center gap-2 rounded bg-sa-white text-sa-black ' +
  'font-bold text-sm px-5 py-2 transition-opacity hover:opacity-90 disabled:opacity-50'
const btnGhost =
  'inline-flex items-center gap-2 rounded border border-sa-border ' +
  'bg-transparent text-sa-white font-bold text-sm px-5 py-2 hover:bg-sa-hover'

export function BackupRestore() {
  const fileRef = useRef<HTMLInputElement | null>(null)
  const [exportPw, setExportPw] = useState('')
  const [status, setStatus] = useState<Status>({ kind: 'idle' })
  const [pending, setPending] = useState<BackupFile | null>(null)
  const [restorePw, setRestorePw] = useState('')
  const [restoreMode, setRestoreMode] = useState<'merge' | 'replace'>('merge')

  async function onExport() {
    setStatus({ kind: 'working', msg: 'Building backup…' })
    try {
      const file = await createBackup(exportPw.trim() || undefined)
      downloadBackup(file)
      setStatus({
        kind: 'ok',
        msg: exportPw ? 'Encrypted backup downloaded.' : 'Backup downloaded (unencrypted).',
      })
      setExportPw('')
    } catch (err) {
      reportError('BackupRestore.export', err)
      setStatus({ kind: 'error', msg: err instanceof Error ? err.message : 'Export failed' })
    }
  }

  async function onPickFile(ev: React.ChangeEvent<HTMLInputElement>) {
    const f = ev.target.files?.[0]
    ev.target.value = ''
    if (!f) return
    setStatus({ kind: 'working', msg: 'Reading file…' })
    try {
      const file = await readBackupFromFile(f)
      if (!isBackupFile(file)) throw new Error('Unrecognised backup format')
      setPending(file)
      setStatus({ kind: 'idle' })
    } catch (err) {
      reportError('BackupRestore.read', err)
      setPending(null)
      setStatus({ kind: 'error', msg: err instanceof Error ? err.message : 'Invalid file' })
    }
  }

  async function onConfirmRestore() {
    if (!pending) return
    setStatus({ kind: 'working', msg: 'Restoring…' })
    try {
      const { restored } = await restoreBackup(pending, restoreMode, restorePw.trim() || undefined)
      emitRestoreEvent()
      setStatus({ kind: 'ok', msg: `Restored ${restored} record groups.` })
      setPending(null)
      setRestorePw('')
    } catch (err) {
      reportError('BackupRestore.confirm', err)
      setStatus({ kind: 'error', msg: err instanceof Error ? err.message : 'Restore failed' })
    }
  }

  const statusColor =
    status.kind === 'ok'
      ? 'text-sa-green'
      : status.kind === 'error'
        ? 'text-sa-red'
        : 'text-sa-muted'

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm leading-relaxed text-sa-muted">
        Your local data is encrypted on this device. Use backup to move your data between devices or
        keep an off-device copy. An optional passphrase encrypts the backup file itself.
      </p>

      {/* ── Export ───────────────────────────────────────────────────── */}
      <div>
        <label className={labelCls}>Backup passphrase (optional)</label>
        <input
          type="password"
          placeholder="Leave blank for unencrypted backup"
          value={exportPw}
          onChange={(e) => setExportPw(e.target.value)}
          className={inputCls}
          autoComplete="new-password"
        />
        <div className="mt-2.5">
          <button onClick={onExport} className={btnPrimary}>
            <Download size={14} /> Download backup
          </button>
        </div>
      </div>

      <div className="border-t border-sa-border" />

      {/* ── Import ───────────────────────────────────────────────────── */}
      <div>
        <label className={labelCls}>Restore from backup file</label>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          onChange={onPickFile}
          className="hidden"
        />
        <button onClick={() => fileRef.current?.click()} className={btnGhost}>
          <Upload size={14} /> Choose file…
        </button>

        {pending && (
          <div className="mt-3.5 flex flex-col gap-3 rounded-md border border-sa-border bg-sa-gray p-3.5">
            <div className="text-sm text-sa-white">
              Backup from <strong>{new Date(pending.createdAt).toLocaleString('en-GB')}</strong>
              {' · '}
              {pending.encrypted ? 'encrypted' : 'unencrypted'}
            </div>

            {pending.encrypted && (
              <div>
                <label className={labelCls}>Passphrase</label>
                <input
                  type="password"
                  value={restorePw}
                  onChange={(e) => setRestorePw(e.target.value)}
                  className={inputCls}
                  autoComplete="off"
                />
              </div>
            )}

            <div>
              <label className={labelCls}>Mode</label>
              <div className="flex gap-3.5 text-sm text-sa-white">
                <label className="inline-flex items-center gap-1.5">
                  <input
                    type="radio"
                    checked={restoreMode === 'merge'}
                    onChange={() => setRestoreMode('merge')}
                  />
                  Merge into current data
                </label>
                <label className="inline-flex items-center gap-1.5">
                  <input
                    type="radio"
                    checked={restoreMode === 'replace'}
                    onChange={() => setRestoreMode('replace')}
                  />
                  Replace current data
                </label>
              </div>
            </div>

            <div className="flex gap-2.5">
              <button onClick={onConfirmRestore} className={btnPrimary}>
                Restore
              </button>
              <button
                onClick={() => {
                  setPending(null)
                  setRestorePw('')
                }}
                className={btnGhost}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Status line ──────────────────────────────────────────────── */}
      {status.kind !== 'idle' && (
        <div role="status" className={`inline-flex items-center gap-2 text-sm ${statusColor}`}>
          {status.kind === 'working' && <Loader2 size={14} className="animate-spin" />}
          {status.kind === 'ok' && <CheckCircle size={14} />}
          {status.kind === 'error' && <AlertCircle size={14} />}
          <span>{status.msg}</span>
        </div>
      )}
    </div>
  )
}
