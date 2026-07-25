'use client'

import { useEffect, useState } from 'react'
import { readAuditLog, type AuditEntry } from '@/lib/audit'
import { isFlagEnabled, setFlag, FLAG_AUDIT } from '@/lib/feature-flags'
import { RefreshCw, ShieldCheck, ToggleLeft, ToggleRight } from 'lucide-react'

import { C } from '@/styles/palette'
import { T } from '@/styles/type'
const OP_COLORS: Record<string, string> = {
  create: C.green,
  update: C.blue,
  delete: C.red,
}

export default function AuditPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [enabled, setEnabled] = useState(() => isFlagEnabled(FLAG_AUDIT))
  const [expanded, setExpanded] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    const rows = await readAuditLog(500)
    setEntries(rows)
    setLoading(false)
  }

  useEffect(() => {
    let active = true
    void readAuditLog(500).then((rows) => {
      if (!active) return
      setEntries(rows)
      setLoading(false)
    })
    return () => {
      active = false
    }
  }, [])

  function toggleFlag() {
    const next = !enabled
    setFlag(FLAG_AUDIT, next)
    setEnabled(next)
  }

  return (
    <div className="page-shell is-wide">
      <div style={{ marginBottom: '1.75rem' }}>
        <div
          style={{
            color: C.dim,
            fontSize: T.micro,
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
            fontFamily: 'var(--font-geist-mono),monospace',
            marginBottom: 5,
          }}
        >
          security
        </div>
        <h1
          style={{
            color: C.white,
            fontSize: T.h2,
            fontWeight: 600,
            letterSpacing: '-0.03em',
            margin: '0 0 4px',
          }}
        >
          Audit Trail
        </h1>
        <p style={{ color: C.muted, fontSize: T.caption, margin: 0, lineHeight: 1.55 }}>
          Every create, update, and delete logged locally. Enable to start recording.
        </p>
      </div>

      {/* Controls */}
      <div
        style={{
          display: 'flex',
          gap: '0.6rem',
          marginBottom: '1.25rem',
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        <button
          onClick={toggleFlag}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            background: enabled ? 'rgba(74,222,128,0.08)' : C.surface,
            border: `1px solid ${enabled ? 'rgba(74,222,128,0.25)' : C.border}`,
            color: enabled ? C.green : C.muted,
            borderRadius: 4,
            padding: '7px 14px',
            fontSize: T.meta,
            cursor: 'pointer',
            fontWeight: 500,
          }}
        >
          {enabled ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
          Audit logging {enabled ? 'on' : 'off'}
        </button>
        <button
          onClick={load}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: 'transparent',
            border: `1px solid ${C.border}`,
            color: C.muted,
            borderRadius: 4,
            padding: '7px 12px',
            fontSize: T.meta,
            cursor: 'pointer',
          }}
        >
          <RefreshCw size={12} /> Refresh
        </button>
      </div>

      {!enabled && (
        <div
          style={{
            background: 'rgba(251,191,36,0.05)',
            border: '1px solid rgba(251,191,36,0.2)',
            borderRadius: 6,
            padding: '0.85rem 1rem',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            color: C.amber,
            fontSize: T.meta,
          }}
        >
          <ShieldCheck size={14} />
          Audit logging is off — no events are being recorded. Toggle above to enable.
        </div>
      )}

      {loading ? (
        <div
          style={{
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: 6,
            padding: '3rem',
            textAlign: 'center',
            color: C.muted,
            fontSize: T.meta,
          }}
        >
          Loading…
        </div>
      ) : entries.length === 0 ? (
        <div
          style={{
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: 6,
            padding: '3rem',
            textAlign: 'center',
            color: C.muted,
            fontSize: T.meta,
          }}
        >
          No audit entries yet.
          {enabled ? ' Events will appear here after you create, edit, or delete data.' : ''}
        </div>
      ) : (
        <div
          style={{
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: 6,
            overflow: 'hidden',
          }}
        >
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: T.meta }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                  {['Timestamp', 'Entity', 'Op', 'ID', 'Actor', ''].map((h, i) => (
                    <th
                      key={i}
                      style={{
                        padding: '9px 12px',
                        textAlign: 'left',
                        color: C.muted,
                        fontWeight: 600,
                        fontSize: T.micro,
                        textTransform: 'uppercase',
                        letterSpacing: '0.07em',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => {
                  const isOpen = expanded === e.id
                  return (
                    <>
                      <tr
                        key={e.id}
                        style={{
                          borderBottom: `1px solid rgba(244,245,248,0.04)`,
                          cursor: 'pointer',
                          background: isOpen ? 'rgba(244,245,248,0.02)' : 'transparent',
                        }}
                        onClick={() => setExpanded(isOpen ? null : e.id)}
                      >
                        <td
                          style={{
                            padding: '8px 12px',
                            color: C.muted,
                            fontFamily: 'var(--font-geist-mono),monospace',
                            fontSize: T.caption,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {new Date(e.ts).toLocaleString('en-GB')}
                        </td>
                        <td style={{ padding: '8px 12px', color: C.white }}>{e.entity}</td>
                        <td style={{ padding: '8px 12px' }}>
                          <span
                            style={{
                              color: OP_COLORS[e.op] ?? C.muted,
                              fontFamily: 'var(--font-geist-mono),monospace',
                              fontSize: T.caption,
                              fontWeight: 600,
                            }}
                          >
                            {e.op}
                          </span>
                        </td>
                        <td
                          style={{
                            padding: '8px 12px',
                            color: C.dim,
                            fontFamily: 'var(--font-geist-mono),monospace',
                            fontSize: T.micro,
                          }}
                        >
                          {e.entityId.slice(0, 8)}…
                        </td>
                        <td style={{ padding: '8px 12px', color: C.muted, fontSize: T.caption }}>
                          {e.actor ?? '—'}
                        </td>
                        <td style={{ padding: '8px 12px', color: C.dim, fontSize: T.micro }}>
                          {isOpen ? '▲' : '▼'}
                        </td>
                      </tr>
                      {isOpen && (
                        <tr
                          key={`${e.id}-detail`}
                          style={{ borderBottom: `1px solid rgba(244,245,248,0.04)` }}
                        >
                          <td colSpan={6} style={{ padding: '0 12px 12px' }}>
                            <div
                              style={{
                                display: 'grid',
                                gridTemplateColumns: '1fr 1fr',
                                gap: '0.75rem',
                              }}
                            >
                              <div>
                                <div
                                  style={{
                                    color: C.dim,
                                    fontSize: T.micro,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.07em',
                                    marginBottom: 4,
                                    fontFamily: 'var(--font-geist-mono),monospace',
                                  }}
                                >
                                  Before
                                </div>
                                <pre
                                  style={{
                                    background: C.gray,
                                    borderRadius: 4,
                                    padding: '8px 10px',
                                    color: C.muted,
                                    fontSize: T.micro,
                                    overflowX: 'auto',
                                    margin: 0,
                                    whiteSpace: 'pre-wrap',
                                    wordBreak: 'break-all',
                                  }}
                                >
                                  {e.before !== null ? JSON.stringify(e.before, null, 2) : 'null'}
                                </pre>
                              </div>
                              <div>
                                <div
                                  style={{
                                    color: C.dim,
                                    fontSize: T.micro,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.07em',
                                    marginBottom: 4,
                                    fontFamily: 'var(--font-geist-mono),monospace',
                                  }}
                                >
                                  After
                                </div>
                                <pre
                                  style={{
                                    background: C.gray,
                                    borderRadius: 4,
                                    padding: '8px 10px',
                                    color: C.muted,
                                    fontSize: T.micro,
                                    overflowX: 'auto',
                                    margin: 0,
                                    whiteSpace: 'pre-wrap',
                                    wordBreak: 'break-all',
                                  }}
                                >
                                  {e.after !== null ? JSON.stringify(e.after, null, 2) : 'null'}
                                </pre>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div
            style={{
              padding: '8px 12px',
              borderTop: `1px solid ${C.border}`,
              color: C.dim,
              fontSize: T.micro,
              fontFamily: 'var(--font-geist-mono),monospace',
            }}
          >
            {entries.length} entries (device-local) · click row to diff
          </div>
        </div>
      )}
    </div>
  )
}
