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

import { C } from '@/styles/palette'
const inputStyle: React.CSSProperties = {
  width: '100%',
  background: C.deep,
  border: `1px solid ${C.border}`,
  borderRadius: 4,
  padding: '9px 13px',
  color: C.text,
  fontSize: '0.9rem',
  outline: 'none',
  boxSizing: 'border-box',
}
const labelStyle: React.CSSProperties = {
  display: 'block',
  color: C.muted,
  fontSize: '0.75rem',
  textTransform: 'uppercase',
  letterSpacing: '0.07em',
  marginBottom: '0.35rem',
}
const btnPrimary: React.CSSProperties = {
  background: C.white,
  color: '#181818',
  border: 'none',
  borderRadius: 4,
  padding: '9px 22px',
  fontWeight: 700,
  fontSize: '0.875rem',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  cursor: 'pointer',
  transition: 'opacity 140ms ease',
}
const btnGhost: React.CSSProperties = {
  ...btnPrimary,
  background: 'transparent',
  color: C.text,
  border: `1px solid ${C.border}`,
}

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.4rem' }}>
      <p style={{ color: C.muted, fontSize: '0.85rem', margin: 0, lineHeight: 1.55 }}>
        Your local data is encrypted on this device. Use backup to move your data between
        devices or keep an off-device copy. An optional passphrase encrypts the backup file
        itself.
      </p>

      {/* ── Export ─────────────────────────────────────────── */}
      <div>
        <label style={labelStyle}>Backup passphrase (optional)</label>
        <input
          type="password"
          placeholder="Leave blank for unencrypted backup"
          value={exportPw}
          onChange={(e) => setExportPw(e.target.value)}
          style={inputStyle}
          autoComplete="new-password"
        />
        <div style={{ marginTop: 10 }}>
          <button onClick={onExport} style={btnPrimary}>
            <Download size={15} /> Download backup
          </button>
        </div>
      </div>

      <div style={{ borderTop: `1px solid ${C.border}` }} />

      {/* ── Import ─────────────────────────────────────────── */}
      <div>
        <label style={labelStyle}>Restore from backup file</label>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          onChange={onPickFile}
          style={{ display: 'none' }}
        />
        <button onClick={() => fileRef.current?.click()} style={btnGhost}>
          <Upload size={15} /> Choose file…
        </button>

        {pending && (
          <div
            style={{
              marginTop: 14,
              padding: 14,
              border: `1px solid ${C.border}`,
              borderRadius: 6,
              background: C.deep,
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            <div style={{ color: C.text, fontSize: '0.88rem' }}>
              Backup from{' '}
              <strong>{new Date(pending.createdAt).toLocaleString('en-GB')}</strong>
              {' · '}
              {pending.encrypted ? 'encrypted' : 'unencrypted'}
            </div>

            {pending.encrypted && (
              <div>
                <label style={labelStyle}>Passphrase</label>
                <input
                  type="password"
                  value={restorePw}
                  onChange={(e) => setRestorePw(e.target.value)}
                  style={inputStyle}
                  autoComplete="off"
                />
              </div>
            )}

            <div>
              <label style={labelStyle}>Mode</label>
              <div style={{ display: 'flex', gap: 14, color: C.text, fontSize: '0.85rem' }}>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <input
                    type="radio"
                    checked={restoreMode === 'merge'}
                    onChange={() => setRestoreMode('merge')}
                  />
                  Merge into current data
                </label>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <input
                    type="radio"
                    checked={restoreMode === 'replace'}
                    onChange={() => setRestoreMode('replace')}
                  />
                  Replace current data
                </label>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={onConfirmRestore} style={btnPrimary}>
                Restore
              </button>
              <button
                onClick={() => { setPending(null); setRestorePw('') }}
                style={btnGhost}
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
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            fontSize: '0.85rem',
            color:
              status.kind === 'ok'    ? C.good
              : status.kind === 'error' ? C.warn
              : C.muted,
          }}
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
