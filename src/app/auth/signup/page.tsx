'use client'

export const dynamic = 'force-dynamic'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase-browser'
import { Mail, Loader2, CheckCircle, ArrowRight } from 'lucide-react'

// Same palette as login page — consistent auth experience
const C = {
  bg:     '#181818',
  deep:   '#222326',
  card:   '#1C1D20',
  white:  '#F4F5F8',
  text:   '#F4F5F8',
  muted:  'rgba(244,245,248,0.42)',
  border: 'rgba(244,245,248,0.07)',
  red:    '#F87171',
}

export default function SignupPage() {
  const supabaseRef = useRef(createClient())
  const supabase    = supabaseRef.current

  const [email,   setEmail]   = useState('')
  const [loading, setLoading] = useState(false)
  const [sent,    setSent]    = useState(false)
  const [error,   setError]   = useState('')

  const inputStyle: React.CSSProperties = {
    width: '100%', background: C.deep, border: `1px solid ${C.border}`,
    borderRadius: '8px', padding: '12px 14px', color: C.text,
    fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box',
  }

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
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <Link href="/" style={{ color: C.white, fontSize: '1.7rem', fontWeight: 700, textDecoration: 'none' }}>
            EasyAcco
          </Link>
          <p style={{ color: C.muted, fontSize: '0.82rem', marginTop: '6px' }}>
            Create an account to save your data
          </p>
        </div>

        {/* Guest shortcut */}
        <div style={{
          background: 'rgba(244,245,248,0.03)', border: `1px solid rgba(244,245,248,0.12)`,
          borderRadius: '12px', padding: '1.5rem', marginBottom: '1.25rem', textAlign: 'center',
        }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>
            No account needed
          </div>
          <p style={{ color: C.muted, fontSize: '0.82rem', lineHeight: 1.55, marginBottom: '1.1rem' }}>
            Every feature works instantly as a guest — no sign-up required.
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

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.25rem' }}>
          <div style={{ flex: 1, height: '1px', background: C.border }} />
          <span style={{ color: C.muted, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            or create account
          </span>
          <div style={{ flex: 1, height: '1px', background: C.border }} />
        </div>

        {/* Magic link */}
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
                We sent a sign-in link to <strong style={{ color: C.text }}>{email}</strong>. Click it to create your account and open the dashboard — no password ever needed.
              </p>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
                <Mail size={16} style={{ color: C.white }} />
                <span style={{ color: C.text, fontWeight: 600, fontSize: '0.88rem' }}>
                  Sign up with email link
                </span>
              </div>
              <p style={{ color: C.muted, fontSize: '0.78rem', lineHeight: 1.5, marginBottom: '1rem' }}>
                Enter your email and we&apos;ll send a one-click link. No password. Your account is created on first click.
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
                    ? <><Loader2 size={15} className="animate-spin" /> Sending link…</>
                    : <><Mail size={15} /> Send sign-up link</>
                  }
                </button>
              </form>
            </>
          )}
        </div>

        <p style={{ textAlign: 'center', color: 'rgba(244,245,248,0.25)', fontSize: '0.72rem', marginTop: '1.5rem', lineHeight: 1.5 }}>
          Already have an account?{' '}
          <Link href="/auth/login" style={{ color: C.muted, textDecoration: 'none' }}>Sign in</Link>
        </p>
      </motion.div>
    </div>
  )
}
