'use client'

import { Plus, Trash2, CloudOff, Cloud, Camera } from 'lucide-react'
import ReceiptScanner from '@/components/ReceiptScanner'
import { FilterBar } from '@/components/tracker/FilterBar'
import { SortableTable, type ColumnDef } from '@/components/tracker/SortableTable'
import { useExpenses, CATEGORIES } from '@/lib/hooks/useExpenses'
import type { Expense } from '@/lib/validators'
import { ReceiptVerifyModal } from '@/features/expenses/ReceiptVerifyModal'
import { ExpenseForm } from '@/features/expenses/ExpenseForm'

export default function ExpensesPage() {
  const {
    expenses, filtered, loading, isAuthenticated,
    showForm, setShowForm,
    form, setForm, suggesting,
    filter, setFilter,
    pendingScan,
    total, byCategory,
    addExpense, remove, suggestCategory,
    onReceiptExtract, confirmScan, cancelScan,
  } = useExpenses()

  const columns: ColumnDef<Expense>[] = [
    {
      key: 'date', header: 'Date', sortable: true,
      accessor: e => e.date,
      render: e => (
        <span className="inline-flex items-center gap-[5px]">
          <span className="text-[rgba(244,245,248,0.42)] font-mono text-xs">{e.date}</span>
          {e.ocrScanned && (
            <span title="Scanned via OCR" className="inline-flex items-center text-[#93C5FD] opacity-80">
              <Camera size={10} strokeWidth={1.5} />
            </span>
          )}
        </span>
      ),
    },
    { key: 'description', header: 'Description', sortable: true, accessor: e => e.description },
    {
      key: 'category', header: 'Category', sortable: true,
      accessor: e => e.category,
      render: e => <span className="text-[rgba(244,245,248,0.42)] text-xs">{e.category}</span>,
    },
    {
      key: 'amount', header: 'Amount', sortable: true, align: 'right',
      accessor: e => e.amount,
      render: e => (
        <span className="text-[#F87171] font-medium font-mono tabular-nums">
          -£{e.amount.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      key: 'del', header: '', align: 'right', width: 40,
      accessor: () => '',
      render: e => (
        <button onClick={() => remove(e.id)} aria-label="Delete expense"
          className="bg-transparent border-none text-[rgba(248,113,113,0.4)] cursor-pointer p-[2px] inline-flex">
          <Trash2 size={13} strokeWidth={1.5} />
        </button>
      ),
    },
  ]

  return (
    <div className="p-[clamp(1.5rem,4vw,2.5rem)] max-w-[900px]">
      {pendingScan && (
        <ReceiptVerifyModal scan={pendingScan} onConfirm={confirmScan} onCancel={cancelScan} />
      )}

      <div className="flex items-start justify-between flex-wrap gap-4 mb-7">
        <div>
          <div className="text-[rgba(244,245,248,0.42)] text-[0.62rem] uppercase tracking-[0.12em] mb-[5px] font-mono">
            expenses
          </div>
          <h1 className="text-[var(--sa-white)] text-[clamp(1.4rem,3vw,1.9rem)] font-semibold tracking-[-0.03em] m-0">
            Expense Tracker
          </h1>
          <p className="text-[rgba(244,245,248,0.42)] text-xs mt-1 mb-0 font-mono">
            {loading
              ? '—'
              : `${filtered.length}${filtered.length !== expenses.length ? ` of ${expenses.length}` : ''} records · total `}
            {!loading && <span className="text-[var(--sa-white)]">£{total.toLocaleString('en-GB', { minimumFractionDigits: 2 })}</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-[5px] text-[rgba(244,245,248,0.42)] text-[0.68rem] font-mono px-[10px] py-[6px] border border-[var(--sa-border)] rounded">
            {isAuthenticated ? <><Cloud size={11} className="text-[#4ADE80]" /> synced</> : <><CloudOff size={11} /> local only</>}
          </div>
          <ReceiptScanner onExtract={onReceiptExtract} />
          <button onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-1.5 bg-[var(--sa-white)] text-[var(--sa-black)] border-none rounded px-[16px] py-[8px] text-[0.8rem] font-semibold cursor-pointer min-h-[36px] tracking-[-0.01em]">
            <Plus size={14} strokeWidth={2.5} /> Add Expense
          </button>
        </div>
      </div>

      {!loading && !isAuthenticated && expenses.length > 0 && (
        <div className="bg-[rgba(251,191,36,0.05)] border border-[rgba(251,191,36,0.18)] rounded px-[1rem] py-[0.7rem] mb-5 flex items-center justify-between flex-wrap gap-2">
          <span className="text-[#FBBF24] text-xs">Data is saved in this browser only — sign in to sync across devices.</span>
          <a href="/auth/login" className="text-[#FBBF24] text-[0.72rem] font-semibold no-underline border-b border-[rgba(251,191,36,0.4)]">Sign in →</a>
        </div>
      )}

      {showForm && (
        <ExpenseForm
          form={form} setForm={setForm} suggesting={suggesting}
          onSubmit={addExpense}
          onCancel={() => setShowForm(false)}
          onSuggestCategory={suggestCategory}
        />
      )}

      {byCategory.length > 0 && (
        <div className="flex gap-[0.35rem] flex-wrap mb-5">
          {byCategory.map(({ cat, total: t }) => (
            <div key={cat} className="px-[12px] py-[5px] rounded-[3px] border border-[var(--sa-border)] bg-transparent text-[rgba(244,245,248,0.42)] text-[0.72rem] font-mono">
              {cat} · £{t.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
            </div>
          ))}
        </div>
      )}

      {!loading && expenses.length > 0 && (
        <FilterBar value={filter} onChange={setFilter} categories={CATEGORIES} />
      )}

      {loading ? (
        <div className="bg-[var(--sa-surface)] border border-[var(--sa-border)] rounded-md p-[3rem] text-center text-[rgba(244,245,248,0.42)] text-[0.84rem]">
          Loading…
        </div>
      ) : expenses.length === 0 ? (
        <div className="bg-[var(--sa-surface)] border border-[var(--sa-border)] rounded-md p-[3rem] text-center">
          <p className="text-[rgba(244,245,248,0.42)] text-[0.84rem] m-0">No expenses yet. Add your first one above.</p>
          <p className="text-[rgba(244,245,248,0.2)] text-[0.72rem] mt-1.5 mb-0 font-mono">
            HMRC &quot;wholly and exclusively&quot; rule applies
          </p>
        </div>
      ) : (
        <SortableTable rows={filtered} columns={columns} initialSort={{ key: 'date', dir: 'desc' }} empty="No expenses match these filters." />
      )}

      {expenses.some(e => e.ocrScanned) && (
        <div className="flex items-center gap-[5px] mt-[0.6rem] text-[rgba(147,197,253,0.5)] text-[0.62rem] font-mono">
          <Camera size={9} /> = scanned via OCR
        </div>
      )}

      <p className="text-[rgba(244,245,248,0.18)] text-[0.62rem] mt-3 text-right font-mono">
        HMRC &quot;wholly and exclusively&quot; rule · 2026/27
      </p>
    </div>
  )
}
