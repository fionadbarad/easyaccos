'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import {
  Calculator,
  Receipt,
  ArrowLeftRight,
  GraduationCap,
  Bot,
  BarChart2,
  TrendingUp,
  Settings,
} from 'lucide-react'
import { calculateTax, TaxResult } from '@/lib/calculations'

type DashboardUIProps = {
  displayName: string
}

const C = {
  bg: '#020617',
  card: '#0F172A',
  gold: '#EAB308',
  text: '#E4D3B4',
  muted: 'rgba(228,211,180,0.55)',
}

const TILES = [
  { href: '/dashboard/tax', label: 'Tax Estimator', Icon: Calculator, desc: 'HMRC-accurate 2026/27 breakdown' },
  { href: '/dashboard/expenses', label: 'Expenses', Icon: Receipt, desc: 'Track & categorise outgoings' },
  { href: '/dashboard/transactions', label: 'Transactions', Icon: ArrowLeftRight, desc: 'Income and payment history' },
  { href: '/dashboard/pnl', label: 'P&L Report', Icon: BarChart2, desc: 'Profit & loss visualised' },
  { href: '/dashboard/currency', label: 'Currency', Icon: TrendingUp, desc: 'Live rates · 170+ currencies' },
  { href: '/dashboard/learn', label: 'Learn', Icon: GraduationCap, desc: 'UK tax literacy cards' },
  { href: '/dashboard/ai', label: 'AI Assistant', Icon: Bot, desc: 'Ask anything about UK tax' },
  { href: '/dashboard/settings', label: 'Settings', Icon: Settings, desc: 'Profile & preferences' },
]

export default function DashboardUI({ displayName }: DashboardUIProps) {
  const [income, setIncome] = useState('')
  const [expenses, setExpenses] = useState('')
  const [loading, setLoading] = useState(false)
  const [lastResult, setLastResult] = useState<TaxResult | null>(null)
  const [error, setError] = useState('')

  const parsedIncome = Number(income || 0)
  const parsedExpenses = Number(expenses || 0)

  const debouncedResult = useMemo(() => {
    if (isNaN(parsedIncome) || isNaN(parsedExpenses)) {
      return null
    }

    return calculateTax(parsedIncome, parsedExpenses)
  }, [parsedIncome, parsedExpenses])

  async function handleCalculate() {
    setError('')
    if (isNaN(parsedIncome) || isNaN(parsedExpenses)) {
      setError('Income and expenses must be valid numbers.')
      return
    }

    setLoading(true)
    try {
      const result = calculateTax(parsedIncome, parsedExpenses)
      setLastResult(result)
    } catch (err) {
      setError('Could not compute tax. Check values and retry.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="dashboard-page" style={{ background: C.bg }}>
      <div style={{ marginBottom: '2.5rem' }}>
        <p style={{ color: C.gold, fontSize: '0.7rem', letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
          Welcome back
        </p>
        <h1 style={{ fontFamily: 'var(--font-playfair)', color: C.text, fontSize: 'clamp(1.6rem, 4vw, 2.4rem)', fontWeight: 700, margin: 0 }}>
          {displayName}
        </h1>
        <p style={{ color: C.muted, fontSize: '0.875rem', marginTop: '0.4rem' }}>
          Your celestial financial sanctuary is ready.
        </p>
      </div>

      <div style={{ marginBottom: '2rem', padding: '1rem', background: '#111827', borderRadius: '10px' }}>
        <h2 style={{ color: C.text, marginBottom: '0.75rem' }}>Tax calculator (UK)</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
          <label style={{ color: C.muted, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            Annual income
            <input
              value={income}
              onChange={(e) => setIncome(e.target.value)}
              type="number"
              min={0}
              placeholder="e.g. 35000"
              style={{ padding: '0.6rem 0.75rem', borderRadius: '6px', border: '1px solid #36424E', background: '#0F1628', color: '#E5E7EB' }}
            />
          </label>
          <label style={{ color: C.muted, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            Allowable expenses
            <input
              value={expenses}
              onChange={(e) => setExpenses(e.target.value)}
              type="number"
              min={0}
              placeholder="e.g. 4300"
              style={{ padding: '0.6rem 0.75rem', borderRadius: '6px', border: '1px solid #36424E', background: '#0F1628', color: '#E5E7EB' }}
            />
          </label>
        </div>

        <button
          onClick={handleCalculate}
          style={{ background: C.gold, color: '#0B0F1A', border: 'none', borderRadius: '8px', padding: '0.6rem 1rem', cursor: 'pointer', fontWeight: 600 }}
        >
          {loading ? 'Calculating...' : 'Calculate tax'}
        </button>

        {error && (
          <p style={{ color: '#F87171', marginTop: '0.75rem' }}>
            {error}
          </p>
        )}

        {lastResult && (
          <div style={{ marginTop: '1rem', color: C.text }}>
            <p>Taxable income: £{lastResult.taxableIncome.toLocaleString()}</p>
            <p>Estimated tax due: £{lastResult.taxDue.toLocaleString()}</p>
            <p>Effective tax rate: {lastResult.effectiveRate}%</p>
          </div>
        )}

        {!lastResult && debouncedResult && !loading && !error && (
          <div style={{ marginTop: '1rem', color: '#E0E7FF' }}>
            <p>Preview:</p>
            <p>Taxable income (auto-calculating): £{debouncedResult.taxableIncome.toLocaleString()}</p>
            <p>Estimated tax due: £{debouncedResult.taxDue.toLocaleString()}</p>
          </div>
        )}
      </div>

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
