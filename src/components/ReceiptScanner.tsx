'use client'

import { useState, useRef } from 'react'
import { Camera, Loader2, X } from 'lucide-react'

export interface ReceiptExtract {
  description: string
  amount: number | null
  date: string | null
  raw: string
  imageUrl: string   // blob URL — caller must revoke when done
  fileType: string   // MIME type of the uploaded file
}

interface Props {
  onExtract: (data: ReceiptExtract) => void
}

function parseReceipt(raw: string): Omit<ReceiptExtract, 'raw' | 'imageUrl' | 'fileType'> {
  const text = raw.replace(/\r/g, '')
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)

  const amountRegex = /(?:£\s?|gbp\s?|total\s*[:\-]?\s*|amount\s*[:\-]?\s*|grand\s*total\s*[:\-]?\s*)(\d{1,6}[.,]\d{2})/i
  const allNums = Array.from(text.matchAll(/(\d{1,6}[.,]\d{2})/g)).map((m) => parseFloat(m[1].replace(',', '.')))
  const totalLine = lines.find((l) => /total|amount due|grand total/i.test(l))
  let amount: number | null = null
  if (totalLine) {
    const m = totalLine.match(/(\d{1,6}[.,]\d{2})/)
    if (m) amount = parseFloat(m[1].replace(',', '.'))
  }
  if (amount == null) {
    const m = text.match(amountRegex)
    if (m) amount = parseFloat(m[1].replace(',', '.'))
  }
  if (amount == null && allNums.length) amount = Math.max(...allNums)

  let date: string | null = null
  const dmY = text.match(/(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/)
  const iso = text.match(/(\d{4})-(\d{2})-(\d{2})/)
  const mmm = text.match(/(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{2,4})/i)
  if (iso) {
    date = `${iso[1]}-${iso[2]}-${iso[3]}`
  } else if (dmY) {
    let y = dmY[3]
    if (y.length === 2) y = `20${y}`
    date = `${y}-${dmY[2].padStart(2, '0')}-${dmY[1].padStart(2, '0')}`
  } else if (mmm) {
    const months = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec']
    const mi = months.indexOf(mmm[2].toLowerCase().slice(0, 3))
    let y = mmm[3]
    if (y.length === 2) y = `20${y}`
    if (mi >= 0) date = `${y}-${String(mi + 1).padStart(2, '0')}-${mmm[1].padStart(2, '0')}`
  }

  const description = (lines.find((l) => /[a-zA-Z]{3,}/.test(l) && !/receipt|vat|invoice/i.test(l)) || lines[0] || 'Receipt').slice(0, 80)

  return { description, amount, date }
}

export default function ReceiptScanner({ onExtract }: Props) {
  const [open, setOpen]         = useState(false)
  const [progress, setProgress] = useState(0)
  const [status, setStatus]     = useState('')
  const [error, setError]       = useState('')
  const [busy, setBusy]         = useState(false)

  // Holds the blob URL of the current file; revoked if we close without extracting
  const blobUrlRef = useRef<string>('')

  function close() {
    if (!busy) {
      if (blobUrlRef.current) { URL.revokeObjectURL(blobUrlRef.current); blobUrlRef.current = '' }
      setOpen(false)
      setError('')
      setProgress(0)
      setStatus('')
    }
  }

  async function handleFile(file: File) {
    setError('')
    setBusy(true)
    setStatus('Loading OCR engine…')
    setProgress(2)

    // Create object URL now so we can pass it to the parent for the preview modal
    if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current)
    blobUrlRef.current = URL.createObjectURL(file)
    const imageUrl = blobUrlRef.current

    try {
      const Tesseract = (await import('tesseract.js')).default
      const result = await Tesseract.recognize(file, 'eng', {
        logger: (m: { status: string; progress: number }) => {
          if (m.status) setStatus(m.status.replace(/_/g, ' '))
          if (typeof m.progress === 'number') setProgress(Math.round(m.progress * 100))
        },
      })
      const raw = result.data.text || ''
      const parsed = parseReceipt(raw)
      // Pass imageUrl to parent — parent is responsible for revoking it
      blobUrlRef.current = ''
      onExtract({ ...parsed, raw, imageUrl, fileType: file.type })
      setStatus('Done')
      setOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'OCR failed')
    } finally {
      setBusy(false)
      setProgress(0)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-[6px] bg-transparent text-[rgba(244,245,248,0.42)] border border-[var(--sa-border)] rounded-[4px] px-[14px] py-[8px] text-[0.78rem] font-medium cursor-pointer min-h-[36px]"
      >
        <Camera size={13} /> Scan Receipt
      </button>

      {open && (
        <div className="fixed inset-0 bg-[rgba(0,0,0,0.6)] flex items-center justify-center z-50 p-[1rem]">
          <div className="bg-[var(--sa-surface)] border border-[var(--sa-border)] rounded-[6px] p-[1.5rem] max-w-[440px] w-full">
            <div className="flex justify-between items-start mb-[0.75rem]">
              <div>
                <h3 className="text-[var(--sa-white)] text-[0.95rem] font-semibold m-0">Scan a receipt</h3>
                <p className="text-[rgba(244,245,248,0.42)] text-[0.72rem] mt-[4px] mb-0">
                  Runs client-side. Nothing is uploaded.
                </p>
              </div>
              <button onClick={close}
                className={`bg-transparent border-none text-[rgba(244,245,248,0.42)] ${busy ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                <X size={16} />
              </button>
            </div>

            {!busy ? (
              <label className="flex flex-col items-center gap-[0.5rem] border border-dashed border-[var(--sa-border)] rounded-[6px] p-[2rem_1rem] cursor-pointer text-[rgba(244,245,248,0.42)] text-[0.8rem]">
                <Camera size={24} />
                Tap to choose a photo or PDF of your receipt
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) handleFile(f)
                  }}
                />
              </label>
            ) : (
              <div className="py-[1.5rem] text-center">
                <Loader2 size={20} className="text-[var(--sa-white)] animate-spin mx-auto" />
                <div className="text-[var(--sa-white)] text-[0.82rem] mt-[0.75rem]">{status}</div>
                <div className="text-[rgba(244,245,248,0.42)] text-[0.72rem] mt-[4px] font-mono">
                  {progress}%
                </div>
                <div className="bg-[var(--sa-gray)] h-[3px] rounded-[2px] mt-[0.75rem] overflow-hidden">
                  <div className="bg-[#4ADE80] h-full transition-[width] duration-300" style={{ width: `${progress}%` }} />
                </div>
              </div>
            )}

            {error && (
              <div className="text-[#F87171] text-[0.75rem] mt-[0.75rem]">{error}</div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
