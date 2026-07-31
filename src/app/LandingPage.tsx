import Link from 'next/link'
import dynamic from 'next/dynamic'
import {
  ArrowRight,
  Calculator,
  BarChart2,
  MessageCircle,
  Shield,
  BookOpen,
  Receipt,
  CheckCircle2,
  FileText,
  Car,
} from 'lucide-react'

// Lazy-load the animated wrapper — this keeps the landing page SSR-renderable
// and defers framer-motion (and its ~40KB gzip payload) until after FCP.
const AnimatedWrapper = dynamic(
  () => import('./AnimatedWrapper').then((m) => ({ default: m.default })),
  { ssr: true, loading: () => null },
)

const MODULES = [
  {
    icon: Calculator,
    label: 'HMRC Tax Engine',
    desc: '2026/27-accurate income tax, NI, dividends, and pension relief across all UK regions and employment types.',
  },
  {
    icon: Receipt,
    label: 'Expense Tracker',
    desc: 'Log allowable business expenses with receipt OCR scanning. HMRC "wholly & exclusively" compliant.',
  },
  {
    icon: BarChart2,
    label: 'P&L Reports',
    desc: 'Instant profit & loss statements with monthly breakdowns. Export-ready for your accountant or Self Assessment return.',
  },
  {
    icon: FileText,
    label: 'Invoice Generator',
    desc: 'Create professional invoices with auto-incrementing numbers, VAT support, and PDF export. Track Draft, Sent, Paid, and Overdue.',
  },
  {
    icon: BookOpen,
    label: 'Double-Entry Ledger',
    desc: 'Maintain a clean transaction log with journal entries and a live net position — built for sole-trader bookkeeping.',
  },
  {
    icon: Car,
    label: 'Mileage Tracker',
    desc: 'Log business journeys at HMRC-approved rates (55p first 10k miles, 25p after). Auto-totals for your Self Assessment.',
  },
  {
    icon: Shield,
    label: 'MTD Compliance',
    desc: 'All 2026/27 quarterly Making Tax Digital deadlines tracked with urgency indicators and early-warning alerts.',
  },
  {
    icon: MessageCircle,
    label: 'Tax Q&A Assistant',
    desc: 'Ask UK tax questions and get structured answers grounded in HMRC 2026/27 rules — sole trader income, dividends, deadlines, and more.',
  },
]

const TRUST_POINTS = [
  'Calculations follow published HMRC guidance for 2026/27',
  'No account required — open the dashboard and start immediately',
  'Data encrypted in your browser with AES-256 — nothing leaves your device',
  'Making Tax Digital ready — quarterly submission tracking',
  'Free forever — no subscription, no paywalls, no credit card',
]

const JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'EasyAcco',
  url: 'https://easyacco.vercel.app',
  description:
    'Free tax-estimate software for UK sole traders, freelancers, and directors. Covers income tax, NI, expenses, invoices, and MTD for the 2026/27 tax year, using published HMRC rates.',
  applicationCategory: 'FinanceApplication',
  operatingSystem: 'Web',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'GBP',
  },
  audience: {
    '@type': 'Audience',
    audienceType:
      'UK sole traders, freelancers, contractors, self-employed professionals, limited company directors',
  },
  featureList: [
    'HMRC 2026/27 income tax and NI calculator',
    'Sole trader expense tracker with receipt OCR scanning',
    'Invoice lifecycle management with VAT support',
    'Making Tax Digital (MTD) deadline tracker',
    'Mileage claim tracker (55p/25p HMRC rates)',
    'Encrypted local-first data storage',
    'Profit & Loss reports',
    'Self Assessment preparation tools',
  ],
}

function GridDot({ x, y }: { x: number; y: number }) {
  return (
    <div
      className="absolute w-px h-px rounded-full bg-sa-selected"
      style={{ left: `${x}%`, top: `${y}%` }}
    />
  )
}

export default function LandingPage() {
  const dots = Array.from({ length: 60 }, (_, i) => ({ x: (i * 17.3) % 100, y: (i * 13.7) % 100 }))

  return (
    <div className="min-h-screen bg-sa-black text-sa-white">
      {/* JSON-LD structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />

      {/* ── NAV ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-sa-border bg-sa-scrim backdrop-blur-[16px]">
        <div className="max-w-[1120px] mx-auto px-6 h-14 flex items-center justify-between">
          <span className="text-sa-white text-lead font-semibold tracking-[-0.03em]">EasyAcco</span>
          <div className="flex items-center gap-3">
            <Link
              href="/auth/login"
              className="text-sa-muted text-body no-underline px-[14px] py-[7px]"
            >
              Sign in
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-[6px] bg-sa-white text-sa-black px-5 py-2 text-body font-semibold no-underline rounded-[4px] tracking-[-0.01em]"
            >
              Open Dashboard <ArrowRight size={12} />
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="relative min-h-screen flex items-center px-6 pt-24 pb-20 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" aria-hidden>
          {dots.map((d, i) => (
            <GridDot key={i} x={d.x} y={d.y} />
          ))}
        </div>
        <div className="absolute top-[20%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] pointer-events-none bg-[radial-gradient(ellipse_at_center,rgba(244,245,248,0.04)_0%,transparent_70%)]" />

        <AnimatedWrapper delay={0}>
          <div className="relative z-10 max-w-[800px] mx-auto w-full">
            <div className="inline-flex items-center gap-[6px] px-3 py-1 border border-sa-border rounded-[3px] text-sa-dim text-caption tracking-[0.15em] uppercase mb-8 font-mono">
              {/* NOT "HMRC-Accurate". Placing the HMRC name in a badge next to
                  the product name reads as HMRC having vouched for it, which is
                  what their branding rules forbid — and it was cited in the
                  production-credentials rejection. State what is true instead:
                  the rates are the published 2026/27 ones. */}
              UK Tax Platform · 2026/27 Rates · Free
            </div>

            <h1 className="text-h1 font-semibold leading-[1.05] tracking-[-0.04em] mb-7 text-sa-white">
              Professional tax tools
              <br />
              <span className="text-sa-muted">every UK sole trader deserves.</span>
            </h1>

            <p className="text-sa-muted text-lead leading-[1.75] max-w-[38rem] mb-4">
              Stop guessing your Self Assessment bill. EasyAcco estimates your income tax, National
              Insurance, dividends, and pension relief using 2026/27 UK rates — completely free,
              running in your browser. Estimates only, not a substitute for professional advice.
            </p>

            <p className="text-sa-dim text-body leading-[1.6] max-w-[36rem] mb-10">
              Built for UK freelancers, contractors, and sole traders who want quick 2026/27 tax
              estimates without the accountancy fees.
            </p>

            <div className="flex flex-wrap gap-3 items-center mb-10">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-[9px] px-8 py-[13px] bg-sa-white text-sa-black font-semibold text-body no-underline rounded-[4px] tracking-[-0.01em]"
              >
                Open Free Dashboard <ArrowRight size={16} />
              </Link>
              <Link href="/demo" className="text-sa-muted text-meta no-underline py-[13px]">
                View demo first →
              </Link>
            </div>

            {/* Trust points */}
            <div className="flex flex-col gap-[0.45rem]">
              {TRUST_POINTS.map((pt) => (
                <div key={pt} className="flex items-start gap-[8px]">
                  <CheckCircle2 size={12} className="text-sa-green mt-[2px] flex-shrink-0" />
                  <span className="text-sa-muted text-body leading-[1.5] font-mono">{pt}</span>
                </div>
              ))}
            </div>
          </div>
        </AnimatedWrapper>
      </section>

      {/* ── PROBLEM / SOLUTION ── */}
      <section className="px-6 py-20 border-t border-sa-border bg-sa-tint">
        <div className="max-w-[760px] mx-auto">
          <AnimatedWrapper delay={0.05}>
            <div className="text-sa-dim text-caption uppercase tracking-[0.15em] mb-3 font-mono">
              the problem
            </div>
            <h2 className="text-sa-white text-h2 font-semibold tracking-[-0.03em] mb-5">
              UK sole traders overpay tax every year.
            </h2>
            <p className="text-sa-muted text-lead leading-[1.8] mb-6">
              The 60% personal allowance trap. Missed expense deductions. Dividend timing errors.
              Making Tax Digital deadlines. NI Class 4 miscalculations. The UK tax system is complex
              — and most tools built for sole traders either oversimplify or cost a fortune.
            </p>
            <p className="text-sa-muted text-lead leading-[1.8]">
              EasyAcco changes that. Every calculation follows the exact HMRC rules for 2026/27 —
              the same rules your accountant uses, without the hourly rate.
            </p>
          </AnimatedWrapper>
        </div>
      </section>

      {/* ── MODULES ── */}
      <section className="px-6 py-20 border-t border-sa-border">
        <div className="max-w-[1120px] mx-auto">
          <AnimatedWrapper delay={0.1}>
            <div className="mb-12">
              <div className="text-sa-dim text-caption uppercase tracking-[0.15em] mb-2 font-mono">
                what&apos;s included
              </div>
              <h2 className="text-sa-white text-h2 font-semibold tracking-[-0.03em] m-0">
                Every tool a sole trader needs.
              </h2>
              <p className="text-sa-muted text-lead mt-2 max-w-[32rem]">
                Everything you need to estimate your 2026/27 tax — free, in your browser.
              </p>
            </div>
          </AnimatedWrapper>

          <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-px border border-sa-border rounded-[6px] overflow-hidden bg-sa-border">
            {MODULES.map(({ icon: Icon, label, desc }, i) => (
              <AnimatedWrapper key={label} delay={i * 0.05}>
                <div className="bg-sa-surface p-6">
                  <div className="flex items-center gap-[9px] mb-[0.65rem]">
                    <Icon size={14} strokeWidth={1.5} className="text-sa-muted" />
                    <span className="text-sa-white text-body font-semibold tracking-[-0.01em]">
                      {label}
                    </span>
                  </div>
                  <p className="text-sa-muted text-body leading-[1.6] m-0">{desc}</p>
                </div>
              </AnimatedWrapper>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="px-6 py-20 border-t border-sa-border">
        <AnimatedWrapper delay={0.15}>
          <div className="max-w-[580px] mx-auto">
            <div className="text-sa-dim text-caption uppercase tracking-[0.15em] mb-3 font-mono">
              get started
            </div>
            <h2 className="text-sa-white text-h2 font-semibold tracking-[-0.03em] mb-3">
              Know your tax bill before January.
            </h2>
            <p className="text-sa-muted text-body leading-[1.7] mb-8">
              Open the dashboard in seconds — no account, no setup, no cost. Sign in only when you
              want your data to sync across devices.
            </p>
            <div className="flex flex-wrap gap-3 items-center">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-[9px] px-8 py-[13px] bg-sa-white text-sa-black font-semibold text-body no-underline rounded-[4px] tracking-[-0.01em]"
              >
                Open Dashboard — Free <ArrowRight size={16} />
              </Link>
              <Link href="/auth/login" className="text-sa-muted text-body no-underline">
                Sign in to sync →
              </Link>
            </div>
            <p className="text-sa-dim text-caption mt-5 font-mono">
              No credit card · No account required · AES-256 encrypted
            </p>
          </div>
        </AnimatedWrapper>
      </section>

      {/* ── FOOTER ── */}
      <footer className="px-6 py-8 border-t border-sa-border">
        <div className="max-w-[1120px] mx-auto flex flex-wrap items-center justify-between gap-3">
          <span className="text-sa-white text-body font-semibold tracking-[-0.02em]">EasyAcco</span>
          {/* The non-affiliation statement is the thing HMRC looks for. Keep it
              on the marketing surface, not buried in a legal page. */}
          <p className="text-sa-dim text-caption font-mono">
            2026 · UK Sole Traders &amp; Freelancers · Not financial advice · Independent software,
            not endorsed or approved by HM Revenue &amp; Customs
          </p>
          <div className="flex items-center gap-4">
            <span className="text-sa-dim text-caption font-mono">Encrypted via Supabase</span>
            <a
              href="/security"
              className="text-sa-dim text-caption no-underline hover:text-sa-muted transition-colors"
            >
              Security
            </a>
            {/* The privacy notice is a UK GDPR Art. 13 requirement and must be
                reachable from the public surface, not only from inside the app. */}
            <a
              href="/privacy"
              className="text-sa-dim text-caption no-underline hover:text-sa-muted transition-colors"
            >
              Privacy
            </a>
            <a
              href="/demo"
              className="text-sa-dim text-caption no-underline hover:text-sa-muted transition-colors"
            >
              Demo
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}
