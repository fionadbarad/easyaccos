'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight, Calculator, BarChart2, Bot, Shield, BookOpen, Receipt } from 'lucide-react'

const C = {
  bg:      '#0E0F11',
  surface: '#141518',
  card:    '#1A1B1F',
  white:   '#F4F5F8',
  muted:   'rgba(244,245,248,0.42)',
  dim:     'rgba(244,245,248,0.18)',
  border:  'rgba(244,245,248,0.07)',
  accent:  'rgba(244,245,248,0.06)',
}

const MODULES = [
  { icon: Calculator, label: 'Tax Engine',    desc: 'HMRC-accurate 2026/27 · 5 employment scenarios · NI, pension, HICBC' },
  { icon: Receipt,    label: 'Expenses',       desc: 'Categorised tracking with "wholly & exclusively" guidance' },
  { icon: BarChart2,  label: 'P&L Reports',   desc: 'Income statement · monthly charts · Export to JSON' },
  { icon: Bot,        label: 'Tax Advisory',  desc: 'Ask any UK tax question and get structured, specific answers' },
  { icon: BookOpen,   label: 'Ledger',         desc: 'Double-entry transaction log with net position at a glance' },
  { icon: Shield,     label: 'MTD Calendar',   desc: 'All 2026/27 quarterly deadlines with urgency indicators' },
]

function GridDot({ x, y }: { x: number; y: number }) {
  return (
    <div style={{
      position: 'absolute', width: '1px', height: '1px',
      background: 'rgba(244,245,248,0.15)', borderRadius: '50%',
      left: `${x}%`, top: `${y}%`,
    }} />
  )
}

export default function LandingPage() {
  const dots = Array.from({ length: 60 }, (_, i) => ({
    x: (i * 17.3) % 100,
    y: (i * 13.7) % 100,
  }))

  return (
    <div style={{ background: C.bg, minHeight: '100vh', color: C.white }}>

      {/* ── NAV ── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
        background: 'rgba(14,15,17,0.9)', backdropFilter: 'blur(16px)',
        borderBottom: `1px solid ${C.border}`,
      }}>
        <div style={{ maxWidth: '1120px', margin: '0 auto', padding: '0 1.5rem', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ color: C.white, fontSize: '0.95rem', fontWeight: 600, letterSpacing: '-0.03em' }}>
            EasyAcco
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Link href="/auth/login" style={{ color: C.muted, fontSize: '0.82rem', textDecoration: 'none', padding: '7px 14px' }}>
              Sign in
            </Link>
            <Link href="/dashboard"
              style={{
                background: C.white, color: C.bg, padding: '8px 20px',
                fontSize: '0.82rem', fontWeight: 600, textDecoration: 'none', borderRadius: '4px',
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                letterSpacing: '-0.01em',
              }}>
              Open Dashboard <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section style={{ position: 'relative', minHeight: '100vh', display: 'flex', alignItems: 'center', padding: '6rem 1.5rem 5rem', overflow: 'hidden' }}>
        {/* Dot field */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} aria-hidden>
          {dots.map((d, i) => <GridDot key={i} x={d.x} y={d.y} />)}
        </div>
        {/* Radial glow */}
        <div style={{ position: 'absolute', top: '20%', left: '50%', transform: 'translate(-50%,-50%)', width: '600px', height: '400px', background: 'radial-gradient(ellipse at center, rgba(244,245,248,0.04) 0%, transparent 70%)', pointerEvents: 'none' }} />

        <div style={{ position: 'relative', zIndex: 1, maxWidth: '760px', margin: '0 auto', width: '100%' }}>
          <motion.div initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }} suppressHydrationWarning>

            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 12px', border: `1px solid ${C.border}`, borderRadius: '3px', color: C.dim, fontSize: '0.62rem', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '2rem', fontFamily: 'var(--font-geist-mono), monospace' }}>
              UK Tax Platform · 2026/27 · Free · No account required
            </div>

            <h1 style={{
              fontSize: 'clamp(2.4rem,7vw,5rem)', fontWeight: 600,
              lineHeight: 1.05, letterSpacing: '-0.04em', marginBottom: '1.75rem',
              color: C.white,
            }}>
              HMRC-accurate tax tools<br />
              <span style={{ color: 'rgba(244,245,248,0.45)' }}>for UK sole traders.</span>
            </h1>

            <p style={{ color: C.muted, fontSize: '1.05rem', lineHeight: 1.75, maxWidth: '34rem', marginBottom: '2.5rem' }}>
              HMRC-accurate estimates, full expense tracking, P&amp;L reports, and a tax advisory tool — all running free in your browser.
            </p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
              <Link href="/dashboard"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '9px',
                  padding: '13px 32px', background: C.white, color: C.bg,
                  fontWeight: 600, fontSize: '0.9rem', textDecoration: 'none', borderRadius: '4px',
                  letterSpacing: '-0.01em',
                }}>
                Open Dashboard <ArrowRight size={16} />
              </Link>
              <Link href="/auth/login"
                style={{ color: C.muted, fontSize: '0.82rem', textDecoration: 'none', padding: '13px 0' }}>
                Sign in to sync data →
              </Link>
            </div>

            <p style={{ color: C.dim, fontSize: '0.72rem', marginTop: '1.25rem', fontFamily: 'var(--font-geist-mono), monospace' }}>
              No account · No credit card · Tax calculations run client-side
            </p>
          </motion.div>
        </div>
      </section>

      {/* ── MODULES ── */}
      <section style={{ padding: '5rem 1.5rem', borderTop: `1px solid ${C.border}` }}>
        <div style={{ maxWidth: '1120px', margin: '0 auto' }}>
          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            style={{ marginBottom: '3rem' }}>
            <div style={{ color: C.dim, fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '0.5rem', fontFamily: 'var(--font-geist-mono), monospace' }}>
              modules
            </div>
            <h2 style={{ color: C.white, fontSize: 'clamp(1.5rem,3vw,2rem)', fontWeight: 600, letterSpacing: '-0.03em', margin: 0 }}>
              Everything in one place.
            </h2>
          </motion.div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: '1px', border: `1px solid ${C.border}`, borderRadius: '6px', overflow: 'hidden', background: C.border }}>
            {MODULES.map(({ icon: Icon, label, desc }, i) => (
              <motion.div key={label}
                initial={{ opacity: 0 }} whileInView={{ opacity: 1 }}
                viewport={{ once: true }} transition={{ delay: i * 0.05 }}
                style={{ background: C.card, padding: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '9px', marginBottom: '0.65rem' }}>
                  <Icon size={14} strokeWidth={1.5} style={{ color: C.muted }} />
                  <span style={{ color: C.white, fontSize: '0.85rem', fontWeight: 600, letterSpacing: '-0.01em' }}>{label}</span>
                </div>
                <p style={{ color: C.muted, fontSize: '0.78rem', lineHeight: 1.6, margin: 0 }}>{desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ padding: '5rem 1.5rem', borderTop: `1px solid ${C.border}` }}>
        <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          style={{ maxWidth: '560px', margin: '0 auto' }}>
          <h2 style={{ color: C.white, fontSize: 'clamp(1.5rem,3vw,2rem)', fontWeight: 600, letterSpacing: '-0.03em', marginBottom: '0.75rem' }}>
            No setup. Open it now.
          </h2>
          <p style={{ color: C.muted, fontSize: '0.9rem', lineHeight: 1.7, marginBottom: '2rem' }}>
            Every tool is free and works instantly without an account. Sign in only if you want your data to persist across devices.
          </p>
          <Link href="/dashboard"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '9px', padding: '13px 32px', background: C.white, color: C.bg, fontWeight: 600, fontSize: '0.9rem', textDecoration: 'none', borderRadius: '4px', letterSpacing: '-0.01em' }}>
            Open Dashboard Free <ArrowRight size={16} />
          </Link>
        </motion.div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ padding: '2rem 1.5rem', borderTop: `1px solid ${C.border}` }}>
        <div style={{ maxWidth: '1120px', margin: '0 auto', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
          <span style={{ color: C.white, fontSize: '0.85rem', fontWeight: 600, letterSpacing: '-0.02em' }}>EasyAcco</span>
          <p style={{ color: C.dim, fontSize: '0.72rem', fontFamily: 'var(--font-geist-mono), monospace' }}>
            2026 · UK Freelancers & Sole Traders · Not financial advice
          </p>
          <a href="/security" style={{ color: C.dim, fontSize: '0.72rem', textDecoration: 'none' }}>Security & Privacy</a>
        </div>
      </footer>
    </div>
  )
}
