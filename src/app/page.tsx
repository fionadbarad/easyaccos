'use client'

import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Bot, BarChart2, LayoutDashboard, ArrowRightLeft,
  GraduationCap, Receipt, ArrowRight, ChevronDown
} from 'lucide-react'

const FEATURES = [
  { icon: <Bot size={28} />, title: 'AI Tax Assistant', desc: 'Ask anything about UK tax. Powered by Gemini AI, trained on HMRC rules.' },
  { icon: <BarChart2 size={28} />, title: 'Live Tax Estimator', desc: 'Real-time Income Tax, NI Class 2 & 4, and Student Loan calculations for 2026/27.' },
  { icon: <LayoutDashboard size={28} />, title: 'Smart Dashboard', desc: 'Visual P&L reports. Income trajectories. HMRC-ready data.' },
  { icon: <ArrowRightLeft size={28} />, title: 'Live Currency Converter', desc: 'Real exchange rates updated every 60 seconds. 170+ currencies.' },
  { icon: <GraduationCap size={28} />, title: 'Learn Module', desc: "Swipeable financial literacy cards. The Duolingo of UK tax." },
  { icon: <Receipt size={28} />, title: 'Expense Tracker', desc: "Log expenses mapped to HMRC's 'Wholly and Exclusively' rule." },
]

const STATS = [
  { num: '39%', label: 'of UK adults have a side hustle' },
  { num: '9%', label: 'of young people pass money literacy tests' },
  { num: '65%', label: "of side earners don't know they need to register for tax" },
]

const STEPS = [
  { n: '01', title: 'Sign up free', desc: 'Create your account and enter your income profile in minutes.' },
  { n: '02', title: 'Track & Estimate', desc: 'Log expenses and get your live HMRC-accurate tax estimate.' },
  { n: '03', title: 'Learn & Grow', desc: 'Master UK tax with AI-powered literacy cards at your own pace.' },
]

function FloatingParticles() {
  const [particles] = useState(() =>
    Array.from({ length: 24 }, (_, i) => ({
      id: i,
      w: 1 + (i % 3),
      left: `${(i * 4.2) % 100}%`,
      top: `${(i * 7.3) % 100}%`,
      isGold: i % 3 === 0,
      dur: 4 + (i % 6),
      delay: (i % 4),
    }))
  )
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full"
          style={{
            width: p.w,
            height: p.w,
            left: p.left,
            top: p.top,
            background: p.isGold ? '#D4AF37' : '#C0C0C0',
            opacity: 0.2,
          }}
          animate={{ y: [0, -40, 0], opacity: [0.1, 0.4, 0.1] }}
          transition={{ duration: p.dur, repeat: Infinity, delay: p.delay, ease: 'easeInOut' }}
        />
      ))}
      <svg className="absolute inset-0 w-full h-full">
        <defs>
          <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
            <path d="M 60 0 L 0 0 0 60" fill="none" stroke="rgba(192,192,192,0.05)" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>
    </div>
  )
}

export default function HomePage() {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', h)
    return () => window.removeEventListener('scroll', h)
  }, [])

  return (
    <div style={{ background: '#292E1E', minHeight: '100vh' }}>
      {/* NAVBAR */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
        style={{
          background: scrolled ? 'rgba(41,46,30,0.96)' : 'rgba(41,46,30,0.7)',
          backdropFilter: 'blur(12px)',
          borderBottom: scrolled ? '1px solid rgba(192,192,192,0.1)' : '1px solid transparent',
        }}
      >
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <span style={{ fontFamily: 'var(--font-playfair)', color: '#C0C0C0', fontSize: '1.4rem', fontWeight: 700 }}>
            EasyAcco
          </span>
          <div className="hidden md:flex items-center gap-8">
            {['Features', 'How It Works', 'Learn'].map((item) => (
              <a key={item} href={`#${item.toLowerCase().replace(' ', '-')}`}
                style={{ color: '#8A9070', fontSize: '0.875rem', textDecoration: 'none', transition: 'color 0.2s' }}
                onMouseEnter={(e) => ((e.target as HTMLElement).style.color = '#C0C0C0')}
                onMouseLeave={(e) => ((e.target as HTMLElement).style.color = '#8A9070')}
              >{item}</a>
            ))}
          </div>
          <Link href="/dashboard"
            style={{ background: '#D4AF37', color: '#1E2218', padding: '8px 20px', fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none', borderRadius: '2px' }}>
            Open Dashboard
          </Link>
        </div>
      </nav>

      {/* HERO */}
      <section className="relative min-h-screen flex flex-col items-center justify-center text-center px-6 pt-16">
        <FloatingParticles />
        <div className="relative z-10 max-w-4xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
            <div style={{ display: 'inline-block', padding: '6px 16px', borderRadius: '999px', border: '1px solid rgba(212,175,55,0.3)', color: '#D4AF37', background: 'rgba(212,175,55,0.08)', fontSize: '0.7rem', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '2rem' }}>
              UK Tax Platform · Free Forever
            </div>
            <h1 style={{ fontFamily: 'var(--font-playfair)', color: '#C0C0C0', fontSize: 'clamp(2.5rem,7vw,5rem)', fontWeight: 700, lineHeight: 1.1, marginBottom: '1.5rem' }}>
              Your Financial<br />
              <em style={{ color: '#D4AF37' }}>Sanctuary</em>
            </h1>
            <p style={{ color: '#8A9070', fontSize: '1.1rem', maxWidth: '36rem', margin: '0 auto 2.5rem', lineHeight: 1.7 }}>
              The UK&apos;s first Dark Luxury tax platform for freelancers and Gen Z — AI-powered, HMRC-accurate, and free forever.
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link href="/auth/signup" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '14px 32px', background: '#D4AF37', color: '#1E2218', fontSize: '0.95rem', fontWeight: 600, textDecoration: 'none', borderRadius: '2px' }}>
                Get Started Free <ArrowRight size={18} />
              </Link>
              <a href="#how-it-works" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '14px 32px', border: '1px solid rgba(192,192,192,0.3)', color: '#C0C0C0', fontSize: '0.95rem', fontWeight: 600, textDecoration: 'none', borderRadius: '2px', background: 'transparent' }}>
                See How It Works
              </a>
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
            style={{ marginTop: '5rem', display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '1.5rem', maxWidth: '32rem', margin: '5rem auto 0' }}>
            {[{ label: 'Free Forever', sub: 'No hidden fees' }, { label: 'UK Tax Ready', sub: '2026/27 figures' }, { label: 'AI-Powered', sub: 'Gemini AI' }].map((s) => (
              <div key={s.label} style={{ textAlign: 'center' }}>
                <div style={{ color: '#D4AF37', fontWeight: 600, fontSize: '0.875rem' }}>{s.label}</div>
                <div style={{ color: '#8A9070', fontSize: '0.75rem', marginTop: '4px' }}>{s.sub}</div>
              </div>
            ))}
          </motion.div>
          <motion.div style={{ marginTop: '4rem' }} animate={{ y: [0, 8, 0] }} transition={{ duration: 2, repeat: Infinity }}>
            <ChevronDown size={24} style={{ color: '#8A9070', margin: '0 auto', display: 'block' }} />
          </motion.div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" style={{ padding: '6rem 1.5rem', background: '#1E2218' }}>
        <div className="max-w-6xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            style={{ textAlign: 'center', marginBottom: '4rem' }}>
            <h2 style={{ fontFamily: 'var(--font-playfair)', color: '#C0C0C0', fontSize: 'clamp(2rem,4vw,3rem)', fontWeight: 700, marginBottom: '1rem' }}>
              Everything You Need
            </h2>
            <p style={{ color: '#8A9070' }}>Six powerful tools in one dark luxury platform</p>
          </motion.div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: '1.5rem' }}>
            {FEATURES.map((f, i) => (
              <motion.div key={f.title}
                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                transition={{ delay: i * 0.1 }} whileHover={{ y: -4 }}
                style={{ padding: '2rem', background: '#292E1E', border: '1px solid rgba(192,192,192,0.12)', borderRadius: '2px', boxShadow: '0 4px 24px rgba(0,0,0,0.3)' }}>
                <div style={{ color: '#D4AF37', marginBottom: '1rem' }}>{f.icon}</div>
                <h3 style={{ fontFamily: 'var(--font-playfair)', color: '#C0C0C0', fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.5rem' }}>{f.title}</h3>
                <p style={{ color: '#8A9070', fontSize: '0.875rem', lineHeight: 1.6 }}>{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* EDITORIAL STATS */}
      <section style={{ padding: '6rem 1.5rem', background: '#292E1E' }}>
        <div className="max-w-5xl mx-auto">
          <motion.p initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
            style={{ textAlign: 'center', color: '#8A9070', fontSize: '0.7rem', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '4rem' }}>
            The Reality
          </motion.p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: '3rem' }}>
            {STATS.map((s, i) => (
              <motion.div key={s.num} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.2 }} style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: 'var(--font-playfair)', color: '#D4AF37', fontSize: 'clamp(4rem,8vw,6rem)', fontWeight: 700, lineHeight: 1 }}>{s.num}</div>
                <p style={{ color: '#8A9070', marginTop: '1rem', lineHeight: 1.5 }}>{s.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" style={{ padding: '6rem 1.5rem', background: '#1E2218' }}>
        <div className="max-w-4xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            style={{ textAlign: 'center', marginBottom: '4rem' }}>
            <h2 style={{ fontFamily: 'var(--font-playfair)', color: '#C0C0C0', fontSize: 'clamp(2rem,4vw,3rem)', fontWeight: 700 }}>
              How It Works
            </h2>
          </motion.div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {STEPS.map((step, i) => (
              <motion.div key={step.n}
                initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                style={{ display: 'flex', alignItems: 'flex-start', gap: '2rem', padding: '2rem', background: '#292E1E', border: '1px solid rgba(192,192,192,0.1)', borderRadius: '2px' }}>
                <div style={{ flexShrink: 0, width: '3.5rem', height: '3.5rem', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(212,175,55,0.15)', border: '2px solid #D4AF37', color: '#D4AF37', fontFamily: 'var(--font-playfair)', fontWeight: 700 }}>
                  {step.n}
                </div>
                <div>
                  <h3 style={{ fontFamily: 'var(--font-playfair)', color: '#C0C0C0', fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.5rem' }}>{step.title}</h3>
                  <p style={{ color: '#8A9070', fontSize: '0.875rem', lineHeight: 1.6 }}>{step.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA BANNER */}
      <section style={{ padding: '6rem 1.5rem', textAlign: 'center', background: 'linear-gradient(135deg,#292E1E 0%,#1E2218 50%,#292E1E 100%)', borderTop: '1px solid rgba(212,175,55,0.2)', borderBottom: '1px solid rgba(212,175,55,0.2)' }}>
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="max-w-2xl mx-auto">
          <h2 style={{ fontFamily: 'var(--font-playfair)', color: '#C0C0C0', fontSize: 'clamp(2rem,4vw,3rem)', fontWeight: 700, marginBottom: '1.5rem' }}>
            Ready to own your finances?
          </h2>
          <p style={{ color: '#8A9070', fontSize: '1.1rem', marginBottom: '2.5rem' }}>
            Join thousands of UK freelancers and students who have claimed their financial sanctuary.
          </p>
          <Link href="/auth/signup" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '16px 40px', background: '#D4AF37', color: '#1E2218', fontWeight: 600, textDecoration: 'none', borderRadius: '2px' }}>
            Get Started Free <ArrowRight size={18} />
          </Link>
        </motion.div>
      </section>

      {/* FOOTER */}
      <footer style={{ padding: '4rem 1.5rem', background: '#1E2218', borderTop: '1px solid rgba(192,192,192,0.08)' }}>
        <div className="max-w-6xl mx-auto">
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: '2rem' }}>
            <div>
              <div style={{ fontFamily: 'var(--font-playfair)', color: '#C0C0C0', fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.5rem' }}>EasyAcco</div>
              <p style={{ color: '#8A9070', fontSize: '0.875rem' }}>The Digital Sanctuary for UK Freelancers</p>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem' }}>
              {['Features', 'Dashboard', 'Learn', 'Privacy', 'Terms'].map((l) => (
                <a key={l} href="#" style={{ color: '#8A9070', fontSize: '0.875rem', textDecoration: 'none' }}
                  onMouseEnter={(e) => ((e.target as HTMLElement).style.color = '#C0C0C0')}
                  onMouseLeave={(e) => ((e.target as HTMLElement).style.color = '#8A9070')}>
                  {l}
                </a>
              ))}
            </div>
          </div>
          <div style={{ marginTop: '2.5rem', paddingTop: '2rem', borderTop: '1px solid rgba(192,192,192,0.08)', color: '#8A9070', fontSize: '0.8rem' }}>
            © 2026 EasyAcco. Free for UK Freelancers &amp; Students. Not financial advice.
          </div>
        </div>
      </footer>
    </div>
  )
}
