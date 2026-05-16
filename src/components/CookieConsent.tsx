'use client'

import { useState, useSyncExternalStore } from 'react'
import Link from 'next/link'

const STORAGE_KEY = 'easyacco_cookie_consent'
const NOOP_SUB = () => () => {}

function hasNoConsent() {
  try { return !localStorage.getItem(STORAGE_KEY) } catch { return false }
}

export default function CookieConsent() {
  const needsConsent = useSyncExternalStore(NOOP_SUB, hasNoConsent, () => false)
  const [dismissed, setDismissed] = useState(false)

  if (!needsConsent || dismissed) return null

  function accept() {
    try { localStorage.setItem(STORAGE_KEY, 'accepted') } catch { /* ignore */ }
    setDismissed(true)
  }

  function decline() {
    try { localStorage.setItem(STORAGE_KEY, 'declined') } catch { /* ignore */ }
    setDismissed(true)
  }

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      style={{
        position: 'fixed', bottom: '1.25rem', left: '50%', transform: 'translateX(-50%)',
        zIndex: 9999, width: 'min(92vw, 560px)',
        background: '#1C1D20', border: '1px solid rgba(244,245,248,0.1)',
        borderRadius: '10px', padding: '1.1rem 1.4rem',
        boxShadow: '0 12px 40px rgba(0,0,0,0.55)',
        display: 'flex', flexDirection: 'column', gap: '0.75rem',
      }}
    >
      <p style={{ color: '#F4F5F8', fontSize: '0.82rem', lineHeight: 1.6, margin: 0 }}>
        EasyAcco uses essential cookies to keep your session active. We do not use advertising or
        tracking cookies. Your data is never sold.{' '}
        <Link href="/privacy" style={{ color: '#F4F5F8', textDecoration: 'underline', fontSize: '0.82rem' }}>
          Privacy Policy
        </Link>
      </p>
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <button
          onClick={accept}
          style={{
            padding: '8px 22px', background: '#F4F5F8', color: '#181818',
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
            color: 'rgba(244,245,248,0.42)', border: '1px solid rgba(244,245,248,0.1)',
            borderRadius: '5px', fontSize: '0.82rem', cursor: 'pointer', minHeight: '36px',
          }}
        >
          Decline
        </button>
      </div>
    </div>
  )
}
