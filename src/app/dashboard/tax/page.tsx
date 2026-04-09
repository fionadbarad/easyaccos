'use client'

import { useState } from 'react'
import TaxCalculator5 from '@/components/TaxCalculator5'
import { CalendarClock, PiggyBank, AlertTriangle, Info } from 'lucide-react'

const C = {
  bg:     '#020617',
  card:   '#111827',
  gold:   '#EAB308',
  soft:   '#C2A368',
  text:   '#E5E7EB',
  muted:  'rgba(229,231,235,0.55)',
  border: 'rgba(234,179,8,0.18)',
  deep:   '#050816',
}

// ─── 31 July Tax Pot Widget ───────────────────────────────────────────────────
// Calculates Self-Assessment Payments on Account so users never get blindsided.
function TaxPotSidebar() {
  const [estimatedBill, setEstimatedBill] = useState('3000')

  const bill   = Math.max(0, Number(estimatedBill) || 0)
  // HMRC: POA applies when tax bill > £1,000 and less than 80% was collected at source
  const poaApplies = bill >= 1_000
  const poa1   = Math.round(bill / 2)          // 31 Jan 2027
  const poa2   = Math.round(bill / 2)          // 31 Jul 2027
  const jan31  = poa1                            // 1st POA (treated as part of Jan total)
  const jul31  = poa2

  // Monthly saving target — spread across 12 months for the next Jan bill
  const monthlyTarget = Math.round((bill + poa1) / 12)

  // Monthly saving target just for the Jul 31 pot
  const monthlyJulPot = Math.round(poa2 / 6) // save from Feb→Jul

  const fmtGBP = (n: number) => `£${n.toLocaleString('en-GB')}`

  const DEADLINES = [
    { date: '31 Jan 2027', label: '1st Payment on Account', amount: jan31, color: C.gold, note: '50% of your 2026/27 bill' },
    { date: '31 Jul 2027', label: '2nd Payment on Account', amount: jul31, color: '#FB923C', note: '50% of your 2026/27 bill' },
    { date: '31 Jan 2028', label: 'Balancing Payment',      amount: null,  color: C.muted,  note: 'Any remaining balance after final return' },
  ]

  const mtdDue = [
    { label: 'Q1 Update', date: '7 Aug 2026',  note: 'Apr–Jun income/expenses' },
    { label: 'Q2 Update', date: '7 Nov 2026',  note: 'Jul–Sep income/expenses' },
    { label: 'Q3 Update', date: '7 Feb 2027',  note: 'Oct–Dec income/expenses' },
    { label: 'Q4 Update', date: '7 May 2027',  note: 'Jan–Mar income/expenses' },
    { label: 'Final Declaration', date: '31 Jan 2028', note: 'End-of-year submission' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

      {/* ── Tax Pot ── */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '10px', padding: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
          <PiggyBank size={18} style={{ color: C.gold, flexShrink: 0 }} />
          <div>
            <h2 style={{ color: C.text, fontSize: '0.95rem', fontWeight: 700, margin: 0 }}>31 July Tax Pot</h2>
            <p style={{ color: C.muted, fontSize: '0.68rem', margin: 0 }}>Payment on Account planner</p>
          </div>
        </div>

        <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '1rem' }}>
          <span style={{ color: C.muted, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Estimated 2026/27 Tax Bill (£)
          </span>
          <input
            type="number"
            min={0}
            step={100}
            value={estimatedBill}
            onChange={(e) => setEstimatedBill(e.target.value)}
            style={{
              background: C.deep, border: `1px solid ${C.border}`,
              borderRadius: '6px', padding: '9px 12px', color: C.text,
              fontSize: '0.9rem', outline: 'none', width: '100%',
              boxSizing: 'border-box',
            }}
          />
        </label>

        {!poaApplies && bill > 0 && (
          <div style={{ padding: '0.6rem 0.9rem', background: 'rgba(74,222,128,0.07)', border: '1px solid rgba(74,222,128,0.25)', borderRadius: '6px', marginBottom: '1rem' }}>
            <span style={{ color: '#4ADE80', fontSize: '0.78rem' }}>
              ✓ Bill under £1,000 — Payment on Account does <strong>not</strong> apply. Pay in full by 31 Jan 2027.
            </span>
          </div>
        )}

        {poaApplies && (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
              {DEADLINES.map((d) => (
                <div key={d.date} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '0.65rem 0.9rem',
                  background: d.amount ? 'rgba(255,255,255,0.03)' : 'transparent',
                  border: d.amount ? `1px solid ${C.border}` : 'none',
                  borderRadius: '6px',
                }}>
                  <div>
                    <div style={{ color: d.color, fontSize: '0.78rem', fontWeight: 600 }}>{d.label}</div>
                    <div style={{ color: C.muted, fontSize: '0.68rem' }}>{d.date} · {d.note}</div>
                  </div>
                  <div style={{ color: d.color, fontWeight: 700, fontSize: '0.95rem', fontFamily: 'monospace' }}>
                    {d.amount != null ? fmtGBP(d.amount) : 'Variable'}
                  </div>
                </div>
              ))}
            </div>

            {/* Saving targets */}
            <div style={{ background: 'rgba(234,179,8,0.06)', border: `1px solid rgba(234,179,8,0.22)`, borderRadius: '8px', padding: '0.9rem 1rem' }}>
              <div style={{ color: C.gold, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.6rem' }}>
                Monthly saving targets
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: C.muted, fontSize: '0.8rem' }}>Jan 2027 pot (spread /12)</span>
                  <span style={{ color: C.text, fontWeight: 700, fontFamily: 'monospace', fontSize: '0.88rem' }}>
                    {fmtGBP(monthlyTarget)}/mo
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: C.muted, fontSize: '0.8rem' }}>Jul 2027 pot (Feb–Jul)</span>
                  <span style={{ color: '#FB923C', fontWeight: 700, fontFamily: 'monospace', fontSize: '0.88rem' }}>
                    {fmtGBP(monthlyJulPot)}/mo
                  </span>
                </div>
              </div>
            </div>

            <div style={{ marginTop: '0.75rem', display: 'flex', gap: '6px', alignItems: 'flex-start' }}>
              <Info size={13} style={{ color: C.muted, flexShrink: 0, marginTop: '1px' }} />
              <p style={{ color: C.muted, fontSize: '0.69rem', margin: 0, lineHeight: 1.5 }}>
                Payments on Account apply when your self-assessment bill exceeds £1,000 and less than 80% was deducted at source. Each instalment = 50% of prior year bill.
              </p>
            </div>
          </>
        )}
      </div>

      {/* ── MTD Deadlines ── */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '10px', padding: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
          <CalendarClock size={18} style={{ color: C.gold, flexShrink: 0 }} />
          <div>
            <h2 style={{ color: C.text, fontSize: '0.95rem', fontWeight: 700, margin: 0 }}>Key Deadlines</h2>
            <p style={{ color: C.muted, fontSize: '0.68rem', margin: 0 }}>2026/27 MTD &amp; Self-Assessment</p>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {mtdDue.map((d) => (
            <div key={d.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
              <div>
                <div style={{ color: C.text, fontSize: '0.8rem', fontWeight: 600 }}>{d.label}</div>
                <div style={{ color: C.muted, fontSize: '0.69rem' }}>{d.note}</div>
              </div>
              <div style={{ color: C.gold, fontSize: '0.75rem', fontFamily: 'monospace', whiteSpace: 'nowrap', flexShrink: 0 }}>{d.date}</div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: '1rem', padding: '0.6rem 0.9rem', background: 'rgba(234,179,8,0.06)', border: `1px solid rgba(234,179,8,0.2)`, borderRadius: '6px' }}>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-start' }}>
            <AlertTriangle size={13} style={{ color: C.gold, flexShrink: 0, marginTop: '1px' }} />
            <p style={{ color: C.muted, fontSize: '0.69rem', margin: 0, lineHeight: 1.5 }}>
              <strong style={{ color: C.gold }}>MTD mandation: £50,000</strong> threshold for 2026/27.
              Above this, quarterly updates replace the annual Self-Assessment return.
            </p>
          </div>
        </div>
      </div>

    </div>
  )
}

// ─── Tax Page ─────────────────────────────────────────────────────────────────
export default function TaxPage() {
  return (
    <div style={{ padding: 'clamp(1.5rem,4vw,2.5rem)', background: C.bg, minHeight: '100vh' }}>

      {/* Header */}
      <div style={{ marginBottom: '1.75rem' }}>
        <h1 style={{ fontFamily: 'var(--font-playfair)', color: C.text, fontSize: 'clamp(1.5rem,3vw,2rem)', fontWeight: 700, margin: '0 0 4px' }}>
          Tax Calculator 2026/27
        </h1>
        <p style={{ color: C.muted, fontSize: '0.875rem', margin: 0, lineHeight: 1.6 }}>
          Five HMRC-accurate scenarios. Use the{' '}
          <strong style={{ color: C.gold }}>What-If slider</strong> to see changes live.
          Click <strong style={{ color: C.gold }}>🔊</strong> to have Kittax read results aloud.
        </p>
      </div>

      {/* Left / Right layout — inputs & calculator | Tax Pot sidebar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 280px', gap: '1.5rem', alignItems: 'start' }}
        className="tax-page-grid">
        <div>
          <TaxCalculator5 />
        </div>
        <div style={{ position: 'sticky', top: '1.5rem' }}>
          <TaxPotSidebar />
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .tax-page-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  )
}
