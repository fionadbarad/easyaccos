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

type Status =
  | { kind: 'idle' }
  | { kind: 'working'; msg: string }
  | { kind: 'ok'; msg: string }
  | { kind: 'error'; msg: string }

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
      setPending(null)
      setStatus({ kind: 'error', msg: err instanceof Error ? err.message : 'Invalid file' })
    }
  }

  async function onConfirmRestore() {
    if (!pending) return
    setStatus({ kind: 'working', msg: 'Restoring…' })
    try {
      const { restored } = await restoreBackup(pending, restoreMode, restorePw.trim() || undefined)
      setStatus({ kind: 'ok', msg: `Restored ${restored} record groups. Refresh to see changes.` })
      setPending(null)
      setRestorePw('')
    } catch (err) {
      setStatus({ kind: 'error', msg: err instanceof Error ? err.message : 'Restore failed' })
    }
  }

  return (
    <div className="flex flex-col gap-[1.4rem]">
      <p className="text-[rgba(244,245,248,0.42)] text-[0.85rem] m-0 leading-[1.55]">
        Your local data is encrypted on this device. Use backup to move your data between
        devices or keep an off-device copy. An optional passphrase encrypts the backup file
        itself.
      </p>

      {/* ── Export ─────────────────────────────────────────── */}
      <div>
        <label className="block text-[rgba(244,245,248,0.42)] text-[0.75rem] uppercase tracking-[0.07em] mb-[0.35rem]">Backup passphrase (optional)</label>
        <input
          type="password"
          placeholder="Leave blank for unencrypted backup"
          value={exportPw}
          onChange={(e) => setExportPw(e.target.value)}
          className="w-full bg-[#222326] border border-[rgba(244,245,248,0.07)] rounded-[4px] px-[13px] py-[9px] text-[#F4F5F8] text-[0.9rem] outline-none"
          autoComplete="new-password"
        />
        <div className="mt-[10px]">
          <button onClick={onExport} className="bg-[#F4F5F8] text-[#181818] border-none rounded-[4px] px-[22px] py-[9px] font-bold text-[0.875rem] inline-flex items-center gap-[8px] cursor-pointer transition-opacity duration-[140ms] ease-in-out">
            <Download size={15} /> Download backup
          </button>
        </div>
      </div>

      <div className="border-t border-[rgba(244,245,248,0.07)]" />

      {/* ── Import ─────────────────────────────────────────── */}
      <div>
        <label className="block text-[rgba(244,245,248,0.42)] text-[0.75rem] uppercase tracking-[0.07em] mb-[0.35rem]">Restore from backup file</label>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          onChange={onPickFile}
          className="hidden"
        />
        <button onClick={() => fileRef.current?.click()} className="bg-transparent text-[#F4F5F8] border border-[rgba(244,245,248,0.07)] rounded-[4px] px-[22px] py-[9px] font-bold text-[0.875rem] inline-flex items-center gap-[8px] cursor-pointer transition-opacity duration-[140ms] ease-in-out">
          <Upload size={15} /> Choose file…
        </button>

        {pending && (
          <div className="mt-[14px] p-[14px] border border-[rgba(244,245,248,0.07)] rounded-[6px] bg-[#222326] flex flex-col gap-[12px]">
            <div className="text-[#F4F5F8] text-[0.88rem]">
              Backup from{' '}
              <strong>{new Date(pending.createdAt).toLocaleString('en-GB')}</strong>
              {' · '}
              {pending.encrypted ? 'encrypted' : 'unencrypted'}
            </div>

            {pending.encrypted && (
              <div>
                <label className="block text-[rgba(244,245,248,0.42)] text-[0.75rem] uppercase tracking-[0.07em] mb-[0.35rem]">Passphrase</label>
                <input
                  type="password"
                  value={restorePw}
                  onChange={(e) => setRestorePw(e.target.value)}
                  className="w-full bg-[#222326] border border-[rgba(244,245,248,0.07)] rounded-[4px] px-[13px] py-[9px] text-[#F4F5F8] text-[0.9rem] outline-none"
                  autoComplete="off"
                />
              </div>
            )}

            <div>
              <label className="block text-[rgba(244,245,248,0.42)] text-[0.75rem] uppercase tracking-[0.07em] mb-[0.35rem]">Mode</label>
              <div className="flex gap-[14px] text-[#F4F5F8] text-[0.85rem]">
                <label className="inline-flex items-center gap-[6px]">
                  <input
                    type="radio"
                    checked={restoreMode === 'merge'}
                    onChange={() => setRestoreMode('merge')}
                  />
                  Merge into current data
                </label>
                <label className="inline-flex items-center gap-[6px]">
                  <input
                    type="radio"
                    checked={restoreMode === 'replace'}
                    onChange={() => setRestoreMode('replace')}
                  />
                  Replace current data
                </label>
              </div>
            </div>

            <div className="flex gap-[10px]">
              <button onClick={onConfirmRestore} className="bg-[#F4F5F8] text-[#181818] border-none rounded-[4px] px-[22px] py-[9px] font-bold text-[0.875rem] inline-flex items-center gap-[8px] cursor-pointer transition-opacity duration-[140ms] ease-in-out">
                Restore
              </button>
              <button
                onClick={() => { setPending(null); setRestorePw('') }}
                className="bg-transparent text-[#F4F5F8] border border-[rgba(244,245,248,0.07)] rounded-[4px] px-[22px] py-[9px] font-bold text-[0.875rem] inline-flex items-center gap-[8px] cursor-pointer transition-opacity duration-[140ms] ease-in-out"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Status line ────────────────────────────────────── */}
      {status.kind !== 'idle' && (
        <div
          role="status"
          className={`inline-flex items-center gap-[8px] text-[0.85rem] ${
            status.kind === 'ok'    ? 'text-[#4ADE80]'
            : status.kind === 'error' ? 'text-[#F87171]'
            : 'text-[rgba(244,245,248,0.42)]'
          }`}
        >
          {status.kind === 'working' && <Loader2 size={15} className="animate-spin" />}
          {status.kind === 'ok'      && <CheckCircle size={15} />}
          {status.kind === 'error'   && <AlertCircle size={15} />}
          <span>{status.msg}</span>
        </div>
      )}
    </div>
  )
}
