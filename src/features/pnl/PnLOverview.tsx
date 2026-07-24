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
import { TrendingUp, TrendingDown } from 'lucide-react'
import { fmtGBP as fmt } from '@/lib/formatters'
import { C } from '@/styles/palette'
import type { MonthlyPoint, PnLFigures } from './calc'

const tooltipStyle = {
  background: '#1C1D20',
  border: `1px solid rgba(244,245,248,0.1)`,
  borderRadius: '4px',
  color: C.white,
  fontSize: '0.75rem',
}

export function PnLOverview({
  figures,
  monthly,
  taxProvision,
  profitAfterTax,
}: {
  figures: PnLFigures
  monthly: MonthlyPoint[]
  taxProvision: number
  profitAfterTax: number
}) {
  const { totalRevenue, costOfSales, opEx, netProfit, margin } = figures

  const stats = [
    { label: 'Total Revenue', value: fmt(totalRevenue), trend: 'up' as const },
    { label: 'Total Expenses', value: fmt(opEx + costOfSales), trend: 'down' as const },
    { label: 'Net Profit', value: fmt(netProfit), sub: `${margin.toFixed(1)}% margin` },
    { label: 'Tax Provision', value: fmt(taxProvision), sub: '2026/27 HMRC liability' },
    { label: 'Profit After Tax', value: fmt(profitAfterTax) },
  ]

  return (
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
        {stats.map((s) => (
          <div key={s.label} style={{ background: C.surface, padding: '1rem 1.15rem' }}>
            <div
              style={{
                color: C.muted,
                fontSize: '0.63rem',
                textTransform: 'uppercase',
                letterSpacing: '0.07em',
                fontWeight: 600,
                marginBottom: '5px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              {s.trend === 'up' && <TrendingUp size={9} style={{ color: C.green }} />}
              {s.trend === 'down' && <TrendingDown size={9} style={{ color: C.red }} />}
              {s.label}
            </div>
            <div
              style={{
                color: C.white,
                fontWeight: 600,
                fontSize: '1.1rem',
                letterSpacing: '-0.02em',
                fontFamily: 'var(--font-geist-mono), monospace',
              }}
            >
              {s.value}
            </div>
            {s.sub && (
              <div style={{ color: C.muted, fontSize: '0.68rem', marginTop: '2px' }}>{s.sub}</div>
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
            fontSize: '0.85rem',
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
              tick={{ fill: C.muted, fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: C.muted, fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `£${(Number(v) / 1000).toFixed(0)}k`}
            />
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(value) => (typeof value === 'number' ? fmt(value) : value)}
            />
            <Legend wrapperStyle={{ fontSize: '0.75rem', color: C.muted }} />
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
            fontSize: '0.85rem',
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
              tick={{ fill: C.muted, fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: C.muted, fontSize: 10 }}
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
  )
}
