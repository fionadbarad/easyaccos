'use client'

import { Plus, Trash2, CloudOff, Cloud, Camera } from 'lucide-react'
import ReceiptScanner from '@/components/ReceiptScanner'
import { FilterBar } from '@/components/tracker/FilterBar'
import { SortableTable, type ColumnDef } from '@/components/tracker/SortableTable'
import { useExpenses, CATEGORIES } from '@/lib/hooks/useExpenses'
import type { Expense } from '@/lib/validators'
import { ReceiptVerifyModal } from '@/features/expenses/ReceiptVerifyModal'
import { ExpenseForm } from '@/features/expenses/ExpenseForm'

import { C } from '@/styles/palette'
import { Badge, LoadingSpinner } from '@/components/ui/Base'
import { T } from '@/styles/type'

export default function ExpensesPage() {
  const {
    expenses,
    filtered,
    loading,
    isAuthenticated,
    showForm,
    setShowForm,
    form,
    setForm,
    suggesting,
    filter,
    setFilter,
    pendingScan,
    total,
    byCategory,
    addExpense,
    remove,
    suggestCategory,
    onReceiptExtract,
    confirmScan,
    cancelScan,
  } = useExpenses()

  const columns: ColumnDef<Expense>[] = [
    {
      key: 'date',
      header: 'Date',
      sortable: true,
      accessor: (e) => e.date,
      render: (e) => (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
          <span
            style={{
              color: C.muted,
              fontFamily: 'var(--font-geist-mono), monospace',
              fontSize: T.caption,
            }}
          >
            {e.date}
          </span>
          {e.ocrScanned && (
            <span
              title="Scanned via OCR"
              style={{ display: 'inline-flex', alignItems: 'center', color: C.blue, opacity: 0.8 }}
            >
              <Camera size={12} strokeWidth={1.5} />
            </span>
          )}
        </span>
      ),
    },
    { key: 'description', header: 'Description', sortable: true, accessor: (e) => e.description },
    {
      key: 'category',
      header: 'Category',
      sortable: true,
      accessor: (e) => e.category,
      render: (e) => <span style={{ color: C.muted, fontSize: T.caption }}>{e.category}</span>,
    },
    {
      key: 'amount',
      header: 'Amount',
      sortable: true,
      align: 'right',
      accessor: (e) => e.amount,
      render: (e) => (
        <span
          style={{
            color: C.red,
            fontWeight: 500,
            fontFamily: 'var(--font-geist-mono), monospace',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          -£{e.amount.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      key: 'del',
      header: '',
      align: 'right',
      width: 40,
      accessor: () => '',
      render: (e) => (
        <button
          onClick={() => remove(e.id)}
          aria-label="Delete expense"
          style={{
            background: 'none',
            border: 'none',
            color: 'rgba(248,113,113,0.4)',
            cursor: 'pointer',
            padding: 2,
            display: 'inline-flex',
          }}
        >
          <Trash2 size={12} strokeWidth={1.5} />
        </button>
      ),
    },
  ]

  return (
    <div className="page-shell">
      {pendingScan && (
        <ReceiptVerifyModal scan={pendingScan} onConfirm={confirmScan} onCancel={cancelScan} />
      )}

      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '1.75rem',
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
            expenses
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
            Expense Tracker
          </h1>
          <p
            style={{
              color: C.muted,
              fontSize: T.caption,
              marginTop: '4px',
              fontFamily: 'var(--font-geist-mono), monospace',
            }}
          >
            {loading
              ? '—'
              : `${filtered.length}${filtered.length !== expenses.length ? ` of ${expenses.length}` : ''} records · total `}
            {!loading && (
              <span style={{ color: C.white }}>
                £{total.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
              </span>
            )}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              color: C.muted,
              fontSize: T.micro,
              fontFamily: 'var(--font-geist-mono), monospace',
              padding: '6px 10px',
              border: `1px solid ${C.border}`,
              borderRadius: '4px',
            }}
          >
            {isAuthenticated ? (
              <>
                <Cloud size={12} style={{ color: C.green }} /> synced
              </>
            ) : (
              <>
                <CloudOff size={12} /> local only
              </>
            )}
          </div>
          <ReceiptScanner onExtract={onReceiptExtract} />
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
              fontSize: T.meta,
              fontWeight: 600,
              cursor: 'pointer',
              minHeight: '36px',
              letterSpacing: '-0.01em',
            }}
          >
            <Plus size={14} strokeWidth={2.5} /> Add Expense
          </button>
        </div>
      </div>

      {!loading && !isAuthenticated && expenses.length > 0 && (
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
          <span style={{ color: C.amber, fontSize: T.caption }}>
            Data is saved in this browser only — sign in to sync across devices.
          </span>
          <a
            href="/auth/login"
            style={{
              color: C.amber,
              fontSize: T.caption,
              fontWeight: 600,
              textDecoration: 'none',
              borderBottom: '1px solid rgba(251,191,36,0.4)',
            }}
          >
            Sign in →
          </a>
        </div>
      )}

      {showForm && (
        <ExpenseForm
          form={form}
          setForm={setForm}
          suggesting={suggesting}
          onSubmit={addExpense}
          onCancel={() => setShowForm(false)}
          onSuggestCategory={suggestCategory}
        />
      )}

      {byCategory.length > 0 && (
        <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
          {byCategory.map(({ cat, total: t }) => (
            <Badge key={cat}>
              {cat} · £{t.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
            </Badge>
          ))}
        </div>
      )}

      {!loading && expenses.length > 0 && (
        <FilterBar value={filter} onChange={setFilter} categories={CATEGORIES} />
      )}

      {loading ? (
        <LoadingSpinner />
      ) : expenses.length === 0 ? (
        <div
          style={{
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: '6px',
            padding: '3rem',
            textAlign: 'center',
          }}
        >
          <p style={{ color: C.muted, fontSize: T.meta, margin: 0 }}>
            No expenses yet. Add your first one above.
          </p>
          <p
            style={{
              color: 'rgba(244,245,248,0.2)',
              fontSize: T.caption,
              marginTop: '6px',
              fontFamily: 'var(--font-geist-mono), monospace',
            }}
          >
            HMRC &quot;wholly and exclusively&quot; rule applies
          </p>
        </div>
      ) : (
        <SortableTable
          rows={filtered}
          columns={columns}
          initialSort={{ key: 'date', dir: 'desc' }}
          empty="No expenses match these filters."
        />
      )}

      {expenses.some((e) => e.ocrScanned) && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            marginTop: '0.6rem',
            color: 'rgba(147,197,253,0.5)',
            fontSize: T.micro,
            fontFamily: 'var(--font-geist-mono), monospace',
          }}
        >
          <Camera size={12} /> = scanned via OCR
        </div>
      )}

      <p
        style={{
          color: 'rgba(244,245,248,0.18)',
          fontSize: T.micro,
          marginTop: '0.75rem',
          textAlign: 'right',
          fontFamily: 'var(--font-geist-mono), monospace',
        }}
      >
        HMRC &quot;wholly and exclusively&quot; rule · 2026/27
      </p>
    </div>
  )
}
