'use client'

import { useState } from 'react'
import { Bell, X } from 'lucide-react'

const DEADLINES = [
  { month: 10, day: 5,  label: 'Register for Self Assessment',          detail: 'Deadline to register if you are self-employed for the first time.' },
  { month: 10, day: 31, label: 'Paper Self Assessment return deadline',  detail: 'Deadline to submit your paper tax return for 2025/26.' },
  { month: 1,  day: 31, label: 'Online return + tax payment due',        detail: 'Deadline to file online and pay any tax owed for 2025/26.' },
  { month: 7,  day: 31, label: 'Second payment on account due',          detail: 'Second instalment of advance tax payments for 2025/26.' },
]

function getNextDeadline() {
  const now = new Date()
  const year = now.getFullYear()

  const candidates = DEADLINES.flatMap(({ month, day, label, detail }) => {
    const dates = [
      new Date(year,     month - 1, day),
      new Date(year + 1, month - 1, day),
    ]
    return dates.map(d => ({ date: d, label, detail }))
  })

  const future = candidates
    .filter(c => c.date > now)
    .sort((a, b) => a.date.getTime() - b.date.getTime())

  return future[0] ?? null
}

function daysUntil(date: Date) {
  return Math.ceil((date.getTime() - Date.now()) / 86_400_000)
}

export default function SADeadlineBanner() {
  const [dismissed, setDismissed] = useState(false)
  const next = getNextDeadline()

  if (!next || dismissed) return null

  const days = daysUntil(next.date)
  if (days > 60) return null // only show within 60 days

  const urgent = days <= 14
  const dateStr = next.date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: '10px',
      padding: '10px 16px',
      background: urgent ? 'rgba(239,68,68,0.08)' : 'rgba(59,130,246,0.07)',
      borderBottom: `1px solid ${urgent ? 'rgba(239,68,68,0.2)' : 'rgba(59,130,246,0.18)'}`,
      color: urgent ? 'rgba(252,165,165,0.9)' : 'rgba(147,197,253,0.9)',
      fontSize: '0.78rem',
      fontFamily: 'var(--font-mono, monospace)',
    }}>
      <Bell size={13} style={{ flexShrink: 0, marginTop: 1 }} />
      <span style={{ flex: 1 }}>
        <strong style={{ fontWeight: 600 }}>HMRC deadline in {days} day{days !== 1 ? 's' : ''}</strong>
        {' — '}{next.label} · {dateStr}
        <span style={{ opacity: 0.65 }}> · {next.detail}</span>
      </span>
      <button
        onClick={() => setDismissed(true)}
        title="Dismiss"
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'inherit', opacity: 0.6, padding: 0, flexShrink: 0,
          display: 'flex', alignItems: 'center',
        }}
        aria-label="Dismiss deadline reminder"
      >
        <X size={13} />
      </button>
    </div>
  )
}
