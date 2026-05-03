'use client'

import { Sparkles, Loader2 } from 'lucide-react'
import type { ExpenseFormState } from '@/lib/hooks/useExpenses'
import { CATEGORIES } from '@/lib/hooks/useExpenses'

const INPUT_MONO = 'w-full bg-[#222326] border border-[rgba(244,245,248,0.07)] rounded-[4px] px-[11px] py-[9px] text-[#F4F5F8] text-[0.84rem] outline-none font-mono'
const INPUT_BASE = 'w-full bg-[#222326] border border-[rgba(244,245,248,0.07)] rounded-[4px] px-[11px] py-[9px] text-[#F4F5F8] text-[0.84rem] outline-none'
const LABEL_S = 'block text-[rgba(244,245,248,0.42)] text-[0.62rem] uppercase tracking-[0.08em] mb-[4px] font-semibold'

export function ExpenseForm({
  form,
  setForm,
  suggesting,
  onSubmit,
  onCancel,
  onSuggestCategory,
}: {
  form: ExpenseFormState
  setForm: React.Dispatch<React.SetStateAction<ExpenseFormState>>
  suggesting: boolean
  onSubmit: (e: React.FormEvent) => void
  onCancel: () => void
  onSuggestCategory: () => void
}) {
  return (
    <form onSubmit={onSubmit}
      className="bg-[#1C1D20] border border-[rgba(244,245,248,0.07)] rounded-[6px] p-5 mb-5 grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-[0.85rem] items-end">
      <div>
        <label className={LABEL_S}>Date</label>
        <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className={INPUT_MONO} />
      </div>
      <div className="col-span-2">
        <label className={LABEL_S}>Description</label>
        <input type="text" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          placeholder="e.g. Adobe CC subscription" className={INPUT_BASE} required />
      </div>
      <div>
        <label className={LABEL_S}>
          Category
          <button type="button" onClick={onSuggestCategory} disabled={!form.description.trim() || suggesting}
            className={`ml-[6px] bg-transparent border border-[rgba(244,245,248,0.07)] rounded-[3px] px-[6px] py-[1px] text-[0.58rem] inline-flex items-center gap-[3px] align-middle ${suggesting ? 'text-[rgba(244,245,248,0.42)] cursor-default' : 'text-[#F4F5F8] cursor-pointer'}`}>
            {suggesting ? <Loader2 size={9} className="animate-spin" /> : <Sparkles size={9} />}
            {suggesting ? 'thinking' : 'suggest'}
          </button>
        </label>
        <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className={`${INPUT_MONO} cursor-pointer`}>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <div>
        <label className={LABEL_S}>Amount (£)</label>
        <input type="number" min={0} step={0.01} value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="0.00" className={INPUT_MONO} required />
      </div>
      <div className="flex gap-[0.4rem]">
        <button type="submit" className="flex-1 bg-[#F4F5F8] text-[#181818] border-0 rounded-[4px] p-[9px] font-semibold cursor-pointer text-[0.8rem] min-h-[40px] tracking-[-0.01em]">
          Save
        </button>
        <button type="button" onClick={onCancel} className="bg-transparent text-[rgba(244,245,248,0.42)] border border-[rgba(244,245,248,0.07)] rounded-[4px] px-3 py-[9px] cursor-pointer text-[0.8rem] min-h-[40px]">
          Cancel
        </button>
      </div>
    </form>
  )
}
