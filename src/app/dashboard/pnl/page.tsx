'use client'

import { useState } from 'react'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { Copy, CheckCheck, FileText, TrendingUp, TrendingDown } from 'lucide-react'
import { fmtGBP as fmt, fmtDecAbs as fmtDp } from '@/lib/formatters'
import { useUserData } from '@/lib/use-user-data'
import { TRANSACTIONS_SEED, type Transaction } from '@/lib/transactions/seed'
import { isCostOfSales } from '@/lib/transactions/cost-category'
import { buildMonthly, buildIncomeStatement, sa103Rows, toCsv } from '@/lib/pnl/statement'

import { C } from '@/styles/palette'
import { T } from '@/styles/type'
import { newId } from '@/lib/id'

// MTD ITSA mandation date for the >£50k turnover band. Rendered as a future
// deadline, or as "now mandatory" once passed (PL-5).
const MTD_ITSA_MANDATION = new Date('2026-04-06T00:00:00Z')

function ISLine({
  label = '',
  value,
  indent = 0,
  bold = false,
  separator = false,
  highlight = false,
  negative = false,
}: {
  label?: string
  value?: number
  indent?: number
  bold?: boolean
  separator?: boolean
  highlight?: boolean
  negative?: boolean
}) {
  if (separator) return <div style={{ borderTop: `1px solid ${C.border}`, margin: '5px 0' }} />
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: `${bold ? 9 : 6}px 0`,
        paddingLeft: `${indent * 16}px`,
        background: highlight ? 'rgba(244,245,248,0.03)' : 'transparent',
        borderRadius: highlight ? '3px' : 0,
      }}
    >
      <span
        style={{
          color: bold ? C.white : C.muted,
          fontSize: bold ? T.meta : T.caption,
          fontWeight: bold ? 600 : 400,
        }}
      >
        {label}
      </span>
      {value !== undefined && (
        <span
          style={{
            color: highlight ? C.white : negative ? C.red : bold ? C.white : C.muted,
            fontWeight: bold ? 600 : 400,
            fontSize: bold ? T.body : T.meta,
            fontFamily: 'var(--font-geist-mono), monospace',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {negative && value > 0 ? '(' : ''}
          {fmtDp(value)}
          {negative && value > 0 ? ')' : ''}
        </span>
      )}
    </div>
  )
}

const tooltipStyle = {
  background: '#1C1D20',
  border: `1px solid rgba(244,245,248,0.1)`,
  borderRadius: '4px',
  color: C.white,
  fontSize: T.caption,
}

type View = 'overview' | 'income-statement'

export default function PnLPage() {
  const { items: txs, persist } = useUserData<Transaction>(
    'user_transactions',
    'easyacco_transactions',
    TRANSACTIONS_SEED,
  )
  const [copied, setCopied] = useState(false)
  const [view, setView] = useState<View>('overview')
  const [cogsForm, setCogsForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    description: '',
    amount: '',
  })

  const monthly = buildMonthly(txs)
  const stmt = buildIncomeStatement(txs)
  const {
    totalRevenue,
    costOfSales,
    grossProfit,
    opEx,
    profitBeforeTax,
    netProfit,
    inferredCount,
    taxProvision,
    profitAfterTax,
    margin,
  } = stmt
  const cogsItems = txs.filter(isCostOfSales)
  const opExItems = txs.filter((t) => t.type === 'expense' && !isCostOfSales(t))

  async function addCogsEntry(e: React.FormEvent) {
    e.preventDefault()
    const amt = parseFloat(cogsForm.amount)
    if (!amt || !cogsForm.description.trim()) return
    // Previously this prefixed 'COGS — ' onto the description so the keyword
    // matcher would find it later — the classification lived in the prose. The
    // row now simply says what it is, and the user's wording is left alone.
    const next: Transaction[] = [
      {
        id: newId(),
        date: cogsForm.date,
        description: cogsForm.description.trim(),
        type: 'expense',
        amount: amt,
        reference: '',
        cost_category: 'cost_of_sales',
      },
      ...txs,
    ]
    await persist(next)
    setCogsForm({ date: new Date().toISOString().slice(0, 10), description: '', amount: '' })
  }

  function exportSA103CSV() {
    const csv = toCsv(sa103Rows(stmt, new Date()))
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `SA103-easyacco-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  function exportJSON() {
    const payload = {
      generated: new Date().toISOString(),
      fiscalYear: '2026/27',
      summary: {
        totalRevenue: Math.round(totalRevenue),
        costOfSales,
        grossProfit,
        opEx,
        profitBeforeTax,
        taxProvision: Math.round(taxProvision),
        profitAfterTax: Math.round(profitAfterTax),
      },
      monthlyBreakdown: monthly,
      transactions: txs,
    }
    navigator.clipboard
      .writeText(JSON.stringify(payload, null, 2))
      .then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2500)
      })
      .catch(() => alert('Clipboard access denied — check browser permissions.'))
  }

  const btnBase: React.CSSProperties = {
    padding: '7px 14px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: T.caption,
    fontWeight: 500,
    minHeight: '36px',
    transition: 'all 0.1s',
  }

  return (
    <div className="page-shell is-wide">
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}
      >
        <div>
          <div
            style={{
              color: C.muted,
              fontSize: T.micro,
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              marginBottom: '5px',
              fontFamily: 'var(--font-geist-mono), monospace',
            }}
          >
            reports
          </div>
          <h1
            style={{
              color: C.white,
              fontSize: T.h2,
              fontWeight: 600,
              letterSpacing: '-0.03em',
              margin: 0,
            }}
          >
            Financial Reports
          </h1>
          <p
            style={{
              color: C.muted,
              fontSize: T.caption,
              marginTop: '4px',
              fontFamily: 'var(--font-geist-mono), monospace',
            }}
          >
            2026/27 · GBP · estimate only
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          {(['overview', 'income-statement'] as View[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              style={{
                ...btnBase,
                background: view === v ? 'rgba(244,245,248,0.08)' : 'transparent',
                border: `1px solid ${view === v ? 'rgba(244,245,248,0.2)' : C.border}`,
                color: view === v ? C.white : C.muted,
              }}
            >
              {v === 'overview' ? 'Overview' : 'Income Statement'}
            </button>
          ))}
          <button
            onClick={exportJSON}
            style={{
              ...btnBase,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: copied ? 'rgba(74,222,128,0.08)' : C.surface,
              border: `1px solid ${copied ? 'rgba(74,222,128,0.25)' : C.border}`,
              color: copied ? C.green : C.muted,
            }}
          >
            {copied ? <CheckCheck size={12} /> : <Copy size={12} />}
            {copied ? 'Copied' : 'Export JSON'}
          </button>
          <button
            onClick={exportSA103CSV}
            title="SA103 self-assessment pre-fill CSV"
            style={{
              ...btnBase,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: C.surface,
              border: `1px solid ${C.border}`,
              color: C.muted,
            }}
          >
            <FileText size={12} /> Export SA103 CSV
          </button>
        </div>
      </div>

      {/* MTD Alert */}
      {totalRevenue >= 50_000 && (
        <div
          style={{
            background: 'rgba(251,191,36,0.06)',
            border: '1px solid rgba(251,191,36,0.2)',
            borderRadius: '4px',
            padding: '0.8rem 1rem',
            marginBottom: '1.5rem',
            display: 'flex',
            gap: '0.65rem',
            alignItems: 'flex-start',
          }}
        >
          <span
            style={{
              color: C.amber,
              fontSize: T.caption,
              fontWeight: 700,
              fontFamily: 'var(--font-geist-mono), monospace',
              flexShrink: 0,
            }}
          >
            MTD
          </span>
          <div>
            <span style={{ color: C.amber, fontWeight: 600, fontSize: T.meta }}>
              Making Tax Digital — registration required
            </span>
            <p style={{ color: C.muted, fontSize: T.caption, margin: '2px 0 0', lineHeight: 1.5 }}>
              Turnover exceeds{' '}
              <span style={{ color: C.white, fontFamily: 'var(--font-geist-mono), monospace' }}>
                £50,000
              </span>
              .{' '}
              {MTD_ITSA_MANDATION > new Date() ? (
                <>
                  Register for MTD ITSA before{' '}
                  <span style={{ color: C.white }}>
                    {MTD_ITSA_MANDATION.toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </span>
                  .
                </>
              ) : (
                <>
                  MTD ITSA is now <span style={{ color: C.white }}>mandatory</span> at this turnover
                  — register with HMRC.
                </>
              )}
            </p>
          </div>
        </div>
      )}

      {/* ── OVERVIEW ── */}
      {view === 'overview' && (
        <>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit,minmax(165px,1fr))',
              gap: '1px',
              border: `1px solid ${C.border}`,
              borderRadius: '6px',
              overflow: 'hidden',
              background: C.border,
              marginBottom: '1.5rem',
            }}
          >
            {[
              { label: 'Total Revenue', value: fmt(totalRevenue), trend: 'up' as const },
              { label: 'Total Expenses', value: fmt(opEx + costOfSales), trend: 'down' as const },
              { label: 'Net Profit', value: fmt(netProfit), sub: `${margin.toFixed(1)}% margin` },
              {
                label: 'Tax Provision',
                value: fmt(taxProvision),
                sub: 'estimated 2026/27 liability',
              },
              { label: 'Profit After Tax', value: fmt(profitAfterTax) },
            ].map((s) => (
              <div key={s.label} style={{ background: C.surface, padding: '1rem 1.15rem' }}>
                <div
                  style={{
                    color: C.muted,
                    fontSize: T.micro,
                    textTransform: 'uppercase',
                    letterSpacing: '0.07em',
                    fontWeight: 600,
                    marginBottom: '5px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  {s.trend === 'up' && <TrendingUp size={12} style={{ color: C.green }} />}
                  {s.trend === 'down' && <TrendingDown size={12} style={{ color: C.red }} />}
                  {s.label}
                </div>
                <div
                  style={{
                    color: C.white,
                    fontWeight: 600,
                    fontSize: T.title,
                    letterSpacing: '-0.02em',
                    fontFamily: 'var(--font-geist-mono), monospace',
                  }}
                >
                  {s.value}
                </div>
                {s.sub && (
                  <div style={{ color: C.muted, fontSize: T.micro, marginTop: '2px' }}>{s.sub}</div>
                )}
              </div>
            ))}
          </div>

          <div
            style={{
              background: C.surface,
              border: `1px solid ${C.border}`,
              borderRadius: '6px',
              padding: '1.25rem',
              marginBottom: '1rem',
            }}
          >
            <h2
              style={{
                color: C.white,
                fontSize: T.body,
                fontWeight: 600,
                letterSpacing: '-0.01em',
                marginBottom: '1.1rem',
              }}
            >
              Income vs Expenses — Monthly
            </h2>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={monthly} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={C.white} stopOpacity={0.15} />
                    <stop offset="95%" stopColor={C.white} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={C.red} stopOpacity={0.15} />
                    <stop offset="95%" stopColor={C.red} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(244,245,248,0.05)" />
                <XAxis
                  dataKey="month"
                  tick={{ fill: C.muted, fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: C.muted, fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `£${(Number(v) / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value) => (typeof value === 'number' ? fmt(value) : value)}
                />
                <Legend wrapperStyle={{ fontSize: T.caption, color: C.muted }} />
                <Area
                  type="monotone"
                  dataKey="income"
                  name="Income"
                  stroke={C.white}
                  strokeWidth={1.5}
                  fill="url(#incomeGrad)"
                />
                <Area
                  type="monotone"
                  dataKey="expenses"
                  name="Expenses"
                  stroke={C.red}
                  strokeWidth={1.5}
                  fill="url(#expGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div
            style={{
              background: C.surface,
              border: `1px solid ${C.border}`,
              borderRadius: '6px',
              padding: '1.25rem',
            }}
          >
            <h2
              style={{
                color: C.white,
                fontSize: T.body,
                fontWeight: 600,
                letterSpacing: '-0.01em',
                marginBottom: '1.1rem',
              }}
            >
              Monthly Net Profit
            </h2>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={monthly} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(244,245,248,0.05)" />
                <XAxis
                  dataKey="month"
                  tick={{ fill: C.muted, fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: C.muted, fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `£${(Number(v) / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value) => (typeof value === 'number' ? fmt(value) : value)}
                />
                <Bar
                  dataKey="profit"
                  name="Net Profit"
                  fill={C.white}
                  fillOpacity={0.85}
                  radius={[2, 2, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      {/* ── INCOME STATEMENT ── */}
      {view === 'income-statement' && (
        <div
          style={{
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: '6px',
            padding: '1.75rem',
            maxWidth: '580px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.65rem',
              marginBottom: '1.5rem',
            }}
          >
            <FileText size={16} style={{ color: C.muted }} strokeWidth={1.5} />
            <div>
              <h2
                style={{
                  color: C.white,
                  fontSize: T.lead,
                  fontWeight: 600,
                  letterSpacing: '-0.02em',
                  margin: 0,
                }}
              >
                Income Statement (P&amp;L)
              </h2>
              <p
                style={{
                  color: C.muted,
                  fontSize: T.micro,
                  margin: 0,
                  fontFamily: 'var(--font-geist-mono), monospace',
                }}
              >
                Period ending 5 April 2027 · 2026/27 Fiscal Year
              </p>
            </div>
          </div>

          <ISLine label="REVENUE" bold />
          <ISLine label="Client Income / Sales" value={totalRevenue} indent={1} />
          <ISLine label="Total Revenue" value={totalRevenue} bold highlight />
          <ISLine separator />

          <ISLine label="COST OF SALES" bold />
          {cogsItems.length === 0 ? (
            <ISLine
              label="Direct Materials / Subcontractors"
              value={costOfSales}
              indent={1}
              negative
            />
          ) : (
            cogsItems
              .slice(0, 6)
              .map((t) => (
                <ISLine key={t.id} label={t.description} value={t.amount} indent={1} negative />
              ))
          )}
          {cogsItems.length > 6 && (
            <ISLine label={`+ ${cogsItems.length - 6} more items`} indent={1} />
          )}
          <ISLine label="Total Cost of Sales" value={costOfSales} bold negative />
          {inferredCount > 0 && (
            <div
              style={{
                color: C.muted,
                fontSize: T.micro,
                lineHeight: 1.5,
                padding: '6px 0 0',
              }}
            >
              {inferredCount} older {inferredCount === 1 ? 'expense has' : 'expenses have'} no cost
              type set, so {inferredCount === 1 ? 'it is' : 'they are'} still classified from the
              description. Set the cost type on the Transactions page to make this exact.
            </div>
          )}

          <form
            onSubmit={addCogsEntry}
            style={{
              display: 'grid',
              gridTemplateColumns: 'auto 1fr 110px auto',
              gap: '6px',
              alignItems: 'center',
              margin: '10px 0 4px',
              paddingLeft: '16px',
            }}
          >
            <input
              type="date"
              value={cogsForm.date}
              onChange={(e) => setCogsForm((f) => ({ ...f, date: e.target.value }))}
              style={{
                background: C.gray,
                border: `1px solid ${C.border}`,
                borderRadius: '3px',
                padding: '6px 8px',
                color: C.white,
                fontSize: T.caption,
                fontFamily: 'var(--font-geist-mono), monospace',
                outline: 'none',
              }}
            />
            <input
              type="text"
              value={cogsForm.description}
              placeholder="e.g. Raw materials — steel"
              onChange={(e) => setCogsForm((f) => ({ ...f, description: e.target.value }))}
              style={{
                background: C.gray,
                border: `1px solid ${C.border}`,
                borderRadius: '3px',
                padding: '6px 8px',
                color: C.white,
                fontSize: T.caption,
                outline: 'none',
              }}
            />
            <input
              type="number"
              min={0}
              step={0.01}
              value={cogsForm.amount}
              placeholder="0.00"
              onChange={(e) => setCogsForm((f) => ({ ...f, amount: e.target.value }))}
              style={{
                background: C.gray,
                border: `1px solid ${C.border}`,
                borderRadius: '3px',
                padding: '6px 8px',
                color: C.white,
                fontSize: T.caption,
                textAlign: 'right',
                fontFamily: 'var(--font-geist-mono), monospace',
                outline: 'none',
              }}
            />
            <button
              type="submit"
              style={{
                background: C.white,
                color: C.bg,
                border: 'none',
                borderRadius: '3px',
                padding: '6px 12px',
                fontSize: T.caption,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              + COGS
            </button>
          </form>
          <ISLine separator />

          <ISLine label="GROSS PROFIT" value={grossProfit} bold highlight />
          <ISLine
            label={`Gross Margin: ${totalRevenue > 0 ? ((grossProfit / totalRevenue) * 100).toFixed(1) : 0}%`}
            indent={1}
          />
          <ISLine separator />

          <ISLine label="OPERATING EXPENSES" bold />
          {opExItems.slice(0, 6).map((t) => (
            <ISLine key={t.id} label={t.description} value={t.amount} indent={1} negative />
          ))}
          {opExItems.length > 6 && (
            <ISLine label={`+ ${opExItems.length - 6} more items`} indent={1} />
          )}
          <ISLine label="Total OpEx" value={opEx} bold negative />
          <ISLine separator />

          <ISLine label="PROFIT BEFORE TAX" value={profitBeforeTax} bold highlight />
          <ISLine separator />

          <ISLine label="TAX PROVISION" bold />
          <ISLine label="Income Tax (2026/27)" value={stmt.incomeTax} indent={1} negative />
          <ISLine
            label="National Insurance (Class 4)"
            value={stmt.nationalInsurance}
            indent={1}
            negative
          />
          <ISLine label="Total Tax Provision" value={taxProvision} bold negative />
          <ISLine separator />

          <div
            style={{
              background: 'rgba(244,245,248,0.04)',
              border: `1px solid ${C.border}`,
              borderRadius: '4px',
              padding: '0.9rem 1rem',
              marginTop: '0.25rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span
                style={{
                  color: C.white,
                  fontWeight: 600,
                  fontSize: T.body,
                  letterSpacing: '-0.01em',
                }}
              >
                NET PROFIT AFTER TAX
              </span>
              <span
                style={{
                  color: profitAfterTax >= 0 ? C.white : C.red,
                  fontWeight: 600,
                  fontSize: T.lead,
                  fontFamily: 'var(--font-geist-mono), monospace',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {fmtDp(profitAfterTax)}
              </span>
            </div>
            <div
              style={{
                color: C.muted,
                fontSize: T.micro,
                marginTop: '4px',
                fontFamily: 'var(--font-geist-mono), monospace',
              }}
            >
              2026/27 estimate · not a substitute for professional advice
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
