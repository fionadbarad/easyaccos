'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight, Database, BarChart2, Bot, Star } from 'lucide-react'
import Kittax from '@/components/Kittax'

// ─── Celestial palette ───────────────────────────────────────────────────────
const C = {
  bg:       '#1A2342',
  deep:     '#0F1628',
  card:     '#4A4066',
  gold:     '#C2A368',
  text:     '#E4D3B4',
  muted:    'rgba(228,211,180,0.55)',
  border:   'rgba(194,163,104,0.2)',
}

const STEPS = [
  {
    icon: <Database size={28} />,
    step: '01',
    title: 'Connect Your Data',
    desc: 'Enter your income, expenses, and employment details in minutes. No accountant needed.',
  },
  {
    icon: <BarChart2 size={28} />,
    step: '02',
    title: 'Track HMRC & Tax',
    desc: 'Get HMRC-accurate estimates for Income Tax, NI Class 2 & 4, and Student Loan for 2026/27.',
  },
  {
    icon: <Bot size={28} />,
    step: '03',
    title: 'Optimise with AI',
    desc: 'Ask our Gemini-powered AI anything about UK tax. Get personalised insights instantly.',
  },
]

const FEATURES = [
  'Live Tax Estimator · 2026/27',
  'AI Assistant (Gemini)',
  'Expense Tracker',
  'P&L Reports',
  'Currency Converter · 170+ pairs',
  'Financial Literacy Cards',
]

function StarField() {
  const stars = Array.from({ length: 40 }, (_, i) => ({
    id: i,
    size: 1 + (i % 2),
    left: `${(i * 2.5) % 100}%`,
    top:  `${(i * 2.7) % 100}%`,
    delay: (i % 5) * 0.4,
    dur:   3 + (i % 4),
  }))
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
      {stars.map((s) => (
        <motion.div
          key={s.id}
          className="absolute rounded-full"
          style={{ width: s.size, height: s.size, left: s.left, top: s.top, background: C.gold, opacity: 0.15 }}
          animate={{ opacity: [0.08, 0.35, 0.08] }}
          transition={{ duration: s.dur, repeat: Infinity, delay: s.delay, ease: 'easeInOut' }}
        />
      ))}
    </div>
  )
}

export default function LandingPage() {
  return (
    <div style={{ background: C.bg, minHeight: '100vh', color: C.text }}>

      {/* ── NAV ── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
        background: 'rgba(15,22,40,0.85)', backdropFilter: 'blur(14px)',
        borderBottom: `1px solid ${C.border}`,
      }}>
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <span style={{ fontFamily: 'var(--font-playfair)', color: C.gold, fontSize: '1.35rem', fontWeight: 700 }}>
            EasyAcco
          </span>
          <div className="flex items-center gap-4">
            <Link href="/auth/login"
              style={{ color: C.muted, fontSize: '0.875rem', textDecoration: 'none', padding: '6px 12px' }}>
              Sign In
            </Link>
            <Link href="/auth/signup"
              style={{ background: C.gold, color: C.deep, padding: '8px 20px', fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none', borderRadius: '3px' }}>
              Get Started Free
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section style={{ position: 'relative', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '6rem 1.5rem 4rem' }}>
        <StarField />
        {/* Radial glow */}
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 70% 60% at 50% 40%, rgba(74,64,102,0.35) 0%, transparent 70%)', pointerEvents: 'none' }} />

        <div style={{ position: 'relative', zIndex: 1, maxWidth: '760px', margin: '0 auto' }}>
          <motion.div initial={{ opacity: 0, y: 32 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9 }} suppressHydrationWarning>

            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '5px 14px', border: `1px solid ${C.border}`, borderRadius: '999px', color: C.gold, fontSize: '0.7rem', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '2rem', background: 'rgba(194,163,104,0.08)' }}>
              <Star size={10} fill={C.gold} /> UK Tax Platform · Free Forever
            </div>

            <h1 style={{ fontFamily: 'var(--font-playfair)', fontSize: 'clamp(2.8rem,8vw,5.5rem)', fontWeight: 700, lineHeight: 1.08, marginBottom: '1.5rem', color: C.text }}>
              Welcome to<br />
              <em style={{ color: C.gold, fontStyle: 'italic' }}>EasyAcco</em>
            </h1>

            <p style={{ color: C.muted, fontSize: '1.1rem', lineHeight: 1.75, maxWidth: '38rem', margin: '0 auto 2.5rem' }}>
              Your celestial financial sanctuary. HMRC-accurate tax estimates, AI-powered guidance, and expense tracking — all free, forever.
            </p>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link href="/auth/login" className="ui-btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                Login to Dashboard <ArrowRight size={18} />
              </Link>
              <Link href="/auth/signup" className="ui-btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                Create Free Account
              </Link>
            </div>

            <Kittax message="I’m Kittax. Ask me anything about UK tax and I’ll keep it calm, confident, and coercively accurate." />

            {/* Feature pills */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }} suppressHydrationWarning
              style={{ marginTop: '2rem', display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' }}>
              {FEATURES.map((f) => (
                <span key={f} style={{ padding: '4px 12px', background: 'rgba(74,64,102,0.5)', border: `1px solid ${C.border}`, borderRadius: '999px', fontSize: '0.75rem', color: C.muted }}>
                  {f}
                </span>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section style={{ padding: '6rem 1.5rem', background: C.deep }}>
        <div className="max-w-5xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            style={{ textAlign: 'center', marginBottom: '4rem' }}>
            <p style={{ color: C.gold, fontSize: '0.7rem', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>The Process</p>
            <h2 style={{ fontFamily: 'var(--font-playfair)', fontSize: 'clamp(1.8rem,4vw,3rem)', fontWeight: 700, color: C.text }}>
              Three Steps to Clarity
            </h2>
          </motion.div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: '1.5rem' }}>
            {STEPS.map((s, i) => (
              <motion.div key={s.step}
                initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.15 }}
                style={{
                  position: 'relative', padding: '2.25rem 2rem',
                  background: C.card,
                  border: `1px solid ${C.border}`,
                  borderRadius: '6px',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
                }}>
                {/* Step number watermark */}
                <div style={{ position: 'absolute', top: '1.25rem', right: '1.5rem', fontFamily: 'var(--font-playfair)', fontSize: '3rem', fontWeight: 700, color: 'rgba(194,163,104,0.1)', lineHeight: 1 }}>
                  {s.step}
                </div>
                <div style={{ color: C.gold, marginBottom: '1.25rem' }}>{s.icon}</div>
                <h3 style={{ fontFamily: 'var(--font-playfair)', color: C.text, fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.75rem' }}>
                  {s.title}
                </h3>
                <p style={{ color: C.muted, fontSize: '0.875rem', lineHeight: 1.7 }}>{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA BRIDGE ── */}
      <section style={{ padding: '6rem 1.5rem', background: C.bg, textAlign: 'center', borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}` }}>
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="max-w-2xl mx-auto">
          <h2 style={{ fontFamily: 'var(--font-playfair)', color: C.text, fontSize: 'clamp(1.8rem,4vw,2.8rem)', fontWeight: 700, marginBottom: '1rem' }}>
            Your sanctuary awaits.
          </h2>
          <p style={{ color: C.muted, marginBottom: '2.5rem', fontSize: '1.05rem' }}>
            Join UK freelancers and students who have taken control of their tax and finances.
          </p>
          <Link href="/auth/login"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', padding: '16px 44px', background: C.gold, color: C.deep, fontWeight: 700, fontSize: '1rem', textDecoration: 'none', borderRadius: '3px' }}>
            Login to Dashboard <ArrowRight size={20} />
          </Link>
        </motion.div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ padding: '2.5rem 1.5rem', borderTop: `1px solid ${C.border}` }}>
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <span style={{ fontFamily: 'var(--font-playfair)', color: C.gold, fontSize: '1.1rem', fontWeight: 700 }}>EasyAcco</span>
          <p style={{ color: C.muted, fontSize: '0.8rem' }}>
            © 2026 EasyAcco · Free for UK Freelancers & Students · Not financial advice.
          </p>
          <div className="footer-links">
            <a href="/privacy">Privacy</a>
            <a href="/terms">Terms</a>
            <a href="/contact">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
