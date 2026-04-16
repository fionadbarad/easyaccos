'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

const STORAGE_KEY = 'easyacco_cookie_consent'

export default function CookieConsent() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (!stored) setVisible(true)
    } catch {
      // localStorage unavailable — don't show banner
    }
  }, [])

  function accept() {
    try { localStorage.setItem(STORAGE_KEY, 'accepted') } catch { /* ignore */ }
    setVisible(false)
  }

  function decline() {
    try { localStorage.setItem(STORAGE_KEY, 'declined') } catch { /* ignore */ }
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      style={{
        position: 'fixed', bottom: '1.25rem', left: '50%', transform: 'translateX(-50%)',
        zIndex: 9999, width: 'min(92vw, 560px)',
        background: '#111827', border: '1px solid rgba(255,215,0,0.18)',
        borderRadius: '10px', padding: '1.1rem 1.4rem',
        boxShadow: '0 12px 40px rgba(0,0,0,0.55)',
        display: 'flex', flexDirection: 'column', gap: '0.75rem',
      }}
    >
      <p style={{ color: '#E5E7EB', fontSize: '0.82rem', lineHeight: 1.6, margin: 0 }}>
        EasyAcco uses essential cookies to keep your session active. We do not use advertising or
        tracking cookies. Your data is never sold.{' '}
        <Link href="/privacy" style={{ color: '#FFD700', textDecoration: 'underline', fontSize: '0.82rem' }}>
          Privacy Policy
        </Link>
      </p>
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <button
          onClick={accept}
          style={{
            padding: '8px 22px', background: '#FFD700', color: '#0B0E1A',
            border: 'none', borderRadius: '5px', fontWeight: 700,
            fontSize: '0.82rem', cursor: 'pointer', minHeight: '36px',
          }}
        >
          Accept
        </button>
        <button
          onClick={decline}
          style={{
            padding: '8px 18px', background: 'transparent',
            color: 'rgba(229,231,235,0.6)', border: '1px solid rgba(255,215,0,0.2)',
            borderRadius: '5px', fontSize: '0.82rem', cursor: 'pointer', minHeight: '36px',
          }}
        >
          Decline
        </button>
      </div>
    </div>
  )
}
