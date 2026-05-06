'use client'

import { useEffect, useState } from 'react'
import { readAuditLog, type AuditEntry } from '@/lib/audit'
import { isFlagEnabled, setFlag, FLAG_AUDIT } from '@/lib/feature-flags'
import { RefreshCw, ShieldCheck, ToggleLeft, ToggleRight } from 'lucide-react'

const OP_COLORS: Record<string, string> = {
  create: '#4ADE80',
  update: '#93C5FD',
  delete: '#F87171',
}

export default function AuditPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [enabled, setEnabled] = useState(() => isFlagEnabled(FLAG_AUDIT))
  const [expanded, setExpanded] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setEntries(await readAuditLog(500))
    setLoading(false)
  }

  useEffect(() => { void load() }, [])

  function toggleFlag() {
    const next = !enabled
    setFlag(FLAG_AUDIT, next)
    setEnabled(next)
  }

  return (
    <div className="p-[clamp(1.5rem,4vw,2.5rem)] max-w-[960px]">
      <div className="mb-[1.75rem]">
        <div className="text-[rgba(244,245,248,0.18)] text-[0.6rem] uppercase tracking-[0.12em] font-mono mb-[5px]">
          security
        </div>
        <h1 className="text-[var(--sa-white)] text-[clamp(1.3rem,3vw,1.8rem)] font-semibold tracking-[-0.03em] m-0 mb-[4px]">
          Audit Trail
        </h1>
        <p className="text-[rgba(244,245,248,0.42)] text-[0.78rem] m-0 leading-[1.55]">
          Every create, update, and delete logged locally. Enable to start recording.
        </p>
      </div>

      {/* Controls */}
      <div className="flex gap-[0.6rem] mb-[1.25rem] flex-wrap items-center">
        <button
          onClick={toggleFlag}
          className={`inline-flex items-center gap-[8px] rounded-[4px] p-[7px_14px] text-[0.8rem] cursor-pointer font-medium ${enabled ? 'bg-[rgba(74,222,128,0.08)] border border-[rgba(74,222,128,0.25)] text-[#4ADE80]' : 'bg-[var(--sa-surface)] border border-[var(--sa-border)] text-[rgba(244,245,248,0.42)]'}`}
        >
          {enabled ? <ToggleRight size={15} /> : <ToggleLeft size={15} />}
          Audit logging {enabled ? 'on' : 'off'}
        </button>
        <button
          onClick={load}
          className="inline-flex items-center gap-[6px] bg-transparent border border-[var(--sa-border)] text-[rgba(244,245,248,0.42)] rounded-[4px] p-[7px_12px] text-[0.8rem] cursor-pointer"
        >
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {!enabled && (
        <div className="bg-[rgba(251,191,36,0.05)] border border-[rgba(251,191,36,0.2)] rounded-[6px] p-[0.85rem_1rem] mb-[1.25rem] flex items-center gap-[8px] text-[#FBBF24] text-[0.8rem]">
          <ShieldCheck size={14} />
          Audit logging is off — no events are being recorded. Toggle above to enable.
        </div>
      )}

      {loading ? (
        <div className="bg-[var(--sa-surface)] border border-[var(--sa-border)] rounded-[6px] p-[3rem] text-center text-[rgba(244,245,248,0.42)] text-[0.84rem]">
          Loading…
        </div>
      ) : entries.length === 0 ? (
        <div className="bg-[var(--sa-surface)] border border-[var(--sa-border)] rounded-[6px] p-[3rem] text-center text-[rgba(244,245,248,0.42)] text-[0.84rem]">
          No audit entries yet.{enabled ? ' Events will appear here after you create, edit, or delete data.' : ''}
        </div>
      ) : (
        <div className="bg-[var(--sa-surface)] border border-[var(--sa-border)] rounded-[6px] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[0.8rem]">
              <thead>
                <tr className="border-b border-[var(--sa-border)]">
                  {['Timestamp', 'Entity', 'Op', 'ID', 'Actor', ''].map((h, i) => (
                    <th key={i} className="p-[9px_12px] text-left text-[rgba(244,245,248,0.42)] font-semibold text-[0.6rem] uppercase tracking-[0.07em] whitespace-nowrap">
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
                        className={`border-b border-[rgba(244,245,248,0.04)] cursor-pointer ${isOpen ? 'bg-[rgba(244,245,248,0.02)]' : 'bg-transparent'}`}
                        onClick={() => setExpanded(isOpen ? null : e.id)}
                      >
                        <td className="p-[8px_12px] text-[rgba(244,245,248,0.42)] font-mono text-[0.72rem] whitespace-nowrap">
                          {new Date(e.ts).toLocaleString('en-GB')}
                        </td>
                        <td className="p-[8px_12px] text-[var(--sa-white)]">{e.entity}</td>
                        <td className="p-[8px_12px]">
                          <span
                            className="font-mono text-[0.72rem] font-semibold"
                            style={{ color: OP_COLORS[e.op] ?? 'rgba(244,245,248,0.42)' }}
                          >
                            {e.op}
                          </span>
                        </td>
                        <td className="p-[8px_12px] text-[rgba(244,245,248,0.18)] font-mono text-[0.68rem]">
                          {e.entityId.slice(0, 8)}…
                        </td>
                        <td className="p-[8px_12px] text-[rgba(244,245,248,0.42)] text-[0.72rem]">{e.actor ?? '—'}</td>
                        <td className="p-[8px_12px] text-[rgba(244,245,248,0.18)] text-[0.7rem]">{isOpen ? '▲' : '▼'}</td>
                      </tr>
                      {isOpen && (
                        <tr key={`${e.id}-detail`} className="border-b border-[rgba(244,245,248,0.04)]">
                          <td colSpan={6} className="p-[0_12px_12px]">
                            <div className="grid grid-cols-2 gap-[0.75rem]">
                              <div>
                                <div className="text-[rgba(244,245,248,0.18)] text-[0.58rem] uppercase tracking-[0.07em] mb-[4px] font-mono">Before</div>
                                <pre className="bg-[var(--sa-gray)] rounded-[4px] p-[8px_10px] text-[rgba(244,245,248,0.42)] text-[0.68rem] overflow-x-auto m-0 whitespace-pre-wrap break-all">
                                  {e.before !== null ? JSON.stringify(e.before, null, 2) : 'null'}
                                </pre>
                              </div>
                              <div>
                                <div className="text-[rgba(244,245,248,0.18)] text-[0.58rem] uppercase tracking-[0.07em] mb-[4px] font-mono">After</div>
                                <pre className="bg-[var(--sa-gray)] rounded-[4px] p-[8px_10px] text-[rgba(244,245,248,0.42)] text-[0.68rem] overflow-x-auto m-0 whitespace-pre-wrap break-all">
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
          <div className="p-[8px_12px] border-t border-[var(--sa-border)] text-[rgba(244,245,248,0.18)] text-[0.68rem] font-mono">
            {entries.length} entries (device-local) · click row to diff
          </div>
        </div>
      )}
    </div>
  )
}
