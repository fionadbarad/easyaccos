'use client'

import { motion } from 'framer-motion'
import type { InvoiceFormState, VatTreatment } from '@/lib/hooks/useInvoices'
import { VAT_TREATMENT_LABELS } from '@/lib/hooks/useInvoices'

/** One-line plain-English reminder of what each treatment means. */
const VAT_TREATMENT_HINTS: Record<VatTreatment, string> = {
  standard: 'Most goods and services.',
  reduced: 'e.g. domestic fuel, children’s car seats.',
  zero: 'Taxable at 0% — e.g. most food, books. Still counts towards turnover.',
  exempt: 'Outside VAT — e.g. insurance, some education. Not taxable turnover.',
  reverse_charge: 'Customer accounts for the VAT (e.g. CIS construction).',
  none: 'You are not charging VAT on this invoice.',
}

/**
 * Shared field styling, hoisted rather than repeated on nine elements.
 *
 * These reproduce the exact values the inline `style={{}}` objects used, down
 * to the 9px/11px padding — deliberately NOT the global `.ui-input`, which
 * pads 0.65rem/0.85rem and sizes at text-body. Snapping to it would be a visual
 * change wearing a refactor's clothes; that is a separate decision.
 */
const FIELD =
  'w-full bg-sa-gray border border-sa-border rounded-[4px] px-[11px] py-[9px] text-sa-white text-meta outline-none box-border'

/** Text fields that should use the page font rather than the browser default. */
const FIELD_INHERIT = `${FIELD} font-[inherit]`

const LABEL =
  'block text-sa-dim text-micro uppercase tracking-[0.09em] mb-1 font-semibold font-mono'

const BTN_BASE = 'rounded-[4px] text-meta min-h-[40px] cursor-pointer'

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
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="mb-5"
    >
      <form
        onSubmit={onSubmit}
        className="bg-sa-surface border border-sa-border rounded-[6px] p-5 grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-[0.85rem] items-end"
      >
        <div>
          {/* Labels are wired to their inputs by id. They were bare <label>
              elements with no htmlFor, so clicking one did nothing and a screen
              reader announced the field unnamed (WCAG 1.3.1 / 4.1.2). */}
          <label className={LABEL} htmlFor="invoice-client">
            Client name
          </label>
          <input
            id="invoice-client"
            value={form.client}
            onChange={(e) => setForm((f) => ({ ...f, client: e.target.value }))}
            placeholder="Acme Ltd"
            className={FIELD_INHERIT}
            required
          />
        </div>

        <div>
          <label className={LABEL} htmlFor="invoice-number">
            Invoice #
          </label>
          <input
            id="invoice-number"
            value={form.number}
            onChange={(e) => setForm((f) => ({ ...f, number: e.target.value }))}
            placeholder={nextNumber}
            className={FIELD}
          />
        </div>

        <div className="col-span-2">
          <label className={LABEL} htmlFor="invoice-description">
            Description / services
          </label>
          <input
            id="invoice-description"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="Web development — April 2026"
            className={FIELD_INHERIT}
          />
        </div>

        <div>
          <label className={LABEL} htmlFor="invoice-date">
            Invoice date
          </label>
          <input
            id="invoice-date"
            type="date"
            value={form.date}
            onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
            className={FIELD}
          />
        </div>

        <div>
          <label className={LABEL} htmlFor="invoice-due-date">
            Due date
          </label>
          <input
            id="invoice-due-date"
            type="date"
            value={form.dueDate}
            onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
            className={FIELD}
          />
        </div>

        <div>
          <label className={LABEL} htmlFor="invoice-amount">
            Net amount (£)
          </label>
          <input
            id="invoice-amount"
            type="number"
            min={0}
            step={0.01}
            value={form.amount}
            onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
            placeholder="0.00"
            className={FIELD}
            required
          />
        </div>

        <div className="flex flex-col gap-[6px]">
          <label className={LABEL} htmlFor="invoice-vat-treatment">
            VAT treatment
          </label>
          <select
            id="invoice-vat-treatment"
            value={form.vatTreatment}
            onChange={(e) =>
              setForm((f) => ({ ...f, vatTreatment: e.target.value as VatTreatment }))
            }
            className={`${FIELD} cursor-pointer`}
          >
            {(Object.keys(VAT_TREATMENT_LABELS) as VatTreatment[]).map((t) => (
              <option key={t} value={t}>
                {VAT_TREATMENT_LABELS[t]}
              </option>
            ))}
          </select>
          <span className="text-sa-muted text-micro leading-[1.4]">
            {VAT_TREATMENT_HINTS[form.vatTreatment]}
          </span>
        </div>

        <div className="flex gap-[0.4rem]">
          <button
            type="submit"
            className={`${BTN_BASE} flex-1 bg-sa-white text-sa-black border-none p-[9px] font-semibold tracking-[-0.01em]`}
          >
            Create
          </button>
          <button
            type="button"
            onClick={onCancel}
            className={`${BTN_BASE} bg-transparent text-sa-muted border border-sa-border px-3 py-[9px]`}
          >
            Cancel
          </button>
        </div>
      </form>
    </motion.div>
  )
}
