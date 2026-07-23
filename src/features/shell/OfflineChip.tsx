'use client'

// Floating chip surfaced when the browser reports no network. Local writes keep
// working (IndexedDB is offline-first), so the message reassures rather than
// alarms. Hidden when online.

import { useEffect, useState } from 'react'
import { WifiOff } from 'lucide-react'
import { C } from '@/styles/palette'

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
      style={{
        position: 'fixed',
        bottom: '1rem',
        right: '1rem',
        zIndex: 55,
        background: C.card,
        border: `1px solid ${C.border}`,
        borderRadius: '999px',
        padding: '8px 14px',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        boxShadow: '0 6px 20px rgba(0,0,0,0.4)',
      }}
    >
      <WifiOff size={14} style={{ color: C.white }} />
      <span style={{ color: C.text, fontSize: '0.78rem', fontWeight: 500 }}>
        Offline — changes save locally and sync when you reconnect
      </span>
    </div>
  )
}
