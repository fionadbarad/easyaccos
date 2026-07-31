'use client'

import { useState } from 'react'
import { X, Camera, CheckCircle2, AlertTriangle } from 'lucide-react'
import type { PendingScan } from '@/lib/hooks/useExpenses'
import { CATEGORIES } from '@/lib/hooks/useExpenses'

import { C } from '@/styles/palette'
import { T } from '@/styles/type'
const inputS: React.CSSProperties = {
  background: C.gray,
  border: `1px solid ${C.border}`,
  borderRadius: '4px',
  padding: '9px 11px',
  color: C.white,
  fontSize: T.meta,
  outline: 'none',
  boxSizing: 'border-box',
  width: '100%',
  fontFamily: 'var(--font-geist-mono), monospace',
}

/** Amber caution used where OCR is telling the user it is unsure. */
const warnBoxS: React.CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: '7px',
  background: 'rgba(251,191,36,0.08)',
  border: '1px solid rgba(251,191,36,0.28)',
  borderRadius: '4px',
  padding: '7px 10px',
  marginTop: '6px',
}

const warnTextS: React.CSSProperties = {
  color: '#FBBF24',
  fontSize: T.micro,
  lineHeight: 1.45,
}

const labelS: React.CSSProperties = {
  display: 'block',
  color: C.muted,
  fontSize: T.micro,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  marginBottom: '4px',
  fontWeight: 600,
}

export function ReceiptVerifyModal({
  scan,
  onConfirm,
  onCancel,
}: {
  scan: PendingScan
  onConfirm: (form: PendingScan['form']) => void
  onCancel: () => void
}) {
  const [form, setForm] = useState(scan.form)
  const isImage = scan.extract.fileType.startsWith('image/')

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.72)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 60,
        padding: '1rem',
      }}
    >
      <div
        style={{
          background: C.surface,
          border: `1px solid ${C.border}`,
          borderRadius: '8px',
          width: '100%',
          maxWidth: '860px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '1rem 1.25rem',
            borderBottom: `1px solid ${C.border}`,
          }}
        >
          <div>
            <div
              style={{
                color: C.muted,
                fontSize: T.micro,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                fontFamily: 'var(--font-geist-mono), monospace',
                marginBottom: '2px',
              }}
            >
              OCR · Split-View Verification
            </div>
            <h3 style={{ color: C.white, fontSize: T.lead, fontWeight: 600, margin: 0 }}>
              Verify Receipt Details
            </h3>
          </div>
          <button
            onClick={onCancel}
            aria-label="Close and discard scanned receipt"
            style={{
              background: 'none',
              border: 'none',
              color: C.muted,
              cursor: 'pointer',
              padding: '4px',
            }}
          >
            <X size={16} />
          </button>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            flex: 1,
            overflow: 'hidden',
            minHeight: 0,
          }}
        >
          <div
            style={{
              borderRight: `1px solid ${C.border}`,
              overflowY: 'auto',
              background: C.bg,
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'center',
              padding: '1rem',
            }}
          >
            {isImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={scan.extract.imageUrl}
                alt="Receipt"
                style={{ maxWidth: '100%', borderRadius: '4px', border: `1px solid ${C.border}` }}
              />
            ) : (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '200px',
                  color: C.muted,
                  gap: '0.75rem',
                }}
              >
                <Camera size={32} strokeWidth={1.2} />
                <span
                  style={{ fontSize: T.caption, fontFamily: 'var(--font-geist-mono), monospace' }}
                >
                  PDF receipt
                </span>
              </div>
            )}
          </div>

          <div
            style={{
              overflowY: 'auto',
              padding: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
            }}
          >
            {scan.extract.date && (
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'rgba(147,197,253,0.08)',
                  border: '1px solid rgba(147,197,253,0.2)',
                  borderRadius: '4px',
                  padding: '5px 10px',
                  alignSelf: 'flex-start',
                }}
              >
                <Camera size={12} style={{ color: C.blue }} />
                <span
                  style={{
                    color: C.blue,
                    fontSize: T.micro,
                    fontFamily: 'var(--font-geist-mono), monospace',
                  }}
                >
                  Extracted date: {scan.extract.date}
                </span>
              </div>
            )}

            <div>
              <label style={labelS}>Date</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                style={inputS}
              />
              {scan.extract.dateAlternative && (
                <div style={warnBoxS}>
                  <AlertTriangle
                    size={12}
                    style={{ color: '#FBBF24', flexShrink: 0, marginTop: 1 }}
                  />
                  <div style={warnTextS}>
                    This date could be read either way round. We assumed UK order (day first).{' '}
                    <button
                      type="button"
                      onClick={() =>
                        setForm((f) => ({
                          ...f,
                          date:
                            f.date === scan.extract.dateAlternative
                              ? (scan.extract.date ?? f.date)
                              : (scan.extract.dateAlternative ?? f.date),
                        }))
                      }
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#FBBF24',
                        textDecoration: 'underline',
                        cursor: 'pointer',
                        padding: 0,
                        fontSize: T.micro,
                        fontFamily: 'inherit',
                      }}
                    >
                      Use{' '}
                      {form.date === scan.extract.dateAlternative
                        ? scan.extract.date
                        : scan.extract.dateAlternative}{' '}
                      instead
                    </button>
                  </div>
                </div>
              )}
            </div>
            <div>
              <label style={labelS}>Description</label>
              <input
                type="text"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                style={{ ...inputS, fontFamily: 'inherit' }}
              />
            </div>
            <div>
              <label style={labelS}>Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                style={{ ...inputS, cursor: 'pointer' }}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelS}>Amount (£)</label>
              <input
                type="number"
                min={0}
                step={0.01}
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                placeholder="0.00"
                style={inputS}
              />
              {scan.extract.amountConfidence === 'guessed' && (
                <div style={warnBoxS}>
                  <AlertTriangle
                    size={12}
                    style={{ color: '#FBBF24', flexShrink: 0, marginTop: 1 }}
                  />
                  <div style={warnTextS}>
                    No line on this receipt was labelled &ldquo;total&rdquo;, so this is the largest
                    amount we could find — it may be the cash tendered or a running balance. Please
                    check it against the image.
                  </div>
                </div>
              )}
              {scan.extract.amountConfidence === 'none' && (
                <div style={warnBoxS}>
                  <AlertTriangle
                    size={12}
                    style={{ color: '#FBBF24', flexShrink: 0, marginTop: 1 }}
                  />
                  <div style={warnTextS}>
                    We couldn&rsquo;t read an amount from this receipt. Please enter it manually.
                  </div>
                </div>
              )}
            </div>

            <details style={{ marginTop: 'auto' }}>
              <summary
                style={{
                  color: C.muted,
                  fontSize: T.micro,
                  cursor: 'pointer',
                  fontFamily: 'var(--font-geist-mono), monospace',
                  letterSpacing: '0.04em',
                }}
              >
                Raw OCR text
              </summary>
              <pre
                style={{
                  color: 'rgba(244,245,248,0.3)',
                  fontSize: T.micro,
                  marginTop: '0.5rem',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  fontFamily: 'var(--font-geist-mono), monospace',
                  maxHeight: '120px',
                  overflowY: 'auto',
                  background: C.bg,
                  border: `1px solid ${C.border}`,
                  borderRadius: '4px',
                  padding: '0.5rem',
                }}
              >
                {scan.extract.raw || '(empty)'}
              </pre>
            </details>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '0.5rem',
            padding: '0.875rem 1.25rem',
            borderTop: `1px solid ${C.border}`,
          }}
        >
          <button
            onClick={onCancel}
            style={{
              background: 'transparent',
              color: C.muted,
              border: `1px solid ${C.border}`,
              borderRadius: '4px',
              padding: '8px 16px',
              cursor: 'pointer',
              fontSize: T.meta,
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(form)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: C.white,
              color: C.bg,
              border: 'none',
              borderRadius: '4px',
              padding: '8px 18px',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: T.meta,
            }}
          >
            <CheckCircle2 size={12} /> Confirm & Add
          </button>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
