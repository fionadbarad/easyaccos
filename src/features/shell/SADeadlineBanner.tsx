'use client'

import { useMemo, useState } from 'react'
import { Bell } from 'lucide-react'
import NoticeBanner from './NoticeBanner'

const DISMISS_KEY = 'easyacco.sa-deadline.dismissed'

function taxYearLabel(date: Date) {
  const y = date.getFullYear()
  const startYear = date.getMonth() >= 3 ? y - 1 : y - 2
  return `${startYear}/${String(startYear + 1).slice(-2)}`
}

const DEADLINES: Array<{
  month: number
  day: number
  label: string
  detail: (ty: string) => string
}> = [
  { month: 10, day: 5,  label: 'Register for Self Assessment',
    detail: (ty) => `Deadline to register if you became self-employed during ${ty}.` },
  { month: 10, day: 31, label: 'Paper Self Assessment return deadline',
    detail: (ty) => `Deadline to submit your paper tax return for ${ty}.` },
  { month: 1,  day: 31, label: 'Online return + tax payment due',
    detail: (ty) => `Deadline to file online and pay any tax owed for ${ty}.` },
  { month: 7,  day: 31, label: 'Second payment on account due',
    detail: (ty) => `Second instalment of advance tax payments for ${ty}.` },
]

function getNextDeadline(now: Date) {
  const year = now.getFullYear()
  const candidates = DEADLINES.flatMap(({ month, day, label, detail }) => {
    return [year, year + 1].map((y) => {
      const date = new Date(y, month - 1, day)
      return { date, label, detail: detail(taxYearLabel(date)) }
    })
  })
  return candidates
    .filter((c) => c.date > now)
    .sort((a, b) => a.date.getTime() - b.date.getTime())[0] ?? null
}

function daysUntil(date: Date) {
  return Math.ceil((date.getTime() - Date.now()) / 86_400_000)
}

function readDismissed(): string | null {
  if (typeof window === 'undefined') return null
  try { return window.localStorage.getItem(DISMISS_KEY) } catch { return null }
}

export default function SADeadlineBanner() {
  const next = useMemo(() => getNextDeadline(new Date()), [])
  const dismissId = next ? next.date.toISOString().slice(0, 10) : ''

  // Lazy init from localStorage so we don't flash the banner before hiding it.
  const [dismissed, setDismissed] = useState<boolean>(() => readDismissed() === dismissId)

  const [prevDismissId, setPrevDismissId] = useState(dismissId)
  if (dismissId !== prevDismissId) {
    setPrevDismissId(dismissId)
    setDismissed(readDismissed() === dismissId)
  }

  const handleDismiss = () => {
    setDismissed(true)
    try { window.localStorage.setItem(DISMISS_KEY, dismissId) } catch {}
  }

  if (!next || dismissed) return null

  const days = daysUntil(next.date)
  if (days > 60) return null

  const urgent = days <= 14
  const dateStr = next.date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <NoticeBanner variant={urgent ? 'urgent' : 'info'} icon={Bell} onDismiss={handleDismiss}>
      <strong style={{ fontWeight: 600 }}>HMRC deadline in {days} day{days !== 1 ? 's' : ''}</strong>
      {' — '}{next.label} · {dateStr}
      <span style={{ opacity: 0.65 }}> · {next.detail}</span>
    </NoticeBanner>
  )
}
