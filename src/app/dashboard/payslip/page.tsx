'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { FileText, Upload, AlertCircle, CheckCircle2, Loader2, LogIn } from 'lucide-react'
import { fmtGBP } from '@/lib/formatters'
import { createClient, isSupabaseConfigured } from '@/lib/supabase-browser'
import type { Payslip } from '@/features/ocr/payslipParser'

/**
 * Payslip reader.
 *
 * The image is posted to /api/payslip/parse, where OCR and field extraction
 * both run on our own server — nothing about this page sends a payslip to a
 * third party. The result is always presented as "check these figures" rather
 * than as fact: a deterministic parser is honest about what it could not find,
 * and the numbers on this page end up in someone's tax return.
 */

/** Mirrors the failure body of /api/payslip/parse. */
interface ParseError {
  error: string
  partial?: Partial<Record<keyof Payslip, unknown>>
}

interface ParseOk {
  data: Payslip
  notes: string[]
}

const FIELD_LABELS: Record<keyof Payslip, string> = {
  employerName: 'Employer',
  taxCode: 'Tax code',
  grossPay: 'Gross pay',
  taxPaid: 'Income tax (PAYE)',
  nationalInsurance: 'National Insurance',
}

const MONEY_FIELDS = new Set<keyof Payslip>(['grossPay', 'taxPaid', 'nationalInsurance'])

function renderValue(field: keyof Payslip, value: unknown): string {
  if (value === undefined || value === null || value === '') return '—'
  if (MONEY_FIELDS.has(field) && typeof value === 'number') return fmtGBP(value)
  return String(value)
}

export default function PayslipPage() {
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<ParseOk | null>(null)
  const [failure, setFailure] = useState<ParseError | null>(null)
  // undefined while the session is still resolving — the uploader must not
  // flash into view and then be replaced by a sign-in prompt. Seeded lazily
  // rather than set from the effect: with no Supabase credentials the answer is
  // known at first render, and writing it in an effect instead costs a second
  // render for nothing (react-hooks/set-state-in-effect).
  const [signedIn, setSignedIn] = useState<boolean | undefined>(() =>
    isSupabaseConfigured ? undefined : false,
  )
  const inputRef = useRef<HTMLInputElement>(null)

  // The rest of /dashboard works in guest mode, but this route does not: the
  // API requires a session because a payslip is personal data, so the state has
  // to be known here rather than discovered as a 401 after the upload.
  useEffect(() => {
    if (!isSupabaseConfigured) return
    let mounted = true
    void createClient()
      .auth.getUser()
      .then(({ data }) => {
        if (mounted) setSignedIn(Boolean(data.user))
      })
      .catch(() => {
        if (mounted) setSignedIn(false)
      })
    return () => {
      mounted = false
    }
  }, [])

  async function handleFile(file: File) {
    setBusy(true)
    setResult(null)
    setFailure(null)

    try {
      const body = new FormData()
      body.append('file', file)
      const res = await fetch('/api/payslip/parse', { method: 'POST', body })
      const json = await res.json()

      if (res.ok) {
        setResult(json as ParseOk)
      } else if (res.status === 401) {
        // Backstop for a session that expired between page load and upload:
        // swap the control for the sign-in prompt rather than surfacing the
        // API's bare "Unauthorized".
        setSignedIn(false)
      } else {
        setFailure(json as ParseError)
      }
    } catch {
      // A network failure, not a parse failure — say which, so the user knows
      // whether retrying or re-photographing is the right response.
      setFailure({ error: 'Could not reach the server. Check your connection and try again.' })
    } finally {
      setBusy(false)
      // Clear the input so choosing the same file twice fires onChange again.
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const partial = failure?.partial

  return (
    <div className="max-w-[720px]">
      <div className="flex items-center gap-4 mb-3">
        <div className="w-[52px] h-[52px] rounded-xl bg-sa-hover border border-sa-border flex items-center justify-center">
          <FileText size={24} className="text-sa-white" />
        </div>
        <div>
          <h1 className="text-h2 font-bold m-0">Payslip Reader</h1>
          <p className="text-sa-muted text-body m-0 mt-1">
            Read the figures off a photo of your payslip.
          </p>
        </div>
      </div>

      <p className="text-sa-muted text-meta leading-[1.7] mb-6 max-w-[620px]">
        The image is processed on our own servers and is not stored or sent to anyone else. Always
        check the figures against the payslip itself before using them — a scan is only ever as good
        as the photo.
      </p>

      {signedIn === false && (
        <div className="flex flex-col items-center justify-center gap-3 border border-dashed border-sa-line rounded-lg py-10 px-6 text-center">
          <LogIn size={22} className="text-sa-muted" />
          <span className="text-body font-medium">Sign in to read a payslip</span>
          <span className="text-sa-dim text-caption max-w-[380px]">
            Unlike the rest of the dashboard, this tool needs an account — a payslip is personal
            data, so the upload is tied to a signed-in session rather than accepted from anyone.
          </span>
          <Link
            href="/auth/login"
            className="mt-1 text-sa-white text-caption underline underline-offset-2"
          >
            Sign in →
          </Link>
        </div>
      )}

      {/* Rendered conditionally rather than with the `hidden` attribute: the
          utility classes here set display:flex, which fights [hidden] in the
          cascade and leaves the control visible on some builds. */}
      {signedIn === true && (
        <label
          className={`flex flex-col items-center justify-center gap-3 border border-dashed border-sa-line rounded-lg py-10 px-6 text-center ${
            busy ? 'opacity-60 cursor-wait' : 'cursor-pointer hover:bg-sa-hover'
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/bmp,image/tiff"
            className="hidden"
            disabled={busy}
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) void handleFile(file)
            }}
          />
          {busy ? (
            <Loader2 size={22} className="text-sa-muted animate-spin" />
          ) : (
            <Upload size={22} className="text-sa-muted" />
          )}
          <span className="text-body font-medium">
            {busy ? 'Reading your payslip…' : 'Choose a photo or scan'}
          </span>
          <span className="text-sa-dim text-caption">
            PNG, JPEG, WebP, BMP or TIFF — up to 8 MB
          </span>
        </label>
      )}

      {result && (
        <section className="mt-6 bg-sa-surface border border-sa-border rounded-lg p-5">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle2 size={18} className="text-sa-green" />
            <h2 className="text-title font-semibold m-0">Check these figures</h2>
          </div>

          <dl className="flex flex-col gap-[6px] font-mono text-meta m-0">
            {(Object.keys(FIELD_LABELS) as (keyof Payslip)[]).map((field) => (
              <div key={field} className="flex justify-between gap-4">
                <dt className="text-sa-muted font-sans">{FIELD_LABELS[field]}</dt>
                <dd className="tabular-nums m-0">{renderValue(field, result.data[field])}</dd>
              </div>
            ))}
          </dl>

          {result.notes.length > 0 && (
            <ul className="mt-4 pt-4 border-t border-sa-border flex flex-col gap-2 m-0 pl-0 list-none">
              {result.notes.map((note) => (
                <li key={note} className="flex items-start gap-2 text-sa-muted text-caption">
                  <AlertCircle size={14} className="text-sa-amber shrink-0 mt-[2px]" />
                  {note}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {failure && (
        <section className="mt-6 bg-sa-red-tint border border-sa-red-line rounded-lg p-5">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle size={18} className="text-sa-red" />
            <h2 className="text-title font-semibold m-0">{failure.error}</h2>
          </div>

          {partial ? (
            <>
              <p className="text-sa-muted text-caption mb-4 mt-1">
                This much was readable — the rest will need typing in by hand.
              </p>
              <dl className="flex flex-col gap-[6px] font-mono text-meta m-0">
                {(Object.keys(FIELD_LABELS) as (keyof Payslip)[]).map((field) => (
                  <div key={field} className="flex justify-between gap-4">
                    <dt className="text-sa-muted font-sans">{FIELD_LABELS[field]}</dt>
                    <dd className="tabular-nums m-0">{renderValue(field, partial[field])}</dd>
                  </div>
                ))}
              </dl>
            </>
          ) : (
            <p className="text-sa-muted text-caption m-0 mt-1">
              Try a straighter, better-lit photo with the whole payslip in frame.
            </p>
          )}
        </section>
      )}
    </div>
  )
}
