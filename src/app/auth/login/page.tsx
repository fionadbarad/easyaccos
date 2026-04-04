'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase-browser'
import { Eye, EyeOff, Loader2 } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  // useRef keeps one stable client instance across renders — avoids recreating on every render
  const supabaseRef = useRef(createClient())
  const supabase = supabaseRef.current

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/dashboard')
      router.refresh()
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#1E2218', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
      {/* suppressHydrationWarning: Framer Motion intentionally diverges server (animate values)
          vs client (initial values) via useLayoutEffect — this is expected and correct behaviour */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        style={{ width: '100%', maxWidth: '420px' }}
        suppressHydrationWarning
      >
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <Link href="/" style={{ fontFamily: 'var(--font-playfair)', color: '#C0C0C0', fontSize: '1.5rem', fontWeight: 700, textDecoration: 'none' }}>
            EasyAcco
          </Link>
          <h1 style={{ fontFamily: 'var(--font-playfair)', color: '#C0C0C0', fontSize: '2rem', fontWeight: 700, marginTop: '1.5rem', marginBottom: '0.5rem' }}>
            Welcome Back
          </h1>
          <p style={{ color: '#8A9070', fontSize: '0.875rem' }}>Sign in to your sanctuary</p>
        </div>

        <div style={{ background: '#292E1E', border: '1px solid rgba(192,192,192,0.12)', borderRadius: '4px', padding: '2rem', boxShadow: '0 8px 40px rgba(0,0,0,0.4)' }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <label style={{ display: 'block', color: '#8A9070', fontSize: '0.8rem', letterSpacing: '0.05em', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                style={{ width: '100%', background: '#1E2218', border: '1px solid rgba(192,192,192,0.2)', borderRadius: '2px', padding: '10px 14px', color: '#C0C0C0', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', color: '#8A9070', fontSize: '0.8rem', letterSpacing: '0.05em', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  style={{ width: '100%', background: '#1E2218', border: '1px solid rgba(192,192,192,0.2)', borderRadius: '2px', padding: '10px 40px 10px 14px', color: '#C0C0C0', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }}
                />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#8A9070', padding: 0, display: 'flex' }}>
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            {error && (
              <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '2px', padding: '10px 14px', color: '#f87171', fontSize: '0.85rem' }}>
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              style={{ width: '100%', background: loading ? '#a08828' : '#D4AF37', color: '#1E2218', border: 'none', borderRadius: '2px', padding: '12px', fontSize: '0.95rem', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              {loading && <Loader2 size={18} className="animate-spin" />}
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
          <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.875rem', color: '#8A9070' }}>
            Don&apos;t have an account?{' '}
            <Link href="/auth/signup" style={{ color: '#D4AF37', textDecoration: 'none' }}>Create one free</Link>
          </p>
        </div>
      </motion.div>
    </div>
  )
}
