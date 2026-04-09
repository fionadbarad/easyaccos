'use client'

import Link from 'next/link'
import { useState } from 'react'
import {
  Calculator,
  Receipt,
  ArrowLeftRight,
  GraduationCap,
  Bot,
  BarChart2,
  TrendingUp,
  Settings,
  ArrowRight,
} from 'lucide-react'
import { calculateTax } from '@/lib/tax-logic'

type DashboardUIProps = {
  displayName: string
}

const C = {
  bg:     '#020617',
  card:   '#111827',
  gold:   '#EAB308',
  text:   '#E5E7EB',
  muted:  'rgba(229,231,235,0.55)',
  border: 'rgba(234,179,8,0.18)',
}

const TILES = [
  { href: '/dashboard/tax',          label: 'Tax Estimator',   Icon: Calculator,     desc: 'HMRC-accurate 2026/27 breakdown' },
  { href: '/dashboard/expenses',     label: 'Expenses',        Icon: Receipt,        desc: 'Track & categorise outgoings'    },
  { href: '/dashboard/transactions', label: 'Transactions',    Icon: ArrowLeftRight, desc: 'Income and payment history'      },
  { href: '/dashboard/pnl',          label: 'P&L Report',      Icon: BarChart2,      desc: 'Profit & loss visualised'        },
  { href: '/dashboard/currency',     label: 'Currency',        Icon: TrendingUp,     desc: 'Live rates · 170+ currencies'   },
  { href: '/dashboard/learn',        label: 'Learn',           Icon: GraduationCap,  desc: 'UK tax literacy cards'           },
  { href: '/dashboard/ai',           label: 'AI Assistant',    Icon: Bot,            desc: 'Ask anything about UK tax'      },
  { href: '/dashboard/settings',     label: 'Settings',        Icon: Settings,       desc: 'Profile & preferences'           },
]

// ─── Quick Estimate widget — uses the real 2026/27 engine (tax-logic.ts) ────
function QuickEstimate() {
  const [income,   setIncome]   = useState('35000')
  const [expenses, setExpenses] = useState('0')

  const gross = Math.max(0, Number(income)   || 0)
  const exp   = Math.max(0, Number(expenses) || 0)

  const result = (() => {
    try {
      return calculateTax({
        grossRevenue:          gross,
        allowableExpenses:     exp,
        dividendIncome:        0,
        employmentType:        'self-employed',
        taxRegion:             'ruk',
        studentLoanPlan:       'none',
        voluntaryClass2NI:     false,
        marriageAllowance:     false,
        blindPersonsAllowance: false,
        pensionContribution:   0,
      })
    } catch { return null }
  })()

  const inp: React.CSSProperties = {
    width: '100%', background: '#050816', border: `1px solid ${C.border}`,
    borderRadius: '6px', padding: '9px 12px', color: C.text,
    fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box',
  }

  return (
    <div style={{
      background: C.card, border: `1px solid ${C.border}`,
      borderRadius: '10px', padding: '1.5rem', marginBottom: '2rem',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <p style={{ color: C.gold, fontSize: '0.65rem', letterSpacing: '0.15em', textTransform: 'uppercase', margin: 0, marginBottom: '2px' }}>
            Quick Estimate · 2026/27
          </p>
          <h2 style={{ color: C.text, fontSize: '1rem', fontWeight: 700, margin: 0 }}>Live Tax Snapshot</h2>
        </div>
        <Link href="/dashboard/tax"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: C.gold, textDecoration: 'none', fontSize: '0.78rem', fontWeight: 600 }}>
          Full calculator <ArrowRight size={13} />
        </Link>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ color: C.muted, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Gross Revenue</span>
          <input type="number" min={0} value={income}   onChange={(e) => setIncome(e.target.value)}   style={inp} />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ color: C.muted, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Allowable Expenses</span>
          <input type="number" min={0} value={expenses} onChange={(e) => setExpenses(e.target.value)} style={inp} />
        </label>
      </div>

      {result && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '0.65rem' }}>
          {[
            { label: 'Net Profit',     value: `£${result.grossProfit.toLocaleString('en-GB')}` },
            { label: 'Income Tax',     value: `£${result.incomeTax.toLocaleString('en-GB')}` },
            { label: 'NI Class 4',     value: `£${result.niClass4.toLocaleString('en-GB')}` },
            { label: 'Take-Home',      value: `£${result.netTakeHome.toLocaleString('en-GB')}`, highlight: true },
            { label: 'Effective Rate', value: `${result.effectiveTaxRate.toFixed(1)}%` },
          ].map(({ label, value, highlight }) => (
            <div key={label} style={{
              background: highlight ? 'rgba(234,179,8,0.08)' : 'rgba(255,255,255,0.03)',
              border: `1px solid ${highlight ? 'rgba(234,179,8,0.3)' : C.border}`,
              borderRadius: '6px', padding: '0.75rem 1rem',
            }}>
              <div style={{ color: C.muted, fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>
                {label}
              </div>
              <div style={{ color: highlight ? C.gold : C.text, fontWeight: 700, fontSize: '0.9rem', fontFamily: 'monospace' }}>
                {value}
              </div>
            </div>
          ))}
        </div>
      )}

      {result?.sixtyPercentTrap && (
        <div style={{ marginTop: '0.75rem', padding: '0.6rem 0.9rem', background: 'rgba(251,146,60,0.08)', border: '1px solid rgba(251,146,60,0.35)', borderRadius: '6px', color: '#FB923C', fontSize: '0.78rem' }}>
          ⚠ 60% Tax Trap — income £100k–£125,140. Pension contributions can escape this.
        </div>
      )}
      {result?.mtdWarning && (
        <div style={{ marginTop: '0.5rem', padding: '0.6rem 0.9rem', background: 'rgba(234,179,8,0.06)', border: '1px solid rgba(234,179,8,0.28)', borderRadius: '6px', color: C.gold, fontSize: '0.78rem' }}>
          ⚡ MTD — turnover over £50,000. Register for Making Tax Digital by 6 April 2026.
        </div>
      )}
    </div>
  )
}

export default function DashboardUI({ displayName }: DashboardUIProps) {
  return (
    <div className="dashboard-page" style={{ background: C.bg }}>
      <div style={{ marginBottom: '2rem' }}>
        <p style={{ color: C.gold, fontSize: '0.65rem', letterSpacing: '0.18em', textTransform: 'uppercase', margin: '0 0 2px' }}>
          Welcome back
        </p>
        <h1 style={{ fontFamily: 'var(--font-playfair)', color: C.text, fontSize: 'clamp(1.6rem, 4vw, 2.4rem)', fontWeight: 700, margin: '0 0 4px' }}>
          {displayName}
        </h1>
        <p style={{ color: C.muted, fontSize: '0.875rem', margin: 0 }}>
          2026/27 fiscal engine · all features active
        </p>
      </div>

      <QuickEstimate />

      <div className="dashboard-grid">
        {TILES.map(({ href, label, Icon, desc }) => (
          <Link key={href} href={href} className="dashboard-card">
            <Icon size={22} className="dashboard-icon" />
            <div>
              <div className="dashboard-title">{label}</div>
              <div className="dashboard-desc">{desc}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
