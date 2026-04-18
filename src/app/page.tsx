'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight, Calculator, BarChart2, Bot, Shield, BookOpen, Receipt } from 'lucide-react'

const MODULES = [
  { icon: Calculator, label: 'Tax Engine',   desc: 'HMRC-accurate 2026/27 · 5 employment scenarios · NI, pension, HICBC' },
  { icon: Receipt,    label: 'Expenses',      desc: 'Categorised tracking with "wholly & exclusively" guidance' },
  { icon: BarChart2,  label: 'P&L Reports',  desc: 'Income statement · monthly charts · Export to JSON' },
  { icon: Bot,        label: 'Tax Advisory', desc: 'Ask any UK tax question and get structured, specific answers' },
  { icon: BookOpen,   label: 'Ledger',        desc: 'Double-entry transaction log with net position at a glance' },
  { icon: Shield,     label: 'MTD Calendar',  desc: 'All 2026/27 quarterly deadlines with urgency indicators' },
]

function GridDot({ x, y }: { x: number; y: number }) {
  return (
    <div
      className="absolute w-px h-px rounded-full bg-[rgba(244,245,248,0.15)]"
      style={{ left: `${x}%`, top: `${y}%` }}
    />
  )
}

export default function LandingPage() {
  const dots = Array.from({ length: 60 }, (_, i) => ({
    x: (i * 17.3) % 100,
    y: (i * 13.7) % 100,
  }))

  return (
    <div className="min-h-screen bg-[var(--sa-black)] text-[var(--sa-white)]">

      {/* ── NAV ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-[var(--sa-border)] bg-[rgba(24,24,24,0.9)] backdrop-blur-[16px]">
        <div className="max-w-[1120px] mx-auto px-6 h-14 flex items-center justify-between">
          <span className="text-[var(--sa-white)] text-[0.95rem] font-semibold tracking-[-0.03em]">
            EasyAcco
          </span>
          <div className="flex items-center gap-3">
            <Link href="/auth/login" className="text-[var(--sa-muted)] text-[0.82rem] no-underline px-[14px] py-[7px]">
              Sign in
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-[6px] bg-[var(--sa-white)] text-[var(--sa-black)] px-5 py-2 text-[0.82rem] font-semibold no-underline rounded-[4px] tracking-[-0.01em]"
            >
              Open Dashboard <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="relative min-h-screen flex items-center px-6 pt-24 pb-20 overflow-hidden">
        {/* Dot field */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden>
          {dots.map((d, i) => <GridDot key={i} x={d.x} y={d.y} />)}
        </div>
        {/* Radial glow */}
        <div className="absolute top-[20%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] pointer-events-none bg-[radial-gradient(ellipse_at_center,rgba(244,245,248,0.04)_0%,transparent_70%)]" />

        <div className="relative z-10 max-w-[760px] mx-auto w-full">
          <motion.div initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }} suppressHydrationWarning>

            <div className="inline-flex items-center gap-[6px] px-3 py-1 border border-[var(--sa-border)] rounded-[3px] text-[rgba(244,245,248,0.18)] text-[0.62rem] tracking-[0.15em] uppercase mb-8 font-mono">
              UK Tax Platform · 2026/27 · Free · No account required
            </div>

            <h1 className="text-[clamp(2.4rem,7vw,5rem)] font-semibold leading-[1.05] tracking-[-0.04em] mb-7 text-[var(--sa-white)]">
              HMRC-accurate tax tools<br />
              <span className="text-[rgba(244,245,248,0.45)]">for UK sole traders.</span>
            </h1>

            <p className="text-[var(--sa-muted)] text-[1.05rem] leading-[1.75] max-w-[34rem] mb-10">
              HMRC-accurate estimates, full expense tracking, P&amp;L reports, and a tax advisory tool — all running free in your browser.
            </p>

            <div className="flex flex-wrap gap-3 items-center">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-[9px] px-8 py-[13px] bg-[var(--sa-white)] text-[var(--sa-black)] font-semibold text-[0.9rem] no-underline rounded-[4px] tracking-[-0.01em]"
              >
                Open Dashboard <ArrowRight size={16} />
              </Link>
              <Link href="/auth/login" className="text-[var(--sa-muted)] text-[0.82rem] no-underline py-[13px]">
                Sign in to sync data →
              </Link>
            </div>

            <p className="text-[rgba(244,245,248,0.18)] text-[0.72rem] mt-5 font-mono">
              No account · No credit card · Tax calculations run client-side
            </p>
          </motion.div>
        </div>
      </section>

      {/* ── MODULES ── */}
      <section className="px-6 py-20 border-t border-[var(--sa-border)]">
        <div className="max-w-[1120px] mx-auto">
          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mb-12">
            <div className="text-[rgba(244,245,248,0.18)] text-[0.62rem] uppercase tracking-[0.15em] mb-2 font-mono">
              modules
            </div>
            <h2 className="text-[var(--sa-white)] text-[clamp(1.5rem,3vw,2rem)] font-semibold tracking-[-0.03em] m-0">
              Everything in one place.
            </h2>
          </motion.div>

          <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-px border border-[var(--sa-border)] rounded-[6px] overflow-hidden bg-[var(--sa-border)]">
            {MODULES.map(({ icon: Icon, label, desc }, i) => (
              <motion.div
                key={label}
                initial={{ opacity: 0 }} whileInView={{ opacity: 1 }}
                viewport={{ once: true }} transition={{ delay: i * 0.05 }}
                className="bg-[var(--sa-surface)] p-6"
              >
                <div className="flex items-center gap-[9px] mb-[0.65rem]">
                  <Icon size={14} strokeWidth={1.5} className="text-[var(--sa-muted)]" />
                  <span className="text-[var(--sa-white)] text-[0.85rem] font-semibold tracking-[-0.01em]">{label}</span>
                </div>
                <p className="text-[var(--sa-muted)] text-[0.78rem] leading-[1.6] m-0">{desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="px-6 py-20 border-t border-[var(--sa-border)]">
        <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="max-w-[560px] mx-auto">
          <h2 className="text-[var(--sa-white)] text-[clamp(1.5rem,3vw,2rem)] font-semibold tracking-[-0.03em] mb-3">
            No setup. Open it now.
          </h2>
          <p className="text-[var(--sa-muted)] text-[0.9rem] leading-[1.7] mb-8">
            Every tool is free and works instantly without an account. Sign in only if you want your data to persist across devices.
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-[9px] px-8 py-[13px] bg-[var(--sa-white)] text-[var(--sa-black)] font-semibold text-[0.9rem] no-underline rounded-[4px] tracking-[-0.01em]"
          >
            Open Dashboard Free <ArrowRight size={16} />
          </Link>
        </motion.div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="px-6 py-8 border-t border-[var(--sa-border)]">
        <div className="max-w-[1120px] mx-auto flex flex-wrap items-center justify-between gap-3">
          <span className="text-[var(--sa-white)] text-[0.85rem] font-semibold tracking-[-0.02em]">EasyAcco</span>
          <p className="text-[rgba(244,245,248,0.18)] text-[0.72rem] font-mono">
            2026 · UK Freelancers &amp; Sole Traders · Not financial advice
          </p>
          <a href="/security" className="text-[rgba(244,245,248,0.18)] text-[0.72rem] no-underline">Security &amp; Privacy</a>
        </div>
      </footer>
    </div>
  )
}
