'use client'

import { useState, useMemo } from 'react'
import { Plus, Trash2, ArrowUpCircle, ArrowDownCircle, Calendar, Cloud, CloudOff } from 'lucide-react'
import { useUserData } from '@/lib/use-user-data'

type TxType    = 'income' | 'expense'
type DateFilter = 'all' | 'today' | 'month' | 'custom'

interface Transaction {
  id: string; date: string; description: string
  type: TxType; amount: number; reference: string
}

const INPUT_S = 'w-full bg-[var(--sa-gray)] border border-[var(--sa-border)] rounded-[4px] px-[11px] py-[9px] text-[var(--sa-white)] text-[0.84rem] outline-none font-mono tabular-nums min-h-[40px]'
const LABEL_S = 'block text-[rgba(244,245,248,0.42)] text-[0.62rem] uppercase tracking-[0.08em] mb-[4px] font-semibold'

const SEED: Transaction[] = [
  { id: '1', date: '2026-04-01', description: 'Client Project — Acme Corp', type: 'income',  amount: 2400,  reference: 'INV-001' },
  { id: '2', date: '2026-04-02', description: 'Adobe Creative Cloud',       type: 'expense', amount: 54.99, reference: 'SUB-001' },
  { id: '3', date: '2026-04-05', description: 'Consulting — Beta Ltd',       type: 'income',  amount: 1800,  reference: 'INV-002' },
  { id: '4', date: '2026-04-07', description: 'Home Office Internet',        type: 'expense', amount: 45,    reference: 'UTIL-001' },
  { id: '5', date: '2026-03-20', description: 'Freelance Writing Project',   type: 'income',  amount: 750,   reference: 'INV-003' },
  { id: '6', date: '2026-03-15', description: 'Travel — Client Visit',       type: 'expense', amount: 120,   reference: 'EXP-001' },
  { id: '7', date: '2026-02-28', description: 'Design Retainer',             type: 'income',  amount: 3200,  reference: 'INV-004' },
]

function toISODate(d: Date) { return d.toISOString().slice(0, 10) }

function isToday(dateStr: string)   { return dateStr === toISODate(new Date()) }
function isThisMonth(dateStr: string) {
  const now = new Date(), d = new Date(dateStr)
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
}

const DATE_LABELS: Record<DateFilter, string> = {
  all: 'All time', today: 'Today', month: 'This month', custom: 'Custom',
}

const chipCls = (active: boolean) =>
  `px-[11px] py-[5px] rounded-[3px] text-[0.75rem] min-h-[32px] transition-all duration-100 cursor-pointer border ${active ? 'border-[rgba(244,245,248,0.2)] bg-[var(--sa-border)] text-[var(--sa-white)] font-medium' : 'border-[var(--sa-border)] bg-transparent text-[rgba(244,245,248,0.42)] font-normal'}`

export default function TransactionsPage() {
  const { items: txs, persist, loading, isAuthenticated } = useUserData<Transaction>(
    'user_transactions', 'easyacco_transactions', SEED,
  )
  const [typeFilter, setType]   = useState<TxType | 'all'>('all')
  const [dateFilter, setDate]   = useState<DateFilter>('all')
  const [customFrom, setFrom]   = useState('')
  const [customTo, setTo]       = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm]         = useState({
    date: toISODate(new Date()), description: '', type: 'income' as TxType, amount: '', reference: '',
  })

  async function add(e: React.FormEvent) {
    e.preventDefault()
    const amount = parseFloat(form.amount)
    if (!amount || !form.description.trim()) return
    await persist([{ id: crypto.randomUUID(), ...form, amount }, ...txs])
    setForm((f) => ({ ...f, description: '', amount: '', reference: '' }))
    setShowForm(false)
  }

  async function remove(id: string) { await persist(txs.filter((t) => t.id !== id)) }

  const visible = useMemo(() => txs
    .filter((t) => typeFilter === 'all' || t.type === typeFilter)
    .filter((t) => {
      if (dateFilter === 'today')  return isToday(t.date)
      if (dateFilter === 'month')  return isThisMonth(t.date)
      if (dateFilter === 'custom' && customFrom && customTo) return t.date >= customFrom && t.date <= customTo
      return true
    })
    .sort((a, b) => b.date.localeCompare(a.date)),
  [txs, typeFilter, dateFilter, customFrom, customTo])

  const totalIn  = visible.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const totalOut = visible.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  const net      = totalIn - totalOut
  const fmt      = (n: number) => `£${Math.abs(n).toLocaleString('en-GB', { minimumFractionDigits: 2 })}`

  return (
    <div className="p-[clamp(1.5rem,4vw,2.5rem)] max-w-[960px]">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-[1rem] mb-[1.5rem]">
        <div>
          <div className="text-[rgba(244,245,248,0.42)] text-[0.62rem] uppercase tracking-[0.12em] mb-[5px] font-mono">ledger</div>
          <h1 className="text-[var(--sa-white)] text-[clamp(1.4rem,3vw,1.9rem)] font-semibold tracking-[-0.03em] m-0">
            Transaction Ledger
          </h1>
          <p className="text-[rgba(244,245,248,0.42)] text-[0.78rem] mt-[4px] font-mono">
            {visible.length} records · net:{' '}
            <span className={net >= 0 ? 'text-[#4ADE80]' : 'text-[#F87171]'}>{net >= 0 ? '+' : '-'}{fmt(net)}</span>
          </p>
        </div>
        <div className="flex items-center gap-[0.5rem]">
          <div className="flex items-center gap-[5px] text-[rgba(244,245,248,0.42)] text-[0.68rem] font-mono px-[10px] py-[6px] border border-[var(--sa-border)] rounded-[4px]">
            {isAuthenticated
              ? <><Cloud size={11} className="text-[#4ADE80]" /> synced</>
              : <><CloudOff size={11} /> local only</>}
          </div>
          <button onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-[6px] bg-[var(--sa-white)] text-[var(--sa-black)] border-none rounded-[4px] px-[16px] py-[8px] text-[0.8rem] font-semibold cursor-pointer min-h-[36px] tracking-[-0.01em]">
            <Plus size={14} strokeWidth={2.5} /> Add Entry
          </button>
        </div>
      </div>

      {/* Guest sync nudge */}
      {!loading && !isAuthenticated && txs.length > 0 && (
        <div className="bg-[rgba(251,191,36,0.05)] border border-[rgba(251,191,36,0.18)] rounded-[4px] px-[1rem] py-[0.7rem] mb-[1.25rem] flex items-center justify-between flex-wrap gap-[0.5rem]">
          <span className="text-[#FBBF24] text-[0.75rem]">Data is saved in this browser only — sign in to sync across devices.</span>
          <a href="/auth/login" className="text-[#FBBF24] text-[0.72rem] font-semibold no-underline border-b border-[rgba(251,191,36,0.4)]">Sign in →</a>
        </div>
      )}

      {/* Summary tiles */}
      <div className="grid grid-cols-3 gap-[1px] border border-[var(--sa-border)] rounded-[6px] overflow-hidden bg-[var(--sa-border)] mb-[1.5rem]">
        {[
          { label: 'Income',   value: fmt(totalIn),  color: 'text-[#4ADE80]' },
          { label: 'Expenses', value: fmt(totalOut), color: 'text-[#F87171]' },
          { label: 'Net',      value: `${net >= 0 ? '+' : '-'}${fmt(net)}`, color: net >= 0 ? 'text-[#4ADE80]' : 'text-[#F87171]' },
        ].map((s) => (
          <div key={s.label} className="bg-[var(--sa-surface)] p-[0.9rem_1.1rem]">
            <div className="text-[rgba(244,245,248,0.42)] text-[0.62rem] uppercase tracking-[0.07em] font-semibold mb-[4px]">{s.label}</div>
            <div className={`${s.color} font-semibold text-[1.05rem] font-mono tabular-nums`}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Add form */}
      {showForm && (
        <form onSubmit={add}
          className="bg-[var(--sa-surface)] border border-[var(--sa-border)] rounded-[6px] p-[1.25rem] mb-[1.25rem] grid gap-[0.85rem] items-end"
          style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))' }}>
          <div>
            <label className={LABEL_S}>Date</label>
            <input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} className={INPUT_S} />
          </div>
          <div className="col-span-2">
            <label className={LABEL_S}>Description</label>
            <input type="text" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="e.g. Client Invoice"
              className="w-full bg-[var(--sa-gray)] border border-[var(--sa-border)] rounded-[4px] px-[11px] py-[9px] text-[var(--sa-white)] text-[0.84rem] outline-none min-h-[40px]" required />
          </div>
          <div>
            <label className={LABEL_S}>Type</label>
            <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as TxType }))} className={`${INPUT_S} cursor-pointer`}>
              <option value="income">Income</option>
              <option value="expense">Expense</option>
            </select>
          </div>
          <div>
            <label className={LABEL_S}>Amount (£)</label>
            <input type="number" min={0} step={0.01} value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} placeholder="0.00" className={INPUT_S} required />
          </div>
          <div>
            <label className={LABEL_S}>Reference</label>
            <input type="text" value={form.reference} onChange={(e) => setForm((f) => ({ ...f, reference: e.target.value }))} placeholder="INV-001" className={INPUT_S} />
          </div>
          <div className="flex gap-[0.4rem]">
            <button type="submit" className="flex-1 bg-[var(--sa-white)] text-[var(--sa-black)] border-none rounded-[4px] p-[9px] font-semibold cursor-pointer text-[0.8rem] min-h-[40px] tracking-[-0.01em]">Save</button>
            <button type="button" onClick={() => setShowForm(false)} className="bg-transparent text-[rgba(244,245,248,0.42)] border border-[var(--sa-border)] rounded-[4px] px-[12px] py-[9px] cursor-pointer text-[0.8rem] min-h-[40px]">Cancel</button>
          </div>
        </form>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-[0.4rem] mb-[1rem] items-center">
        {(['all', 'income', 'expense'] as const).map((f) => (
          <button key={f} onClick={() => setType(f)} className={chipCls(typeFilter === f)}>
            {f === 'all' ? 'All types' : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
        <div className="w-[1px] h-[20px] bg-[var(--sa-border)] mx-[2px]" />
        <Calendar size={12} className="text-[rgba(244,245,248,0.42)]" />
        {(['all', 'today', 'month', 'custom'] as DateFilter[]).map((f) => (
          <button key={f} onClick={() => setDate(f)} className={chipCls(dateFilter === f)}>
            {DATE_LABELS[f]}
          </button>
        ))}
      </div>

      {/* Custom date range */}
      {dateFilter === 'custom' && (
        <div className="flex gap-[0.65rem] mb-[1rem] flex-wrap items-end">
          <div>
            <label className={LABEL_S}>From</label>
            <input type="date" value={customFrom} onChange={(e) => setFrom(e.target.value)}
              className="bg-[var(--sa-gray)] border border-[var(--sa-border)] rounded-[4px] px-[11px] py-[9px] text-[var(--sa-white)] text-[0.84rem] outline-none font-mono min-h-[40px]" />
          </div>
          <div>
            <label className={LABEL_S}>To</label>
            <input type="date" value={customTo} onChange={(e) => setTo(e.target.value)}
              className="bg-[var(--sa-gray)] border border-[var(--sa-border)] rounded-[4px] px-[11px] py-[9px] text-[var(--sa-white)] text-[0.84rem] outline-none font-mono min-h-[40px]" />
          </div>
          <span className="text-[rgba(244,245,248,0.42)] text-[0.72rem] font-mono pb-[9px]">{visible.length} results</span>
        </div>
      )}

      {/* Table */}
      <div className="bg-[var(--sa-surface)] border border-[var(--sa-border)] rounded-[6px] overflow-hidden">
        {visible.length === 0 ? (
          <div className="p-[3rem] text-center text-[rgba(244,245,248,0.42)] text-[0.84rem]">No entries for this period.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[0.82rem]">
              <thead>
                <tr className="border-b border-[var(--sa-border)]">
                  {['', 'Date', 'Description', 'Reference', 'Amount', ''].map((h, i) => (
                    <th key={i} className={`p-[10px_13px] text-[rgba(244,245,248,0.42)] font-semibold text-[0.62rem] uppercase tracking-[0.07em] whitespace-nowrap ${h === 'Amount' ? 'text-right' : 'text-left'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible.map((tx, idx) => (
                  <tr key={tx.id} className={idx < visible.length - 1 ? 'border-b border-[rgba(244,245,248,0.04)]' : ''}>
                    <td className="p-[9px_13px] w-[32px]">
                      {tx.type === 'income'
                        ? <ArrowUpCircle   size={14} className="text-[#4ADE80]" strokeWidth={1.5} />
                        : <ArrowDownCircle size={14} className="text-[#F87171]" strokeWidth={1.5} />}
                    </td>
                    <td className="p-[9px_13px] text-[rgba(244,245,248,0.42)] whitespace-nowrap font-mono text-[0.75rem]">{tx.date}</td>
                    <td className="p-[9px_13px] text-[var(--sa-white)]">{tx.description}</td>
                    <td className="p-[9px_13px] text-[rgba(244,245,248,0.42)] text-[0.72rem] font-mono">{tx.reference}</td>
                    <td className={`p-[9px_13px] text-right font-medium whitespace-nowrap font-mono tabular-nums ${tx.type === 'income' ? 'text-[#4ADE80]' : 'text-[#F87171]'}`}>
                      {tx.type === 'income' ? '+' : '-'}£{tx.amount.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-[9px_13px] w-[32px]">
                      <button onClick={() => remove(tx.id)}
                        className="bg-transparent border-none text-[rgba(248,113,113,0.35)] cursor-pointer p-[2px] flex transition-colors duration-100"
                        onMouseEnter={(e) => (e.currentTarget as HTMLButtonElement).style.color = '#F87171'}
                        onMouseLeave={(e) => (e.currentTarget as HTMLButtonElement).style.color = 'rgba(248,113,113,0.35)'}>
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

      <p className="text-[rgba(244,245,248,0.42)] text-[0.62rem] text-right mt-[0.75rem] font-mono">
        2026/27 HMRC compliant · digitally linked records
      </p>
    </div>
  )
}
