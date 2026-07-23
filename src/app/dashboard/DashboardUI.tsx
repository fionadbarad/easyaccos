'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import {
  Calculator,
  Receipt,
  GraduationCap,
  Bot,
  TrendingUp,
  Settings,
  BookOpen,
  FileText,
  AlertCircle,
  CheckCircle2,
  Clock,
} from 'lucide-react'
import { calculateTax } from '@/lib/tax-engine'
import type { TaxResult } from '@/lib/tax-engine'

type DashboardUIProps = { displayName: string }

import { C } from '@/styles/palette'
// ── MTD 2026/27 Quarterly Calendar ────────────────────────────────────────
const MTD_QUARTERS = [
  { label: 'Q1', period: '6 Apr – 5 Jul 2026', deadline: '2026-08-07', display: '7 Aug 2026' },
  { label: 'Q2', period: '6 Jul – 5 Oct 2026', deadline: '2026-11-07', display: '7 Nov 2026' },
  { label: 'Q3', period: '6 Oct – 5 Jan 2027', deadline: '2027-02-07', display: '7 Feb 2027' },
  { label: 'Q4', period: '6 Jan – 5 Apr 2027', deadline: '2027-05-07', display: '7 May 2027' },
  { label: 'Final', period: 'Full Year 2026/27', deadline: '2028-01-31', display: '31 Jan 2028' },
]

function getQuarterStatus(deadlineStr: string, today: Date) {
  const deadline = new Date(deadlineStr)
  const diffDays = Math.ceil((deadline.getTime() - today.getTime()) / 86400000)
  if (diffDays < 0) return { status: 'past', color: C.muted, Icon: CheckCircle2 }
  if (diffDays <= 14) return { status: 'urgent', color: C.red, Icon: AlertCircle }
  if (diffDays <= 45) return { status: 'upcoming', color: C.amber, Icon: Clock }
  return { status: 'future', color: C.muted, Icon: Clock }
}

function MTDCalendar() {
  const today = new Date()
  return (
    <div
      style={{
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: '6px',
        overflow: 'hidden',
        marginBottom: '2rem',
      }}
    >
      <div
        style={{
          padding: '1rem 1.25rem',
          borderBottom: `1px solid ${C.border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <div
            style={{
              color: C.white,
              fontSize: '0.85rem',
              fontWeight: 600,
              letterSpacing: '-0.01em',
            }}
          >
            MTD Filing Calendar
          </div>
          <div
            style={{
              color: C.muted,
              fontSize: '0.7rem',
              marginTop: '2px',
              fontFamily: 'var(--font-geist-mono), monospace',
            }}
          >
            Making Tax Digital · ITSA 2026/27
          </div>
        </div>
        <span
          style={{
            background: C.gray,
            color: C.white,
            fontSize: '0.6rem',
            fontWeight: 600,
            padding: '3px 8px',
            borderRadius: '3px',
            letterSpacing: '0.07em',
            fontFamily: 'var(--font-geist-mono), monospace',
          }}
        >
          ACTIVE
        </span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
        {MTD_QUARTERS.map((q, i) => {
          const { status, color, Icon } = getQuarterStatus(q.deadline, today)
          const isActive = status === 'upcoming' || status === 'urgent'
          return (
            <div
              key={q.label}
              style={{
                padding: '1rem 1.25rem',
                borderRight: i < MTD_QUARTERS.length - 1 ? `1px solid ${C.border}` : 'none',
                background: isActive ? 'rgba(244,245,248,0.025)' : 'transparent',
              }}
            >
              <div
                style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}
              >
                <Icon size={12} style={{ color }} />
                <span
                  style={{
                    color,
                    fontSize: '0.6rem',
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    fontFamily: 'var(--font-geist-mono), monospace',
                    textTransform: 'uppercase',
                  }}
                >
                  {q.label}
                </span>
              </div>
              <div
                style={{
                  color: status === 'past' ? C.muted : C.white,
                  fontSize: '0.72rem',
                  fontWeight: 500,
                  marginBottom: '3px',
                }}
              >
                {q.display}
              </div>
              <div style={{ color: C.muted, fontSize: '0.65rem', lineHeight: 1.4 }}>{q.period}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Quick Estimator ──────────────────────────────────────────────────────
function QuickEstimator() {
  const [income, setIncome] = useState('')
  const [expenses, setExpenses] = useState('')
  const [result, setResult] = useState<TaxResult | null>(null)
  const [error, setError] = useState('')

  const preview = useMemo(() => {
    const inc = Number(income || 0)
    const exp = Number(expenses || 0)
    if (!isNaN(inc) && !isNaN(exp) && inc > 0)
      return calculateTax({
        grossRevenue: inc,
        allowableExpenses: exp,
        dividendIncome: 0,
        employmentType: 'self-employed',
        taxRegion: 'ruk',
        studentLoanPlan: 'none',
        voluntaryClass2NI: false,
        marriageAllowance: false,
        blindPersonsAllowance: false,
        pensionContribution: 0,
      })
    return null
  }, [income, expenses])

  function calculate() {
    const inc = Number(income)
    const exp = Number(expenses || 0)
    if (isNaN(inc) || inc <= 0) {
      setError('Enter a valid income figure.')
      return
    }
    setError('')
    setResult(
      calculateTax({
        grossRevenue: inc,
        allowableExpenses: exp,
        dividendIncome: 0,
        employmentType: 'self-employed',
        taxRegion: 'ruk',
        studentLoanPlan: 'none',
        voluntaryClass2NI: false,
        marriageAllowance: false,
        blindPersonsAllowance: false,
        pensionContribution: 0,
      }),
    )
  }

  const display = result ?? preview

  const inputS: React.CSSProperties = {
    width: '100%',
    background: C.gray,
    border: `1px solid ${C.border}`,
    borderRadius: '4px',
    padding: '9px 11px',
    color: C.white,
    fontSize: '0.84rem',
    outline: 'none',
    fontFamily: 'var(--font-geist-mono), monospace',
    fontVariantNumeric: 'tabular-nums',
  }

  return (
    <div
      style={{
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: '6px',
        padding: '1.25rem',
        marginBottom: '2rem',
      }}
    >
      <div
        style={{
          color: C.white,
          fontSize: '0.85rem',
          fontWeight: 600,
          letterSpacing: '-0.01em',
          marginBottom: '1rem',
        }}
      >
        Quick Estimator
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '0.75rem',
          marginBottom: '0.75rem',
        }}
      >
        <label style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          <span
            style={{
              color: C.muted,
              fontSize: '0.65rem',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              fontWeight: 600,
            }}
          >
            Annual Revenue
          </span>
          <input
            value={income}
            onChange={(e) => setIncome(e.target.value)}
            type="number"
            min={0}
            placeholder="50000"
            style={inputS}
          />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          <span
            style={{
              color: C.muted,
              fontSize: '0.65rem',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              fontWeight: 600,
            }}
          >
            Allowable Expenses
          </span>
          <input
            value={expenses}
            onChange={(e) => setExpenses(e.target.value)}
            type="number"
            min={0}
            placeholder="8000"
            style={inputS}
          />
        </label>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
        <button
          onClick={calculate}
          style={{
            background: C.white,
            color: C.bg,
            border: 'none',
            borderRadius: '4px',
            padding: '8px 18px',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '0.8rem',
            letterSpacing: '-0.01em',
          }}
        >
          Calculate
        </button>
        {error && <span style={{ color: C.red, fontSize: '0.78rem' }}>{error}</span>}
        {display && !error && (
          <div
            style={{
              display: 'flex',
              gap: '1.5rem',
              fontFamily: 'var(--font-geist-mono), monospace',
              fontSize: '0.78rem',
            }}
          >
            <span style={{ color: C.muted }}>
              Tax due:{' '}
              <span style={{ color: C.white, fontWeight: 600 }}>
                £{display.incomeTax.toLocaleString('en-GB')}
              </span>
            </span>
            <span style={{ color: C.muted }}>
              Effective rate:{' '}
              <span style={{ color: C.white, fontWeight: 600 }}>{display.effectiveTaxRate}%</span>
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Nav tiles ────────────────────────────────────────────────────────────
const TILES = [
  {
    href: '/dashboard/tax',
    label: 'Tax Engine',
    Icon: Calculator,
    desc: 'HMRC-accurate 2026/27 · 5 scenarios',
  },
  {
    href: '/dashboard/expenses',
    label: 'Expenses',
    Icon: Receipt,
    desc: 'Track and categorise outgoings',
  },
  {
    href: '/dashboard/transactions',
    label: 'Ledger',
    Icon: BookOpen,
    desc: 'Income and payment history',
  },
  { href: '/dashboard/pnl', label: 'Reports', Icon: FileText, desc: 'P&L statement · MTD-ready' },
  {
    href: '/dashboard/currency',
    label: 'Currency',
    Icon: TrendingUp,
    desc: 'Live rates · 170+ currencies',
  },
  { href: '/dashboard/learn', label: 'Learn', Icon: GraduationCap, desc: 'UK tax literacy' },
  { href: '/dashboard/ai', label: 'Tax Advisory', Icon: Bot, desc: 'Ask any UK tax question' },
  {
    href: '/dashboard/settings',
    label: 'Settings',
    Icon: Settings,
    desc: 'Profile and preferences',
  },
]

function daysUntilYearEnd() {
  const end = new Date('2027-04-05')
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  end.setHours(0, 0, 0, 0)
  return Math.max(0, Math.ceil((end.getTime() - now.getTime()) / 86400000))
}

export default function DashboardUI({ displayName }: DashboardUIProps) {
  return (
    <div className="dashboard-page">
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <div
          style={{
            color: C.muted,
            fontSize: '0.62rem',
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
            marginBottom: '5px',
            fontFamily: 'var(--font-geist-mono), monospace',
          }}
        >
          overview
        </div>
        <h1
          style={{
            color: C.white,
            fontSize: 'clamp(1.4rem, 3vw, 1.9rem)',
            fontWeight: 600,
            letterSpacing: '-0.03em',
            margin: 0,
          }}
        >
          {displayName}
        </h1>
        <p style={{ color: C.muted, fontSize: '0.84rem', marginTop: '5px' }}>
          2026/27 fiscal year · {daysUntilYearEnd()} days remaining
        </p>
      </div>

      <MTDCalendar />
      <QuickEstimator />

      {/* Navigation tiles */}
      <div style={{ marginBottom: '0.75rem' }}>
        <div
          style={{
            color: C.muted,
            fontSize: '0.62rem',
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
            marginBottom: '0.75rem',
            fontFamily: 'var(--font-geist-mono), monospace',
          }}
        >
          modules
        </div>
      </div>
      <div className="dashboard-grid">
        {TILES.map(({ href, label, Icon, desc }) => (
          <Link key={href} href={href} className="dashboard-card">
            <Icon size={16} className="dashboard-icon" strokeWidth={1.5} />
            <div>
              <div className="dashboard-title">{label}</div>
              <div className="dashboard-desc">{desc}</div>
            </div>
          </Link>
        ))}
      </div>

      {/* Footer note */}
      <p
        style={{
          color: C.muted,
          fontSize: '0.65rem',
          marginTop: '2rem',
          fontFamily: 'var(--font-geist-mono), monospace',
        }}
      >
        HMRC-compliant · 2026/27 fiscal year · Tax calculations run client-side
      </p>
    </div>
  )
}
