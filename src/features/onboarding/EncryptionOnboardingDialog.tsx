'use client'

// Shown on first authenticated dashboard load. Explains local-first encryption
// and nudges the user to create a backup. The device key is non-extractable and
// lives in IndexedDB — clearing site data or switching browsers = data gone
// unless a backup was taken.

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Lock, X } from 'lucide-react'
import { C } from '@/styles/palette'

const SEEN_KEY = 'ea_crypto_onboard_seen_v1'

export default function EncryptionOnboardingDialog() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    try {
      if (typeof localStorage === 'undefined') return
      if (!localStorage.getItem(SEEN_KEY)) setOpen(true)
    } catch { /* noop */ }
  }, [])

  function dismiss() {
    try { localStorage.setItem(SEEN_KEY, '1') } catch { /* noop */ }
    setOpen(false)
  }

  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="ea-crypto-onboard-title"
      style={{
        position: 'fixed', inset: 0, zIndex: 60,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1rem',
      }}
    >
      <div style={{
        background: C.card, border: `1px solid ${C.border}`, borderRadius: '12px',
        padding: '1.75rem', maxWidth: '480px', width: '100%',
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '40px', height: '40px', borderRadius: '10px',
              background: 'rgba(244,245,248,0.06)', border: `1px solid rgba(244,245,248,0.1)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Lock size={20} style={{ color: C.white }} />
            </div>
            <h2 id="ea-crypto-onboard-title" style={{ color: C.white, fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>
              Your data stays on this device
            </h2>
          </div>
          <button
            onClick={dismiss}
            aria-label="Close"
            style={{
              background: 'transparent', border: 'none', color: C.muted,
              cursor: 'pointer', padding: '4px', borderRadius: '6px',
            }}
          >
            <X size={18} />
          </button>
        </div>

        <p style={{ color: C.text, fontSize: '0.9rem', lineHeight: 1.65, margin: '0 0 0.75rem' }}>
          EasyAcco encrypts your expenses, invoices, and mileage on this device with a key
          that never leaves your browser. We can&apos;t read it — and neither can anyone else.
        </p>
        <p style={{ color: C.muted, fontSize: '0.85rem', lineHeight: 1.65, margin: '0 0 1.25rem' }}>
          <strong style={{ color: C.text }}>The trade-off:</strong> if you clear site data or
          switch devices without a backup, your records are gone. Take a passphrase-protected
          backup now so you&apos;re covered.
        </p>

        <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          <button
            onClick={dismiss}
            style={{
              background: 'transparent', border: `1px solid ${C.border}`,
              color: C.muted, padding: '8px 14px', borderRadius: '8px',
              cursor: 'pointer', fontSize: '0.85rem',
            }}
          >
            Got it
          </button>
          <Link
            href="/dashboard/settings#backup"
            onClick={dismiss}
            style={{
              background: C.white, color: C.bg, padding: '8px 14px',
              borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            Create backup
          </Link>
        </div>
      </div>
    </div>
  )
}
