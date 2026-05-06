'use client'

// Shown on first authenticated dashboard load. Explains local-first encryption
// and nudges the user to create a backup. The device key is non-extractable and
// lives in IndexedDB — clearing site data or switching browsers = data gone
// unless a backup was taken.

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Lock, X } from 'lucide-react'

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
    try { localStorage.setItem(SEEN_KEY, '1') }
    catch (err) { console.error('EncryptionOnboardingDialog: failed to persist seen flag:', err) }
    setOpen(false)
  }

  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="ea-crypto-onboard-title"
      className="fixed inset-0 z-[60] bg-[rgba(0,0,0,0.7)] flex items-center justify-center p-4"
    >
      <div className="bg-[#1C1D20] border border-[rgba(244,245,248,0.07)] rounded-[12px] p-7 max-w-[480px] w-full shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
        <div className="flex justify-between items-start gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[10px] bg-[rgba(244,245,248,0.06)] border border-[rgba(244,245,248,0.1)] flex items-center justify-center">
              <Lock size={20} className="text-[#F4F5F8]" />
            </div>
            <h2 id="ea-crypto-onboard-title" className="text-[#F4F5F8] text-[1.1rem] font-bold m-0">
              Your data stays on this device
            </h2>
          </div>
          <button
            onClick={dismiss}
            aria-label="Close"
            className="bg-transparent border-0 text-[rgba(244,245,248,0.42)] cursor-pointer p-1 rounded-[6px]"
          >
            <X size={18} />
          </button>
        </div>

        <p className="text-[#F4F5F8] text-[0.9rem] leading-[1.65] m-0 mb-3">
          EasyAcco encrypts your expenses, invoices, and mileage on this device with a key
          that never leaves your browser. We can&apos;t read it — and neither can anyone else.
        </p>
        <p className="text-[rgba(244,245,248,0.42)] text-[0.85rem] leading-[1.65] m-0 mb-5">
          <strong className="text-[#F4F5F8]">The trade-off:</strong> if you clear site data or
          switch devices without a backup, your records are gone. Take a passphrase-protected
          backup now so you&apos;re covered.
        </p>

        <div className="flex gap-[0.6rem] justify-end flex-wrap">
          <button
            onClick={dismiss}
            className="bg-transparent border border-[rgba(244,245,248,0.07)] text-[rgba(244,245,248,0.42)] px-[14px] py-2 rounded-[8px] cursor-pointer text-[0.85rem]"
          >
            Got it
          </button>
          <Link
            href="/dashboard/settings#backup"
            onClick={dismiss}
            className="bg-[#F4F5F8] text-[#181818] px-[14px] py-2 rounded-[8px] text-[0.85rem] font-semibold no-underline"
          >
            Create backup
          </Link>
        </div>
      </div>
    </div>
  )
}
