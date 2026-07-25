'use client'

import { useState, useMemo } from 'react'
import {
  Plus,
  Trash2,
  ArrowUpCircle,
  ArrowDownCircle,
  Calendar,
  Cloud,
  CloudOff,
} from 'lucide-react'
import { useUserData } from '@/lib/use-user-data'
import { fmtDecAbs as fmt } from '@/lib/formatters'
import { TRANSACTIONS_SEED, type Transaction, type TxType } from '@/lib/transactions/seed'

import { C } from '@/styles/palette'
type DateFilter = 'all' | 'today' | 'month' | 'custom'

const inputStyle: React.CSSProperties = {
  background: C.gray,
  border: `1px solid ${C.border}`,
  borderRadius: '4px',
  padding: '9px 11px',
  color: C.white,
  fontSize: '0.84rem',
  outline: 'none',
  boxSizing: 'border-box',
  width: '100%',
  minHeight: '40px',
  fontFamily: 'var(--font-geist-mono), monospace',
  fontVariantNumeric: 'tabular-nums',
}
const labelStyle: React.CSSProperties = {
  display: 'block',
  color: C.muted,
  fontSize: '0.62rem',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  marginBottom: '4px',
  fontWeight: 600,
}

function toISODate(d: Date) {
  return d.toISOString().slice(0, 10)
}

function isToday(dateStr: string) {
  return dateStr === toISODate(new Date())
}
function isThisMonth(dateStr: string) {
  const now = new Date(),
    d = new Date(dateStr)
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
}

const DATE_LABELS: Record<DateFilter, string> = {
  all: 'All time',
  today: 'Today',
  month: 'This month',
  custom: 'Custom',
}

export default function TransactionsPage() {
  const {
    items: txs,
    persist,
    loading,
    isAuthenticated,
  } = useUserData<Transaction>('user_transactions', 'easyacco_transactions', TRANSACTIONS_SEED)
  const [typeFilter, setType] = useState<TxType | 'all'>('all')
  const [dateFilter, setDate] = useState<DateFilter>('all')
  const [customFrom, setFrom] = useState('')
  const [customTo, setTo] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    date: toISODate(new Date()),
    description: '',
    type: 'income' as TxType,
    amount: '',
    reference: '',
  })

  async function add(e: React.FormEvent) {
    e.preventDefault()
    const amount = parseFloat(form.amount)
    if (!amount || !form.description.trim()) return
    await persist([{ id: crypto.randomUUID(), ...form, amount }, ...txs])
    setForm((f) => ({ ...f, description: '', amount: '', reference: '' }))
    setShowForm(false)
  }

  async function remove(id: string) {
    await persist(txs.filter((t) => t.id !== id))
  }

  const visible = useMemo(
    () =>
      txs
        .filter((t) => typeFilter === 'all' || t.type === typeFilter)
        .filter((t) => {
          if (dateFilter === 'today') return isToday(t.date)
          if (dateFilter === 'month') return isThisMonth(t.date)
          if (dateFilter === 'custom' && customFrom && customTo)
            return t.date >= customFrom && t.date <= customTo
          return true
        })
        .sort((a, b) => b.date.localeCompare(a.date)),
    [txs, typeFilter, dateFilter, customFrom, customTo],
  )

  const totalIn = visible.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const totalOut = visible.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  const net = totalIn - totalOut

  const chipStyle = (active: boolean): React.CSSProperties => ({
    padding: '5px 11px',
    borderRadius: '3px',
    border: `1px solid ${active ? 'rgba(244,245,248,0.2)' : C.border}`,
    background: active ? 'rgba(244,245,248,0.07)' : 'transparent',
    color: active ? C.white : C.muted,
    cursor: 'pointer',
    fontSize: '0.75rem',
    fontWeight: active ? 500 : 400,
    minHeight: '32px',
    transition: 'all 0.1s',
  })

  return (
    <div style={{ padding: 'clamp(1.5rem,4vw,2.5rem)', maxWidth: '960px' }}>
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
              fontSize: '0.62rem',
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              marginBottom: '5px',
              fontFamily: 'var(--font-geist-mono), monospace',
            }}
          >
            ledger
          </div>
          <h1
            style={{
              color: C.white,
              fontSize: 'clamp(1.4rem,3vw,1.9rem)',
              fontWeight: 600,
              letterSpacing: '-0.03em',
              margin: 0,
            }}
          >
            Transaction Ledger
          </h1>
          <p
            style={{
              color: C.muted,
              fontSize: '0.78rem',
              marginTop: '4px',
              fontFamily: 'var(--font-geist-mono), monospace',
            }}
          >
            {visible.length} records · net:{' '}
            <span style={{ color: net >= 0 ? C.green : C.red }}>
              {net >= 0 ? '+' : '-'}
              {fmt(net)}
            </span>
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              color: C.muted,
              fontSize: '0.68rem',
              fontFamily: 'var(--font-geist-mono), monospace',
              padding: '6px 10px',
              border: `1px solid ${C.border}`,
              borderRadius: '4px',
            }}
          >
            {isAuthenticated ? (
              <>
                <Cloud size={11} style={{ color: '#4ADE80' }} /> synced
              </>
            ) : (
              <>
                <CloudOff size={11} /> local only
              </>
            )}
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: C.white,
              color: C.bg,
              border: 'none',
              borderRadius: '4px',
              padding: '8px 16px',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              minHeight: '36px',
              letterSpacing: '-0.01em',
            }}
          >
            <Plus size={14} strokeWidth={2.5} /> Add Entry
          </button>
        </div>
      </div>

      {/* Guest sync nudge */}
      {!loading && !isAuthenticated && txs.length > 0 && (
        <div
          style={{
            background: 'rgba(251,191,36,0.05)',
            border: '1px solid rgba(251,191,36,0.18)',
            borderRadius: '4px',
            padding: '0.7rem 1rem',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.5rem',
          }}
        >
          <span style={{ color: '#FBBF24', fontSize: '0.75rem' }}>
            Data is saved in this browser only — sign in to sync across devices.
          </span>
          <a
            href="/auth/login"
            style={{
              color: '#FBBF24',
              fontSize: '0.72rem',
              fontWeight: 600,
              textDecoration: 'none',
              borderBottom: '1px solid rgba(251,191,36,0.4)',
            }}
          >
            Sign in →
          </a>
        </div>
      )}

      {/* Summary tiles */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '1px',
          border: `1px solid ${C.border}`,
          borderRadius: '6px',
          overflow: 'hidden',
          background: C.border,
          marginBottom: '1.5rem',
        }}
      >
        {[
          { label: 'Income', value: fmt(totalIn), color: C.green },
          { label: 'Expenses', value: fmt(totalOut), color: C.red },
          {
            label: 'Net',
            value: `${net >= 0 ? '+' : '-'}${fmt(net)}`,
            color: net >= 0 ? C.green : C.red,
          },
        ].map((s) => (
          <div key={s.label} style={{ background: C.surface, padding: '0.9rem 1.1rem' }}>
            <div
              style={{
                color: C.muted,
                fontSize: '0.62rem',
                textTransform: 'uppercase',
                letterSpacing: '0.07em',
                fontWeight: 600,
                marginBottom: '4px',
              }}
            >
              {s.label}
            </div>
            <div
              style={{
                color: s.color,
                fontWeight: 600,
                fontSize: '1.05rem',
                fontFamily: 'var(--font-geist-mono), monospace',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {s.value}
            </div>
          </div>
        ))}
      </div>

      {/* Add form */}
      {showForm && (
        <form
          onSubmit={add}
          style={{
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: '6px',
            padding: '1.25rem',
            marginBottom: '1.25rem',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))',
            gap: '0.85rem',
            alignItems: 'end',
          }}
        >
          <div>
            <label style={labelStyle}>Date</label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
              style={inputStyle}
            />
          </div>
          <div style={{ gridColumn: 'span 2' }}>
            <label style={labelStyle}>Description</label>
            <input
              type="text"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="e.g. Client Invoice"
              style={{ ...inputStyle, fontFamily: 'inherit' }}
              required
            />
          </div>
          <div>
            <label style={labelStyle}>Type</label>
            <select
              value={form.type}
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as TxType }))}
              style={{ ...inputStyle, cursor: 'pointer' }}
            >
              <option value="income">Income</option>
              <option value="expense">Expense</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Amount (£)</label>
            <input
              type="number"
              min={0}
              step={0.01}
              value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              placeholder="0.00"
              style={inputStyle}
              required
            />
          </div>
          <div>
            <label style={labelStyle}>Reference</label>
            <input
              type="text"
              value={form.reference}
              onChange={(e) => setForm((f) => ({ ...f, reference: e.target.value }))}
              placeholder="INV-001"
              style={inputStyle}
            />
          </div>
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            <button
              type="submit"
              style={{
                flex: 1,
                background: C.white,
                color: C.bg,
                border: 'none',
                borderRadius: '4px',
                padding: '9px',
                fontWeight: 600,
                cursor: 'pointer',
                fontSize: '0.8rem',
                minHeight: '40px',
                letterSpacing: '-0.01em',
              }}
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              style={{
                background: 'transparent',
                color: C.muted,
                border: `1px solid ${C.border}`,
                borderRadius: '4px',
                padding: '9px 12px',
                cursor: 'pointer',
                fontSize: '0.8rem',
                minHeight: '40px',
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Filters */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.4rem',
          marginBottom: '1rem',
          alignItems: 'center',
        }}
      >
        {(['all', 'income', 'expense'] as const).map((f) => (
          <button key={f} onClick={() => setType(f)} style={chipStyle(typeFilter === f)}>
            {f === 'all' ? 'All types' : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
        <div style={{ width: '1px', height: '20px', background: C.border, margin: '0 2px' }} />
        <Calendar size={12} style={{ color: C.muted }} />
        {(['all', 'today', 'month', 'custom'] as DateFilter[]).map((f) => (
          <button key={f} onClick={() => setDate(f)} style={chipStyle(dateFilter === f)}>
            {DATE_LABELS[f]}
          </button>
        ))}
      </div>

      {/* Custom date range */}
      {dateFilter === 'custom' && (
        <div
          style={{
            display: 'flex',
            gap: '0.65rem',
            marginBottom: '1rem',
            flexWrap: 'wrap',
            alignItems: 'flex-end',
          }}
        >
          <div>
            <label style={labelStyle}>From</label>
            <input
              type="date"
              value={customFrom}
              onChange={(e) => setFrom(e.target.value)}
              style={{ ...inputStyle, width: 'auto' }}
            />
          </div>
          <div>
            <label style={labelStyle}>To</label>
            <input
              type="date"
              value={customTo}
              onChange={(e) => setTo(e.target.value)}
              style={{ ...inputStyle, width: 'auto' }}
            />
          </div>
          <span
            style={{
              color: C.muted,
              fontSize: '0.72rem',
              fontFamily: 'var(--font-geist-mono), monospace',
              paddingBottom: '9px',
            }}
          >
            {visible.length} results
          </span>
        </div>
      )}

      {/* Table */}
      <div
        style={{
          background: C.surface,
          border: `1px solid ${C.border}`,
          borderRadius: '6px',
          overflow: 'hidden',
        }}
      >
        {visible.length === 0 ? (
          <div
            style={{ padding: '3rem', textAlign: 'center', color: C.muted, fontSize: '0.84rem' }}
          >
            No entries for this period.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                  {['', 'Date', 'Description', 'Reference', 'Amount', ''].map((h, i) => (
                    <th
                      key={i}
                      style={{
                        padding: '10px 13px',
                        textAlign: h === 'Amount' ? 'right' : 'left',
                        color: C.muted,
                        fontWeight: 600,
                        fontSize: '0.62rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.07em',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible.map((tx, idx) => (
                  <tr
                    key={tx.id}
                    style={{
                      borderBottom:
                        idx < visible.length - 1 ? `1px solid rgba(244,245,248,0.04)` : 'none',
                    }}
                  >
                    <td style={{ padding: '9px 13px', width: '32px' }}>
                      {tx.type === 'income' ? (
                        <ArrowUpCircle size={14} style={{ color: C.green }} strokeWidth={1.5} />
                      ) : (
                        <ArrowDownCircle size={14} style={{ color: C.red }} strokeWidth={1.5} />
                      )}
                    </td>
                    <td
                      style={{
                        padding: '9px 13px',
                        color: C.muted,
                        whiteSpace: 'nowrap',
                        fontFamily: 'var(--font-geist-mono), monospace',
                        fontSize: '0.75rem',
                      }}
                    >
                      {tx.date}
                    </td>
                    <td style={{ padding: '9px 13px', color: C.white }}>{tx.description}</td>
                    <td
                      style={{
                        padding: '9px 13px',
                        color: C.muted,
                        fontSize: '0.72rem',
                        fontFamily: 'var(--font-geist-mono), monospace',
                      }}
                    >
                      {tx.reference}
                    </td>
                    <td
                      style={{
                        padding: '9px 13px',
                        textAlign: 'right',
                        fontWeight: 500,
                        color: tx.type === 'income' ? C.green : C.red,
                        whiteSpace: 'nowrap',
                        fontFamily: 'var(--font-geist-mono), monospace',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {tx.type === 'income' ? '+' : '-'}£
                      {tx.amount.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
                    </td>
                    <td style={{ padding: '9px 13px', width: '32px' }}>
                      <button
                        onClick={() => remove(tx.id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'rgba(248,113,113,0.35)',
                          cursor: 'pointer',
                          padding: '2px',
                          display: 'flex',
                          transition: 'color 0.1s',
                        }}
                        onMouseEnter={(e) =>
                          ((e.currentTarget as HTMLButtonElement).style.color = C.red)
                        }
                        onMouseLeave={(e) =>
                          ((e.currentTarget as HTMLButtonElement).style.color =
                            'rgba(248,113,113,0.35)')
                        }
                      >
                        <Trash2 size={13} strokeWidth={1.5} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p
        style={{
          color: C.muted,
          fontSize: '0.62rem',
          textAlign: 'right',
          marginTop: '0.75rem',
          fontFamily: 'var(--font-geist-mono), monospace',
        }}
      >
        2026/27 estimates · digitally linked records
      </p>
    </div>
  )
}
