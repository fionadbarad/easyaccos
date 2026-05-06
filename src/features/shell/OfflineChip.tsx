'use client'

// Floating chip surfaced when the browser reports no network. Local writes keep
// working (IndexedDB is offline-first), so the message reassures rather than
// alarms. Hidden when online.

import { useEffect, useState } from 'react'
import { WifiOff } from 'lucide-react'

export default function OfflineChip() {
  const [offline, setOffline] = useState(false)

  useEffect(() => {
    if (typeof navigator === 'undefined') return
    const update = () => setOffline(!navigator.onLine)
    update()
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    return () => {
      window.removeEventListener('online', update)
      window.removeEventListener('offline', update)
    }
  }, [])

  if (!offline) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 right-4 z-[55] bg-[var(--sa-surface)] border border-[var(--sa-border)] rounded-full px-[14px] py-2 flex items-center gap-2 shadow-[0_6px_20px_rgba(0,0,0,0.4)]"
    >
      <WifiOff size={14} className="text-[var(--sa-white)]" />
      <span className="text-[var(--sa-white)] text-[0.78rem] font-medium">
        Offline - changes save locally and sync when you reconnect
      </span>
    </div>
  )
}
