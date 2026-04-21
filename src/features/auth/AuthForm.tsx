'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase-browser'
import { Mail, Loader2, CheckCircle, ArrowRight } from 'lucide-react'
import { C } from '@/styles/palette'

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

  const inputStyle: React.CSSProperties = {
    width: '100%', background: C.deep, border: `1px solid ${C.border}`,
    borderRadius: '8px', padding: '12px 14px', color: C.text,
    fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box',
  }

  return (
    <div style={{
      minHeight: '100vh', background: C.bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem',
    }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{ width: '100%', maxWidth: '420px' }}
        suppressHydrationWarning
      >
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <Link href="/" style={{ color: C.white, fontSize: '1.7rem', fontWeight: 700, textDecoration: 'none' }}>
            EasyAcco
          </Link>
          <p style={{ color: C.muted, fontSize: '0.82rem', marginTop: '6px' }}>{copy.subtitle}</p>
        </div>

        <div style={{
          background: 'rgba(244,245,248,0.03)', border: `1px solid rgba(244,245,248,0.12)`,
          borderRadius: '12px', padding: '1.5rem', marginBottom: '1.25rem', textAlign: 'center',
        }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>No account needed</div>
          <p style={{ color: C.muted, fontSize: '0.82rem', lineHeight: 1.55, marginBottom: '1.1rem' }}>
            {copy.guestCopy}
          </p>
          <Link href="/dashboard"
            style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              width: '100%', padding: '13px 20px',
              background: C.white, color: '#181818',
              fontWeight: 700, fontSize: '0.95rem', textDecoration: 'none',
              borderRadius: '8px',
            }}>
            Open Dashboard as Guest <ArrowRight size={17} />
          </Link>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.25rem' }}>
          <div style={{ flex: 1, height: '1px', background: C.border }} />
          <span style={{ color: C.muted, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            {copy.dividerLabel}
          </span>
          <div style={{ flex: 1, height: '1px', background: C.border }} />
        </div>

        <div style={{
          background: C.card, border: `1px solid ${C.border}`,
          borderRadius: '12px', padding: '1.5rem',
        }}>
          {sent ? (
            <div style={{ textAlign: 'center' }}>
              <CheckCircle size={40} style={{ color: '#4ADE80', margin: '0 auto 1rem' }} />
              <h3 style={{ color: C.text, fontWeight: 700, fontSize: '1rem', marginBottom: '8px' }}>
                Check your inbox
              </h3>
              <p style={{ color: C.muted, fontSize: '0.82rem', lineHeight: 1.6 }}>
                We sent a sign-in link to <strong style={{ color: C.text }}>{email}</strong>. {copy.sentCopy}
              </p>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
                <Mail size={16} style={{ color: C.white }} />
                <span style={{ color: C.text, fontWeight: 600, fontSize: '0.88rem' }}>{copy.formTitle}</span>
              </div>
              <p style={{ color: C.muted, fontSize: '0.78rem', lineHeight: 1.5, marginBottom: '1rem' }}>
                {copy.formCopy}
              </p>

              <form onSubmit={sendMagicLink} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <input
                  type="email" required value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  style={inputStyle}
                />

                {error && (
                  <div style={{
                    background: 'rgba(255,107,107,0.1)', border: '1px solid rgba(255,107,107,0.3)',
                    borderRadius: '6px', padding: '9px 12px', color: C.red, fontSize: '0.8rem',
                  }}>
                    {error}
                  </div>
                )}

                <button type="submit" disabled={loading || !email.trim()}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    background: loading || !email.trim() ? 'rgba(244,245,248,0.04)' : 'rgba(244,245,248,0.08)',
                    border: `1px solid ${C.border}`,
                    color: loading || !email.trim() ? C.muted : C.white,
                    borderRadius: '8px', padding: '11px', fontSize: '0.88rem', fontWeight: 600,
                    cursor: loading || !email.trim() ? 'default' : 'pointer',
                  }}>
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
          <p style={{ textAlign: 'center', color: 'rgba(244,245,248,0.25)', fontSize: '0.72rem', marginTop: '1.5rem', lineHeight: 1.5 }}>
            {copy.footer}
          </p>
        )}
        {copy.footerLink && (
          <p style={{ textAlign: 'center', color: 'rgba(244,245,248,0.25)', fontSize: '0.72rem', marginTop: '1.5rem', lineHeight: 1.5 }}>
            {copy.footerLink.prefix}
            <Link href={copy.footerLink.href} style={{ color: C.muted, textDecoration: 'none' }}>
              {copy.footerLink.label}
            </Link>
          </p>
        )}
      </motion.div>
    </div>
  )
}
