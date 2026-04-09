'use client'

export const dynamic = 'force-dynamic'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase-browser'
import { ArrowRight, Mail, Loader2, CheckCircle } from 'lucide-react'

const C = {
  bg:     '#0B0E1A',
  deep:   '#050A14',
  card:   '#111827',
  gold:   '#FFD700',
  text:   '#E5E7EB',
  muted:  'rgba(229,231,235,0.55)',
  border: 'rgba(255,215,0,0.15)',
  red:    '#FF6B6B',
}

export default function LoginPage() {
  const router      = useRouter()
  const supabaseRef = useRef(createClient())
  const supabase    = supabaseRef.current

  const [email,   setEmail]   = useState('')
  const [loading, setLoading] = useState(false)
  const [sent,    setSent]    = useState(false)
  const [error,   setError]   = useState('')

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
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <Link href="/" style={{ fontFamily: 'var(--font-playfair)', color: C.gold, fontSize: '1.7rem', fontWeight: 700, textDecoration: 'none' }}>
            EasyAcco
          </Link>
          <p style={{ color: C.muted, fontSize: '0.82rem', marginTop: '6px' }}>
            Save your data across sessions
          </p>
        </div>

        {/* ── OPTION 1: Guest (primary) ── */}
        <div style={{
          background: 'rgba(255,215,0,0.07)', border: `1px solid rgba(255,215,0,0.25)`,
          borderRadius: '12px', padding: '1.5rem', marginBottom: '1.25rem', textAlign: 'center',
        }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>
            No account needed
          </div>
          <p style={{ color: C.muted, fontSize: '0.82rem', lineHeight: 1.55, marginBottom: '1.1rem' }}>
            Every feature works instantly as a guest. Tax estimator, AI advisor, expenses, P&amp;L — all free, no sign-up required.
          </p>
          <Link href="/dashboard"
            style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              width: '100%', padding: '13px 20px',
              background: C.gold, color: '#0B0E1A',
              fontWeight: 700, fontSize: '0.95rem', textDecoration: 'none',
              borderRadius: '8px', boxShadow: '0 4px 20px rgba(255,215,0,0.25)',
            }}>
            Open Dashboard as Guest <ArrowRight size={17} />
          </Link>
        </div>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.25rem' }}>
          <div style={{ flex: 1, height: '1px', background: C.border }} />
          <span style={{ color: C.muted, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            or save your data
          </span>
          <div style={{ flex: 1, height: '1px', background: C.border }} />
        </div>

        {/* ── OPTION 2: Magic link (secondary) ── */}
        <div style={{
          background: C.card, border: `1px solid ${C.border}`,
          borderRadius: '12px', padding: '1.5rem',
        }}>
          {sent ? (
            <div style={{ textAlign: 'center' }}>
              <CheckCircle size={40} style={{ color: C.gold, margin: '0 auto 1rem' }} />
              <h3 style={{ color: C.text, fontWeight: 700, fontSize: '1rem', marginBottom: '8px' }}>
                Check your inbox
              </h3>
              <p style={{ color: C.muted, fontSize: '0.82rem', lineHeight: 1.6 }}>
                We sent a sign-in link to <strong style={{ color: C.text }}>{email}</strong>. Click it to open the dashboard with your account — no password ever needed.
              </p>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
                <Mail size={16} style={{ color: C.gold }} />
                <span style={{ color: C.text, fontWeight: 600, fontSize: '0.88rem' }}>
                  Sign in with email link
                </span>
              </div>
              <p style={{ color: C.muted, fontSize: '0.78rem', lineHeight: 1.5, marginBottom: '1rem' }}>
                Enter your email and we send a one-click sign-in link. No password. No form to fill in. Your data syncs across devices.
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
                    background: loading || !email.trim() ? 'rgba(255,215,0,0.3)' : 'rgba(255,215,0,0.15)',
                    border: `1px solid ${C.border}`,
                    color: loading || !email.trim() ? C.muted : C.gold,
                    borderRadius: '8px', padding: '11px', fontSize: '0.88rem', fontWeight: 600,
                    cursor: loading || !email.trim() ? 'default' : 'pointer',
                  }}>
                  {loading
                    ? <><Loader2 size={15} className="animate-spin" /> Sending link...</>
                    : <><Mail size={15} /> Send sign-in link</>
                  }
                </button>
              </form>
            </>
          )}
        </div>

        <p style={{ textAlign: 'center', color: 'rgba(229,231,235,0.3)', fontSize: '0.72rem', marginTop: '1.5rem', lineHeight: 1.5 }}>
          Sign-in is only needed to save data between sessions. Every feature works without an account.
        </p>
      </motion.div>
    </div>
  )
}
