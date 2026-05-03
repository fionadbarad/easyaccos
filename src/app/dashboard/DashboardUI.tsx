'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import {
  Calculator, Receipt, ArrowLeftRight,
  GraduationCap, Bot, BarChart2,
  TrendingUp, Settings, BookOpen, FileText,
  AlertCircle, CheckCircle2, Clock,
} from 'lucide-react'
import { calculateTax } from '@/lib/tax-engine'
import type { TaxResult } from '@/lib/tax-engine'

type DashboardUIProps = { displayName: string }

// ── MTD 2026/27 Quarterly Calendar ────────────────────────────────────────
const MTD_QUARTERS = [
  { label: 'Q1', period: '6 Apr – 5 Jul 2026',  deadline: '2026-08-07', display: '7 Aug 2026' },
  { label: 'Q2', period: '6 Jul – 5 Oct 2026',  deadline: '2026-11-07', display: '7 Nov 2026' },
  { label: 'Q3', period: '6 Oct – 5 Jan 2027',  deadline: '2027-02-07', display: '7 Feb 2027' },
  { label: 'Q4', period: '6 Jan – 5 Apr 2027',  deadline: '2027-05-07', display: '7 May 2027' },
  { label: 'Final', period: 'Full Year 2026/27', deadline: '2028-01-31', display: '31 Jan 2028' },
]

function getQuarterStatus(deadlineStr: string, today: Date) {
  const deadline = new Date(deadlineStr)
  const diffDays = Math.ceil((deadline.getTime() - today.getTime()) / 86400000)
  if (diffDays < 0)   return { status: 'past',    color: 'rgba(244,245,248,0.42)',  Icon: CheckCircle2 }
  if (diffDays <= 14) return { status: 'urgent',  color: '#F87171',    Icon: AlertCircle }
  if (diffDays <= 45) return { status: 'upcoming',color: '#FBBF24',  Icon: Clock }
  return               { status: 'future',   color: 'rgba(244,245,248,0.42)',  Icon: Clock }
}

function MTDCalendar() {
  const today = new Date()
  return (
    <div className="bg-[#1C1D20] border border-[rgba(244,245,248,0.07)] rounded-[6px] overflow-hidden mb-[2rem]">
      <div className="px-[1.25rem] py-[1rem] border-b border-[rgba(244,245,248,0.07)] flex items-center justify-between">
        <div>
          <div className="text-[#F4F5F8] text-[0.85rem] font-semibold tracking-[-0.01em]">MTD Filing Calendar</div>
          <div className="text-[rgba(244,245,248,0.42)] text-[0.7rem] mt-[2px] font-mono">Making Tax Digital · ITSA 2026/27</div>
        </div>
        <span className="bg-[#222326] text-[#F4F5F8] text-[0.6rem] font-semibold px-[8px] py-[3px] rounded-[3px] tracking-[0.07em] font-mono">ACTIVE</span>
      </div>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))]">
        {MTD_QUARTERS.map((q, i) => {
          const { status, color, Icon } = getQuarterStatus(q.deadline, today)
          const isActive = status === 'upcoming' || status === 'urgent'
          return (
            <div key={q.label} className={`px-[1.25rem] py-[1rem]${i < MTD_QUARTERS.length - 1 ? ' border-r border-[rgba(244,245,248,0.07)]' : ''}${isActive ? ' bg-[rgba(244,245,248,0.025)]' : ' bg-transparent'}`}>
              <div className="flex items-center gap-[6px] mb-[6px]">
                <Icon size={12} style={{ color }} />
                <span className="text-[0.6rem] font-bold tracking-[0.08em] font-mono uppercase" style={{ color }}>{q.label}</span>
              </div>
              <div className={`text-[0.72rem] font-medium mb-[3px]${status === 'past' ? ' text-[rgba(244,245,248,0.42)]' : ' text-[#F4F5F8]'}`}>{q.display}</div>
              <div className="text-[rgba(244,245,248,0.42)] text-[0.65rem] leading-[1.4]">{q.period}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Quick Estimator ──────────────────────────────────────────────────────
function QuickEstimator() {
  const [income, setIncome]     = useState('')
  const [expenses, setExpenses] = useState('')
  const [result, setResult]     = useState<TaxResult | null>(null)
  const [error, setError]       = useState('')

  const preview = useMemo(() => {
    const inc = Number(income || 0)
    const exp = Number(expenses || 0)
    if (!isNaN(inc) && !isNaN(exp) && inc > 0) return calculateTax({
      grossRevenue: inc, allowableExpenses: exp, dividendIncome: 0,
      employmentType: 'self-employed', taxRegion: 'ruk', studentLoanPlan: 'none',
      voluntaryClass2NI: false, marriageAllowance: false,
      blindPersonsAllowance: false, pensionContribution: 0,
    })
    return null
  }, [income, expenses])

  function calculate() {
    const inc = Number(income)
    const exp = Number(expenses || 0)
    if (isNaN(inc) || inc <= 0) { setError('Enter a valid income figure.'); return }
    setError('')
    setResult(calculateTax({
      grossRevenue: inc, allowableExpenses: exp, dividendIncome: 0,
      employmentType: 'self-employed', taxRegion: 'ruk', studentLoanPlan: 'none',
      voluntaryClass2NI: false, marriageAllowance: false,
      blindPersonsAllowance: false, pensionContribution: 0,
    }))
  }

  const display = result ?? preview

  return (
    <div className="bg-[#1C1D20] border border-[rgba(244,245,248,0.07)] rounded-[6px] p-[1.25rem] mb-[2rem]">
      <div className="text-[#F4F5F8] text-[0.85rem] font-semibold tracking-[-0.01em] mb-[1rem]">Quick Estimator</div>
      <div className="grid grid-cols-[1fr_1fr] gap-[0.75rem] mb-[0.75rem]">
        <label className="flex flex-col gap-[5px]">
          <span className="text-[rgba(244,245,248,0.42)] text-[0.65rem] uppercase tracking-[0.08em] font-semibold">Annual Revenue</span>
          <input value={income} onChange={(e) => setIncome(e.target.value)} type="number" min={0} placeholder="50000"
            className="w-full bg-[#222326] border border-[rgba(244,245,248,0.07)] rounded-[4px] px-[11px] py-[9px] text-[#F4F5F8] text-[0.84rem] outline-none font-mono tabular-nums" />
        </label>
        <label className="flex flex-col gap-[5px]">
          <span className="text-[rgba(244,245,248,0.42)] text-[0.65rem] uppercase tracking-[0.08em] font-semibold">Allowable Expenses</span>
          <input value={expenses} onChange={(e) => setExpenses(e.target.value)} type="number" min={0} placeholder="8000"
            className="w-full bg-[#222326] border border-[rgba(244,245,248,0.07)] rounded-[4px] px-[11px] py-[9px] text-[#F4F5F8] text-[0.84rem] outline-none font-mono tabular-nums" />
        </label>
      </div>
      <div className="flex items-center gap-[0.75rem] flex-wrap">
        <button onClick={calculate}
          className="bg-[#F4F5F8] text-[#181818] border-none rounded-[4px] px-[18px] py-[8px] cursor-pointer font-semibold text-[0.8rem] tracking-[-0.01em]">
          Calculate
        </button>
        {error && <span className="text-[#F87171] text-[0.78rem]">{error}</span>}
        {display && !error && (
          <div className="flex gap-[1.5rem] font-mono text-[0.78rem]">
            <span className="text-[rgba(244,245,248,0.42)]">Tax due: <span className="text-[#F4F5F8] font-semibold">£{display.incomeTax.toLocaleString('en-GB')}</span></span>
            <span className="text-[rgba(244,245,248,0.42)]">Effective rate: <span className="text-[#F4F5F8] font-semibold">{display.effectiveTaxRate}%</span></span>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Nav tiles ────────────────────────────────────────────────────────────
const TILES = [
  { href: '/dashboard/tax',          label: 'Tax Engine',       Icon: Calculator,     desc: 'HMRC-accurate 2026/27 · 5 scenarios' },
  { href: '/dashboard/expenses',     label: 'Expenses',         Icon: Receipt,        desc: 'Track and categorise outgoings' },
  { href: '/dashboard/transactions', label: 'Ledger',           Icon: BookOpen,       desc: 'Income and payment history' },
  { href: '/dashboard/pnl',          label: 'Reports',          Icon: FileText,       desc: 'P&L statement · MTD-ready' },
  { href: '/dashboard/currency',     label: 'Currency',         Icon: TrendingUp,     desc: 'Live rates · 170+ currencies' },
  { href: '/dashboard/learn',        label: 'Learn',            Icon: GraduationCap,  desc: 'UK tax literacy' },
  { href: '/dashboard/ai',           label: 'Tax Advisory',     Icon: Bot,            desc: 'Ask any UK tax question' },
  { href: '/dashboard/settings',     label: 'Settings',         Icon: Settings,       desc: 'Profile and preferences' },
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
      <div className="mb-[2rem]">
        <div className="text-[rgba(244,245,248,0.42)] text-[0.62rem] uppercase tracking-[0.12em] mb-[5px] font-mono">
          overview
        </div>
        <h1 className="text-[#F4F5F8] text-[clamp(1.4rem,3vw,1.9rem)] font-semibold tracking-[-0.03em] m-0">
          {displayName}
        </h1>
        <p className="text-[rgba(244,245,248,0.42)] text-[0.84rem] mt-[5px]">
          2026/27 fiscal year · {daysUntilYearEnd()} days remaining
        </p>
      </div>

      <MTDCalendar />
      <QuickEstimator />

      {/* Navigation tiles */}
      <div className="mb-[0.75rem]">
        <div className="text-[rgba(244,245,248,0.42)] text-[0.62rem] uppercase tracking-[0.12em] mb-[0.75rem] font-mono">modules</div>
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
      <p className="text-[rgba(244,245,248,0.42)] text-[0.65rem] mt-[2rem] font-mono">
        HMRC-compliant · 2026/27 fiscal year · Tax calculations run client-side
      </p>
    </div>
  )
}
