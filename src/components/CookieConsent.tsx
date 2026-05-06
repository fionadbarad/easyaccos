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
      // localStorage unavailable - don't show banner
    }
  }, [])

  function accept() {
    try { localStorage.setItem(STORAGE_KEY, 'accepted') }
    catch (err) { console.error('CookieConsent: failed to persist accept:', err) }
    setVisible(false)
  }

  function decline() {
    try { localStorage.setItem(STORAGE_KEY, 'declined') }
    catch (err) { console.error('CookieConsent: failed to persist decline:', err) }
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      className="fixed bottom-[1.25rem] left-1/2 -translate-x-1/2 z-[9999] w-[min(92vw,560px)] bg-[var(--sa-surface)] border border-[rgba(244,245,248,0.1)] rounded-[10px] p-[1.1rem_1.4rem] shadow-[0_12px_40px_rgba(0,0,0,0.55)] flex flex-col gap-3"
    >
      <p className="text-[var(--sa-white)] text-[0.82rem] leading-[1.6] m-0">
        EasyAcco uses essential cookies to keep your session active. We do not use advertising or
        tracking cookies. Your data is never sold.{' '}
        <Link href="/privacy" className="text-[var(--sa-white)] underline text-[0.82rem]">
          Privacy Policy
        </Link>
      </p>
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={accept}
          className="px-[22px] py-2 bg-[var(--sa-white)] text-[var(--sa-black)] border-0 rounded-[5px] font-bold text-[0.82rem] cursor-pointer min-h-[36px]"
        >
          Accept
        </button>
        <button
          onClick={decline}
          className="px-[18px] py-2 bg-transparent text-[rgba(244,245,248,0.42)] border border-[rgba(244,245,248,0.1)] rounded-[5px] text-[0.82rem] cursor-pointer min-h-[36px]"
        >
          Decline
        </button>
      </div>
    </div>
  )
}
