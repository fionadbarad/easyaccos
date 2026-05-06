'use client'

import { motion } from 'framer-motion'
import type { InvoiceFormState } from '@/lib/hooks/useInvoices'

const INPUT_BASE = 'w-full bg-[var(--sa-gray)] border border-[var(--sa-border)] rounded px-[11px] py-[9px] text-[var(--sa-white)] text-[0.84rem] outline-none'
const LABEL_S = 'block text-[rgba(244,245,248,0.18)] text-[0.6rem] uppercase tracking-[0.09em] mb-1 font-semibold font-mono'

export function InvoiceForm({
  form,
  setForm,
  nextNumber,
  onSubmit,
  onCancel,
}: {
  form: InvoiceFormState
  setForm: React.Dispatch<React.SetStateAction<InvoiceFormState>>
  nextNumber: string
  onSubmit: (e: React.FormEvent) => void
  onCancel: () => void
}) {
  return (
    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
      className="mb-5">
      <form onSubmit={onSubmit}
        className="bg-[var(--sa-surface)] border border-[var(--sa-border)] rounded-md p-5 grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-[0.85rem] items-end">
        <div>
          <label className={LABEL_S}>Client name</label>
          <input value={form.client} onChange={e => setForm(f => ({ ...f, client: e.target.value }))}
            placeholder="Acme Ltd" className={INPUT_BASE} required />
        </div>
        <div>
          <label className={LABEL_S}>Invoice #</label>
          <input value={form.number} onChange={e => setForm(f => ({ ...f, number: e.target.value }))}
            placeholder={nextNumber} className={INPUT_BASE} />
        </div>
        <div className="col-span-2">
          <label className={LABEL_S}>Description / services</label>
          <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            placeholder="Web development - April 2026" className={INPUT_BASE} />
        </div>
        <div>
          <label className={LABEL_S}>Invoice date</label>
          <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className={INPUT_BASE} />
        </div>
        <div>
          <label className={LABEL_S}>Due date</label>
          <input type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} className={INPUT_BASE} />
        </div>
        <div>
          <label className={LABEL_S}>Net amount (£)</label>
          <input type="number" min={0} step={0.01} value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
            placeholder="0.00" className={INPUT_BASE} required />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className={LABEL_S}>VAT</label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.vat} onChange={e => setForm(f => ({ ...f, vat: e.target.checked }))}
              className="w-[14px] h-[14px] accent-[var(--sa-white)] cursor-pointer" />
            <span className="text-[rgba(244,245,248,0.42)] text-[0.82rem]">Add 20% VAT</span>
          </label>
        </div>
        <div className="flex gap-[0.4rem]">
          <button type="submit" className="flex-1 bg-[var(--sa-white)] text-[var(--sa-black)] border-0 rounded p-[9px] font-semibold cursor-pointer text-[0.8rem] min-h-[40px] tracking-[-0.01em]">
            Create
          </button>
          <button type="button" onClick={onCancel}
            className="bg-transparent text-[rgba(244,245,248,0.42)] border border-[var(--sa-border)] rounded px-3 py-[9px] cursor-pointer text-[0.8rem] min-h-[40px]">
            Cancel
          </button>
        </div>
      </form>
    </motion.div>
  )
}
