'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase-browser'
import { Mail, Loader2, CheckCircle, ArrowRight } from 'lucide-react'

type Mode = 'login' | 'signup'

interface AuthFormProps {
  mode: Mode
}

const COPY = {
  login: {
    subtitle: 'Save your data across sessions',
    guestCopy: 'Every feature works instantly as a guest. Tax estimator, AI advisor, expenses, P&L — all free, no sign-up required.',
    dividerLabel: 'or save your data',
    formTitle: 'Sign in with email link',
    formCopy: "Enter your email and we send a one-click sign-in link. No password. No form to fill in. Your data syncs across devices.",
    buttonIdle: 'Send sign-in link',
    buttonLoading: 'Sending link...',
    sentCopy: 'Click it to open the dashboard with your account — no password ever needed.',
    footer: 'Sign-in is only needed to save data between sessions. Every feature works without an account.',
    footerLink: null,
  },
  signup: {
    subtitle: 'Create an account to save your data',
    guestCopy: 'Every feature works instantly as a guest — no sign-up required.',
    dividerLabel: 'or create account',
    formTitle: 'Sign up with email link',
    formCopy: "Enter your email and we'll send a one-click link. No password. Your account is created on first click.",
    buttonIdle: 'Send sign-up link',
    buttonLoading: 'Sending link…',
    sentCopy: 'Click it to create your account and open the dashboard — no password ever needed.',
    footer: null,
    footerLink: { prefix: 'Already have an account? ', label: 'Sign in', href: '/auth/login' },
  },
} as const

const INPUT_CLASS = 'w-full bg-[var(--sa-gray)] border border-[var(--sa-border)] rounded-lg px-[14px] py-3 text-[var(--sa-white)] text-[0.9rem] outline-none box-border'

export default function AuthForm({ mode }: AuthFormProps) {
  const supabaseRef = useRef(createClient())
  const supabase = supabaseRef.current
  const copy = COPY[mode]

  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error: err } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/dashboard` },
    })
    setLoading(false)
    if (err) { setError(err.message); return }
    setSent(true)
  }

  const submitDisabled = loading || !email.trim()

  return (
    <div className="min-h-screen bg-[var(--sa-black)] flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-[420px]"
        suppressHydrationWarning
      >
        <div className="text-center mb-8">
          <Link href="/" className="text-[var(--sa-white)] text-[1.7rem] font-bold no-underline">
            EasyAcco
          </Link>
          <p className="text-[rgba(244,245,248,0.42)] text-[0.82rem] mt-1.5">{copy.subtitle}</p>
        </div>

        <div className="bg-[rgba(244,245,248,0.03)] border border-[rgba(244,245,248,0.12)] rounded-xl p-6 mb-5 text-center">
          <div className="text-[2rem] mb-2">No account needed</div>
          <p className="text-[rgba(244,245,248,0.42)] text-[0.82rem] leading-[1.55] mb-[1.1rem]">
            {copy.guestCopy}
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 w-full px-5 py-[13px] bg-[var(--sa-white)] text-[var(--sa-black)] font-bold text-[0.95rem] no-underline rounded-lg"
          >
            Open Dashboard as Guest <ArrowRight size={17} />
          </Link>
        </div>

        <div className="flex items-center gap-3 mb-5">
          <div className="flex-1 h-px bg-[var(--sa-border)]" />
          <span className="text-[rgba(244,245,248,0.42)] text-[0.72rem] uppercase tracking-[0.1em]">
            {copy.dividerLabel}
          </span>
          <div className="flex-1 h-px bg-[var(--sa-border)]" />
        </div>

        <div className="bg-[var(--sa-surface)] border border-[var(--sa-border)] rounded-xl p-6">
          {sent ? (
            <div className="text-center">
              <CheckCircle size={40} className="text-[#4ADE80] mx-auto mb-4" />
              <h3 className="text-[var(--sa-white)] font-bold text-base mb-2">
                Check your inbox
              </h3>
              <p className="text-[rgba(244,245,248,0.42)] text-[0.82rem] leading-[1.6]">
                We sent a sign-in link to <strong className="text-[var(--sa-white)]">{email}</strong>. {copy.sentCopy}
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-4">
                <Mail size={16} className="text-[var(--sa-white)]" />
                <span className="text-[var(--sa-white)] font-semibold text-[0.88rem]">{copy.formTitle}</span>
              </div>
              <p className="text-[rgba(244,245,248,0.42)] text-[0.78rem] leading-[1.5] mb-4">
                {copy.formCopy}
              </p>

              <form onSubmit={sendMagicLink} className="flex flex-col gap-[0.85rem]">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className={INPUT_CLASS}
                />

                {error && (
                  <div className="bg-[rgba(255,107,107,0.1)] border border-[rgba(255,107,107,0.3)] rounded-md px-3 py-[9px] text-[#F87171] text-[0.8rem]">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitDisabled}
                  className={`flex items-center justify-center gap-2 border border-[var(--sa-border)] rounded-lg p-[11px] text-[0.88rem] font-semibold ${submitDisabled ? 'bg-[rgba(244,245,248,0.04)] text-[rgba(244,245,248,0.42)] cursor-default' : 'bg-[rgba(244,245,248,0.08)] text-[var(--sa-white)] cursor-pointer'}`}
                >
                  {loading
                    ? <><Loader2 size={15} className="animate-spin" /> {copy.buttonLoading}</>
                    : <><Mail size={15} /> {copy.buttonIdle}</>
                  }
                </button>
              </form>
            </>
          )}
        </div>

        {copy.footer && (
          <p className="text-center text-[rgba(244,245,248,0.25)] text-[0.72rem] mt-6 leading-[1.5]">
            {copy.footer}
          </p>
        )}
        {copy.footerLink && (
          <p className="text-center text-[rgba(244,245,248,0.25)] text-[0.72rem] mt-6 leading-[1.5]">
            {copy.footerLink.prefix}
            <Link href={copy.footerLink.href} className="text-[rgba(244,245,248,0.42)] no-underline">
              {copy.footerLink.label}
            </Link>
          </p>
        )}
      </motion.div>
    </div>
  )
}
