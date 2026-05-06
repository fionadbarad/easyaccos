'use client'

import { useState } from 'react'
import { X, Camera, Sparkles, Loader2, CheckCircle2 } from 'lucide-react'
import type { PendingScan } from '@/lib/hooks/useExpenses'
import { CATEGORIES } from '@/lib/hooks/useExpenses'

const INPUT_MONO = 'w-full bg-[var(--sa-gray)] border border-[var(--sa-border)] rounded-[4px] px-[11px] py-[9px] text-[var(--sa-white)] text-[0.84rem] outline-none font-mono'
const INPUT_BASE = 'w-full bg-[var(--sa-gray)] border border-[var(--sa-border)] rounded-[4px] px-[11px] py-[9px] text-[var(--sa-white)] text-[0.84rem] outline-none'
const LABEL_S = 'block text-[rgba(244,245,248,0.42)] text-[0.62rem] uppercase tracking-[0.08em] mb-[4px] font-semibold'

export function ReceiptVerifyModal({
  scan,
  onConfirm,
  onCancel,
}: {
  scan: PendingScan
  onConfirm: (form: PendingScan['form']) => void
  onCancel: () => void
}) {
  const [form, setForm]          = useState(scan.form)
  const [suggesting, setSugging] = useState(false)
  const isImage = scan.extract.fileType.startsWith('image/')

  async function suggestCategory() {
    if (!form.description.trim() || suggesting) return
    setSugging(true)
    try {
      const res = await fetch('/api/ai/categorise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: form.description, amount: form.amount ? parseFloat(form.amount) : undefined }),
      })
      const data = await res.json()
      if (data.category && CATEGORIES.includes(data.category)) {
        setForm(f => ({ ...f, category: data.category }))
      }
    } catch (err) {
      console.error('Category suggestion failed:', err)
    } finally { setSugging(false) }
  }

  return (
    <div className="fixed inset-0 bg-[rgba(0,0,0,0.72)] flex items-center justify-center z-[60] p-4">
      <div className="bg-[var(--sa-surface)] border border-[var(--sa-border)] rounded-[8px] w-full max-w-[860px] max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex justify-between items-center px-5 py-4 border-b border-[var(--sa-border)]">
          <div>
            <div className="text-[rgba(244,245,248,0.42)] text-[0.6rem] uppercase tracking-[0.1em] font-mono mb-[2px]">
              OCR · Split-View Verification
            </div>
            <h3 className="text-[var(--sa-white)] text-[0.95rem] font-semibold m-0">Verify Receipt Details</h3>
          </div>
          <button onClick={onCancel} className="bg-transparent border-0 text-[rgba(244,245,248,0.42)] cursor-pointer p-1">
            <X size={16} />
          </button>
        </div>

        <div className="grid grid-cols-2 flex-1 overflow-hidden min-h-0">
          <div className="border-r border-[var(--sa-border)] overflow-y-auto bg-[var(--sa-black)] flex items-start justify-center p-4">
            {isImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={scan.extract.imageUrl} alt="Receipt" className="max-w-full rounded-[4px] border border-[var(--sa-border)]" />
            ) : (
              <div className="flex flex-col items-center justify-center h-[200px] text-[rgba(244,245,248,0.42)] gap-3">
                <Camera size={32} strokeWidth={1.2} />
                <span className="text-[0.75rem] font-mono">PDF receipt</span>
              </div>
            )}
          </div>

          <div className="overflow-y-auto p-5 flex flex-col gap-4">
            {scan.extract.date && (
              <div className="inline-flex items-center gap-[6px] bg-[rgba(147,197,253,0.08)] border border-[rgba(147,197,253,0.2)] rounded-[4px] px-[10px] py-[5px] self-start">
                <Camera size={10} className="text-[#93C5FD]" />
                <span className="text-[#93C5FD] text-[0.68rem] font-mono">
                  Extracted date: {scan.extract.date}
                </span>
              </div>
            )}

            <div>
              <label className={LABEL_S}>Date</label>
              <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className={INPUT_MONO} />
            </div>
            <div>
              <label className={LABEL_S}>Description</label>
              <input type="text" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className={INPUT_BASE} />
            </div>
            <div>
              <label className={LABEL_S}>
                Category
                <button type="button" onClick={suggestCategory} disabled={!form.description.trim() || suggesting}
                  className={`ml-[6px] bg-transparent border border-[var(--sa-border)] rounded-[3px] px-[6px] py-[1px] text-[0.58rem] inline-flex items-center gap-[3px] align-middle ${suggesting ? 'text-[rgba(244,245,248,0.42)] cursor-default' : 'text-[var(--sa-white)] cursor-pointer'}`}>
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
              <input type="number" min={0} step={0.01} value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="0.00" className={INPUT_MONO} />
            </div>

            <details className="mt-auto">
              <summary className="text-[rgba(244,245,248,0.42)] text-[0.68rem] cursor-pointer font-mono tracking-[0.04em]">
                Raw OCR text
              </summary>
              <pre className="text-[rgba(244,245,248,0.3)] text-[0.65rem] mt-2 whitespace-pre-wrap break-words font-mono max-h-[120px] overflow-y-auto bg-[var(--sa-black)] border border-[var(--sa-border)] rounded-[4px] p-2">
                {scan.extract.raw || '(empty)'}
              </pre>
            </details>
          </div>
        </div>

        <div className="flex justify-end gap-2 px-5 py-[0.875rem] border-t border-[var(--sa-border)]">
          <button onClick={onCancel} className="bg-transparent text-[rgba(244,245,248,0.42)] border border-[var(--sa-border)] rounded-[4px] px-4 py-2 cursor-pointer text-[0.8rem]">
            Cancel
          </button>
          <button onClick={() => onConfirm(form)} className="flex items-center gap-[6px] bg-[var(--sa-white)] text-[var(--sa-black)] border-0 rounded-[4px] px-[18px] py-2 font-semibold cursor-pointer text-[0.8rem]">
            <CheckCircle2 size={13} /> Confirm & Add
          </button>
        </div>
      </div>
    </div>
  )
}
