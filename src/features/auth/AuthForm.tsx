'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { isSupabaseConfigured } from '@/lib/supabase-browser'
import { getSupabaseBrowserClient } from '@/lib/supabase-client-singleton'
import { Mail, Loader2, CheckCircle, ArrowRight } from 'lucide-react'

type Mode = 'login' | 'signup'

interface AuthFormProps {
  mode: Mode
}

const COPY = {
  login: {
    subtitle: 'Save your data across sessions',
    guestCopy:
      'Every feature works instantly as a guest. Tax estimator, AI advisor, expenses, P&L — all free, no sign-up required.',
    dividerLabel: 'or save your data',
    formTitle: 'Sign in with email link',
    formCopy:
      'Enter your email and we send a one-click sign-in link. No password. No form to fill in. Your data syncs across devices.',
    buttonIdle: 'Send sign-in link',
    buttonLoading: 'Sending link...',
    sentCopy: 'Click it to open the dashboard with your account — no password ever needed.',
    footer:
      'Sign-in is only needed to save data between sessions. Every feature works without an account.',
    footerLink: null,
  },
  signup: {
    subtitle: 'Create an account to save your data',
    guestCopy: 'Every feature works instantly as a guest — no sign-up required.',
    dividerLabel: 'or create account',
    formTitle: 'Sign up with email link',
    formCopy:
      "Enter your email and we'll send a one-click link. No password. Your account is created on first click.",
    buttonIdle: 'Send sign-up link',
    buttonLoading: 'Sending link…',
    sentCopy: 'Click it to create your account and open the dashboard — no password ever needed.',
    footer: null,
    footerLink: { prefix: 'Already have an account? ', label: 'Sign in', href: '/auth/login' },
  },
} as const

const INPUT_CLASS =
  'w-full bg-[#222326] border border-[rgba(244,245,248,0.07)] rounded-lg px-[14px] py-3 text-[#F4F5F8] text-[0.9rem] outline-none box-border'

export default function AuthForm({ mode }: AuthFormProps) {
  const copy = COPY[mode]

  // Guard: memoize Supabase client creation; returns null when unconfigured.
  const supabase = useMemo(() => getSupabaseBrowserClient(), [])

  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault()
    if (!supabase) return
    setError('')
    setLoading(true)
    const { error: err } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/dashboard` },
    })
    setLoading(false)
    if (err) {
      setError(err.message)
      return
    }
    setSent(true)
  }

  const submitDisabled = loading || !email.trim()

  // When Supabase is not configured, show a fallback UI instead of crashing.
  if (!supabase || !isSupabaseConfigured) {
    return (
      <div className="min-h-screen bg-[#181818] flex items-center justify-center p-6">
        <div className="w-full max-w-[420px] animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="text-center mb-8">
            <Link href="/" className="text-[#F4F5F8] text-[1.7rem] font-bold no-underline">
              EasyAcco
            </Link>
            <p className="text-[rgba(244,245,248,0.42)] text-[0.82rem] mt-[6px]">{copy.subtitle}</p>
          </div>

          <div className="bg-[rgba(244,245,248,0.03)] border border-[rgba(244,245,248,0.12)] rounded-xl p-6 mb-5 text-center">
            <div className="text-[2rem] mb-2">No account needed</div>
            <p className="text-[rgba(244,245,248,0.42)] text-[0.82rem] leading-[1.55] mb-[1.1rem]">
              {copy.guestCopy}
            </p>
            <p className="text-[rgba(251,191,36,0.8)] text-[0.78rem] border border-[rgba(251,191,36,0.3)] rounded-md px-3 py-[9px] mb-4">
              Cloud sync is not available. Running in local-only mode. Your data is saved in this
              browser and will persist between visits.
            </p>
            <Link
              href="/dashboard"
              className="inline-block mt-6 px-5 py-[13px] bg-[rgba(244,245,248,0.08)] text-[#F4F5F8] font-bold text-[0.95rem] no-underline rounded-lg border border-[rgba(244,245,248,0.07)]"
            >
              Open Dashboard →
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#181818] flex items-center justify-center p-6">
      <div className="w-full max-w-[420px] animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="text-center mb-8">
          <Link href="/" className="text-[#F4F5F8] text-[1.7rem] font-bold no-underline">
            EasyAcco
          </Link>
          <p className="text-[rgba(244,245,248,0.42)] text-[0.82rem] mt-[6px]">{copy.subtitle}</p>
        </div>

        <div className="bg-[rgba(244,245,248,0.03)] border border-[rgba(244,245,248,0.12)] rounded-xl p-6 mb-5 text-center">
          <div className="text-[2rem] mb-2">No account needed</div>
          <p className="text-[rgba(244,245,248,0.42)] text-[0.82rem] leading-[1.55] mb-[1.1rem]">
            {copy.guestCopy}
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 w-full px-5 py-[13px] bg-[#F4F5F8] text-[#181818] font-bold text-[0.95rem] no-underline rounded-lg"
          >
            Open Dashboard as Guest <ArrowRight size={17} />
          </Link>
        </div>

        <div className="flex items-center gap-3 mb-5">
          <div className="flex-1 h-px bg-[rgba(244,245,248,0.07)]" />
          <span className="text-[rgba(244,245,248,0.42)] text-[0.72rem] uppercase tracking-[0.1em]">
            {copy.dividerLabel}
          </span>
          <div className="flex-1 h-px bg-[rgba(244,245,248,0.07)]" />
        </div>

        <div className="bg-[#1C1D20] border border-[rgba(244,245,248,0.07)] rounded-xl p-6">
          {sent ? (
            <div className="text-center">
              <CheckCircle size={40} className="text-[#4ADE80] mx-auto mb-4" />
              <h3 className="text-[#F4F5F8] font-bold text-[1rem] mb-2">Check your inbox</h3>
              <p className="text-[rgba(244,245,248,0.42)] text-[0.82rem] leading-[1.6]">
                We sent a sign-in link to <strong className="text-[#F4F5F8]">{email}</strong>.{' '}
                {copy.sentCopy}
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-4">
                <Mail size={16} className="text-[#F4F5F8]" />
                <span className="text-[#F4F5F8] font-semibold text-[0.88rem]">
                  {copy.formTitle}
                </span>
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
                  className={`flex items-center justify-center gap-2 border border-[rgba(244,245,248,0.07)] rounded-lg p-[11px] text-[0.88rem] font-semibold ${submitDisabled ? 'bg-[rgba(244,245,248,0.04)] text-[rgba(244,245,248,0.42)] cursor-default' : 'bg-[rgba(244,245,248,0.08)] text-[#F4F5F8] cursor-pointer'}`}
                >
                  {loading ? (
                    <>
                      <Loader2 size={15} className="animate-spin" /> {copy.buttonLoading}
                    </>
                  ) : (
                    <>
                      <Mail size={15} /> {copy.buttonIdle}
                    </>
                  )}
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
            <Link
              href={copy.footerLink.href}
              className="text-[rgba(244,245,248,0.42)] no-underline"
            >
              {copy.footerLink.label}
            </Link>
          </p>
        )}
      </div>
    </div>
  )
}
