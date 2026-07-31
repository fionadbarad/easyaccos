'use client'

import { useState, useRef } from 'react'
import { Camera, Loader2, X } from 'lucide-react'

/**
 * How the amount was arrived at.
 * - `labelled`  — read off a line that named itself ("Total", "Amount due").
 * - `guessed`   — no such line existed, so we took the largest money-shaped
 *                 number on the receipt. Frequently right, but it will happily
 *                 pick up a cash-tendered figure or a loyalty balance (OCR-2).
 */
export type AmountConfidence = 'labelled' | 'guessed' | 'none'

export interface ReceiptExtract {
  description: string
  amount: number | null
  date: string | null
  raw: string
  imageUrl: string // blob URL — caller must revoke when done
  fileType: string // MIME type of the uploaded file
  amountConfidence: AmountConfidence
  /**
   * Set when a numeric date could be read either way round — e.g. "05/04/2026"
   * is 5 April to a UK reader and 4 May to a US one. Holds the interpretation
   * we did *not* choose, so the user can swap to it in one click (OCR-3).
   */
  dateAlternative: string | null
}

interface Props {
  onExtract: (data: ReceiptExtract) => void
}

import { C } from '@/styles/palette'
import { T } from '@/styles/type'
export function parseReceipt(raw: string): Omit<ReceiptExtract, 'raw' | 'imageUrl' | 'fileType'> {
  const text = raw.replace(/\r/g, '')
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)

  const amountRegex =
    /(?:£\s?|gbp\s?|total\s*[:\-]?\s*|amount\s*[:\-]?\s*|grand\s*total\s*[:\-]?\s*)(\d{1,6}[.,]\d{2})/i
  const allNums = Array.from(text.matchAll(/(\d{1,6}[.,]\d{2})/g)).map((m) =>
    parseFloat((m[1] ?? '0').replace(',', '.')),
  )
  const totalLine = lines.find((l) => /total|amount due|grand total/i.test(l))
  let amount: number | null = null
  let amountConfidence: AmountConfidence = 'none'
  if (totalLine) {
    const m = totalLine.match(/(\d{1,6}[.,]\d{2})/)
    if (m?.[1]) {
      amount = parseFloat(m[1].replace(',', '.'))
      amountConfidence = 'labelled'
    }
  }
  if (amount == null) {
    const m = text.match(amountRegex)
    if (m?.[1]) {
      amount = parseFloat(m[1].replace(',', '.'))
      amountConfidence = 'labelled'
    }
  }
  if (amount == null && allNums.length) {
    // Last resort: nothing on the receipt said "total", so the biggest
    // money-shaped number is the best available guess. Flag it so the user is
    // asked to confirm rather than being handed a silent guess (OCR-2).
    amount = Math.max(...allNums)
    amountConfidence = 'guessed'
  }

  let date: string | null = null
  let dateAlternative: string | null = null
  const dmY = text.match(/(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/)
  const iso = text.match(/(\d{4})-(\d{2})-(\d{2})/)
  const mmm = text.match(
    /(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{2,4})/i,
  )
  if (iso?.[1] && iso[2] && iso[3]) {
    date = `${iso[1]}-${iso[2]}-${iso[3]}`
  } else if (dmY?.[1] && dmY[2] && dmY[3]) {
    let y = dmY[3]
    if (y.length === 2) y = `20${y}`
    const first = dmY[1].padStart(2, '0')
    const second = dmY[2].padStart(2, '0')
    // UK-first reading: DD/MM/YYYY.
    date = `${y}-${second}-${first}`
    // When both components are 1-12 the string is genuinely reversible and the
    // US reading (MM/DD) is an equally valid parse of the same pixels. Offer it
    // rather than silently committing to one (OCR-3). Equal parts read the same
    // either way, so there is nothing to disambiguate.
    if (Number(first) <= 12 && Number(second) <= 12 && first !== second) {
      dateAlternative = `${y}-${first}-${second}`
    }
  } else if (mmm?.[1] && mmm[2] && mmm[3]) {
    const months = [
      'jan',
      'feb',
      'mar',
      'apr',
      'may',
      'jun',
      'jul',
      'aug',
      'sep',
      'oct',
      'nov',
      'dec',
    ]
    const mi = months.indexOf(mmm[2].toLowerCase().slice(0, 3))
    let y = mmm[3]
    if (y.length === 2) y = `20${y}`
    if (mi >= 0) date = `${y}-${String(mi + 1).padStart(2, '0')}-${mmm[1].padStart(2, '0')}`
  }

  const description = (
    lines.find((l) => /[a-zA-Z]{3,}/.test(l) && !/receipt|vat|invoice/i.test(l)) ||
    lines[0] ||
    'Receipt'
  ).slice(0, 80)

  return { description, amount, date, amountConfidence, dateAlternative }
}

export default function ReceiptScanner({ onExtract }: Props) {
  const [open, setOpen] = useState(false)
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  // Holds the blob URL of the current file; revoked if we close without extracting
  const blobUrlRef = useRef<string>('')

  function close() {
    if (!busy) {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current)
        blobUrlRef.current = ''
      }
      setOpen(false)
      setError('')
      setProgress(0)
      setStatus('')
    }
  }

  async function handleFile(file: File) {
    setError('')
    // The client-side OCR engine (tesseract.js) reads raster images only — it
    // cannot decode a PDF. Reject non-images up front with a clear message
    // instead of letting recognize() fail cryptically (OCR-1).
    if (!file.type.startsWith('image/')) {
      setError('Please choose a photo/image of your receipt — PDFs are not supported.')
      return
    }
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
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          background: 'transparent',
          color: C.muted,
          border: `1px solid ${C.border}`,
          borderRadius: '4px',
          padding: '8px 14px',
          fontSize: T.caption,
          fontWeight: 500,
          cursor: 'pointer',
          minHeight: '36px',
        }}
      >
        <Camera size={12} /> Scan Receipt
      </button>

      {open && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
            padding: '1rem',
          }}
        >
          <div
            style={{
              background: C.surface,
              border: `1px solid ${C.border}`,
              borderRadius: '6px',
              padding: '1.5rem',
              maxWidth: '440px',
              width: '100%',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '0.75rem',
              }}
            >
              <div>
                <h3 style={{ color: C.white, fontSize: T.lead, fontWeight: 600, margin: 0 }}>
                  Scan a receipt
                </h3>
                <p style={{ color: C.muted, fontSize: T.caption, margin: '4px 0 0' }}>
                  Runs client-side. Nothing is uploaded.
                </p>
              </div>
              <button
                onClick={close}
                aria-label="Close receipt scanner"
                style={{
                  background: 'none',
                  border: 'none',
                  color: C.muted,
                  cursor: busy ? 'not-allowed' : 'pointer',
                }}
              >
                <X size={16} />
              </button>
            </div>

            {!busy ? (
              <label
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.5rem',
                  border: `1px dashed ${C.border}`,
                  borderRadius: '6px',
                  padding: '2rem 1rem',
                  cursor: 'pointer',
                  color: C.muted,
                  fontSize: T.meta,
                }}
              >
                <Camera size={24} />
                Tap to choose a photo of your receipt
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) handleFile(f)
                  }}
                />
              </label>
            ) : (
              <div style={{ padding: '1.5rem 0', textAlign: 'center' }}>
                <Loader2
                  size={20}
                  style={{ color: C.white, animation: 'spin 1s linear infinite' }}
                />
                <div style={{ color: C.white, fontSize: T.meta, marginTop: '0.75rem' }}>
                  {status}
                </div>
                <div
                  style={{
                    color: C.muted,
                    fontSize: T.caption,
                    marginTop: '4px',
                    fontFamily: 'var(--font-geist-mono), monospace',
                  }}
                >
                  {progress}%
                </div>
                <div
                  style={{
                    background: C.gray,
                    height: '3px',
                    borderRadius: '2px',
                    marginTop: '0.75rem',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      background: C.green,
                      height: '100%',
                      width: `${progress}%`,
                      transition: 'width 0.3s',
                    }}
                  />
                </div>
              </div>
            )}

            {error && (
              <div style={{ color: C.red, fontSize: T.caption, marginTop: '0.75rem' }}>{error}</div>
            )}

            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        </div>
      )}
    </>
  )
}
