import { ChevronDown, ChevronUp, Info } from 'lucide-react'
import { C } from '@/styles/palette'

// ── Rate info panel ───────────────────────────────────────────────────────────
export function RatePanel({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  return (
    <div
      style={{
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: '6px',
        overflow: 'hidden',
      }}
    >
      <button
        onClick={onToggle}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.75rem 1rem',
          background: 'none',
          border: 'none',
          color: C.white,
          cursor: 'pointer',
          fontSize: '0.78rem',
          fontWeight: 500,
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
          <Info size={13} style={{ color: C.muted }} />
          HMRC Approved Mileage Rates 2026/27
        </span>
        {open ? <ChevronUp size={13} color={C.muted} /> : <ChevronDown size={13} color={C.muted} />}
      </button>
      {open && (
        <div style={{ padding: '0 1rem 1rem', borderTop: `1px solid ${C.border}` }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '0.78rem',
              marginTop: '0.75rem',
            }}
          >
            <thead>
              <tr>
                {['Vehicle', 'First 10,000 mi', 'Above 10,000 mi'].map((h) => (
                  <th
                    key={h}
                    style={{
                      textAlign: 'left',
                      color: C.muted,
                      fontWeight: 500,
                      padding: '4px 8px 8px 0',
                      fontSize: '0.68rem',
                      letterSpacing: '0.04em',
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                ['Car / Van', '55p per mile', '25p per mile'],
                ['Motorcycle', '24p per mile', '24p per mile'],
                ['Bicycle', '20p per mile', '20p per mile'],
              ].map(([v, r1, r2]) => (
                <tr key={v} style={{ borderTop: `1px solid ${C.border}` }}>
                  <td style={{ padding: '6px 8px 6px 0', color: C.white }}>{v}</td>
                  <td
                    style={{
                      padding: '6px 8px 6px 0',
                      color: C.green,
                      fontFamily: 'var(--font-geist-mono, monospace)',
                    }}
                  >
                    {r1}
                  </td>
                  <td
                    style={{
                      padding: '6px 8px 6px 0',
                      color: C.muted,
                      fontFamily: 'var(--font-geist-mono, monospace)',
                    }}
                  >
                    {r2}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p style={{ color: C.muted, fontSize: '0.68rem', marginTop: '10px', lineHeight: 1.5 }}>
            Use these HMRC-approved rates instead of claiming actual vehicle costs. The car
            threshold resets each tax year (6 April). Only business journeys qualify — commuting to
            a regular workplace does not.
          </p>
        </div>
      )}
    </div>
  )
}
