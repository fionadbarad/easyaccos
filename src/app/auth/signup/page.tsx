'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase-browser'
import { Eye, EyeOff, Loader2 } from 'lucide-react'

const C = { bg: '#1A2342', deep: '#0F1628', card: '#4A4066', gold: '#C2A368', text: '#E4D3B4', muted: 'rgba(228,211,180,0.55)', border: 'rgba(194,163,104,0.2)' }

const inputStyle = {
  width: '100%', background: C.bg, border: `1px solid ${C.border}`, borderRadius: '4px',
  padding: '10px 14px', color: C.text, fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' as const,
}
const labelStyle = { display: 'block', color: C.muted, fontSize: '0.75rem', letterSpacing: '0.08em', textTransform: 'uppercase' as const, marginBottom: '0.4rem' }

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabaseRef = useRef(createClient())
  const supabase = supabaseRef.current

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signUp({ email, password, options: { data: { name } } })
    if (error) { setError(error.message); setLoading(false) }
    else { router.push('/dashboard'); router.refresh() }
  }

  return (
    <div style={{ minHeight: '100vh', background: C.deep, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
        style={{ width: '100%', maxWidth: '420px' }} suppressHydrationWarning>

        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <Link href="/" style={{ fontFamily: 'var(--font-playfair)', color: C.gold, fontSize: '1.6rem', fontWeight: 700, textDecoration: 'none' }}>
            EasyAcco
          </Link>
          <h1 style={{ fontFamily: 'var(--font-playfair)', color: C.text, fontSize: '1.9rem', fontWeight: 700, marginTop: '1.5rem', marginBottom: '0.4rem' }}>
            Create Your Sanctuary
          </h1>
          <p style={{ color: C.muted, fontSize: '0.875rem' }}>Free forever. No credit card needed.</p>
        </div>

        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '8px', padding: '2rem', boxShadow: '0 12px 48px rgba(0,0,0,0.5)' }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <label style={labelStyle}>Full Name</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Your name" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@example.com" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Password</label>
              <div style={{ position: 'relative' }}>
                <input type={showPw ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} placeholder="Min. 6 characters"
                  style={{ ...inputStyle, paddingRight: '40px' }} />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: C.muted, padding: 0, display: 'flex' }}>
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div style={{ background: 'rgba(220,53,69,0.12)', border: '1px solid rgba(220,53,69,0.35)', borderRadius: '4px', padding: '10px 14px', color: '#ff8a9a', fontSize: '0.85rem' }}>
                {error}
              </div>
            )}

            <button type="submit" disabled={loading}
              style={{ width: '100%', background: loading ? 'rgba(194,163,104,0.6)' : C.gold, color: C.deep, border: 'none', borderRadius: '4px', padding: '12px', fontSize: '0.95rem', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              {loading && <Loader2 size={18} className="animate-spin" />}
              {loading ? 'Creating account…' : 'Create Free Account'}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.875rem', color: C.muted }}>
            Already have an account?{' '}
            <Link href="/auth/login" style={{ color: C.gold, textDecoration: 'none', fontWeight: 600 }}>Sign in</Link>
          </p>
        </div>
      </motion.div>
    </div>
  )
}
