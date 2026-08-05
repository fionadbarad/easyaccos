import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { parsePayslip } from '@/features/ocr/payslipParser'
import { reportError } from '@/lib/monitor'
import { rateLimit } from '@/lib/rate-limit'
import { createClient } from '@/lib/supabase-server'

/**
 * POST /api/payslip/parse — multipart payslip image in, validated JSON out.
 *
 * There is no AI_ENABLED gate here, and that is the point: both OCR and field
 * extraction run on our own server, so no payslip — the most personal document
 * in the app — reaches a third party. Nothing to disclose in /privacy, nothing
 * to switch off before an HMRC re-submission.
 *
 * OCR runs server-side rather than in the browser as ReceiptScanner.tsx does,
 * because the image arrives here as an upload. That means the WASM engine and
 * its ~15 MB English model load inside the function container, so this route
 * needs the Node runtime and a long ceiling; a cold container pays the model
 * download before the first recognise() returns.
 */
export const runtime = 'nodejs'
export const maxDuration = 60
// The image is read from the request body every time; nothing here is cacheable.
export const dynamic = 'force-dynamic'

/** 8 MB — comfortably above a phone photo, below the body limit. */
const MAX_UPLOAD_BYTES = 8 * 1024 * 1024

const ACCEPTED = ['image/png', 'image/jpeg', 'image/webp', 'image/bmp', 'image/tiff']

async function ocr(buffer: Buffer): Promise<string> {
  // Imported lazily so the WASM engine is never pulled into the module graph at
  // build time or on cold paths that reject before OCR (auth, rate limit, type).
  const { createWorker } = await import('tesseract.js')
  const worker = await createWorker('eng')
  try {
    const { data } = await worker.recognize(buffer)
    return data.text ?? ''
  } finally {
    // Without this the worker's child process and its WASM heap outlive the
    // request and accumulate across warm invocations.
    await worker.terminate()
  }
}

export async function POST(request: NextRequest) {
  // 1. Auth. A payslip carries employer, pay and NI; an anonymous caller has no
  //    legitimate reason to push one through this. getUser() validates against
  //    Supabase's auth server, not just the cookie (docs/AUDIT.md SEC-8).
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2. Per-user rate limit. An OCR pass is seconds of CPU inside a function
  //    container, which makes this the most expensive endpoint in the app per
  //    request even with no third-party bill attached (docs/AUDIT.md SEC-6).
  const limit = rateLimit(`payslip:parse:${user.id}`, 10, 60_000)
  if (!limit.ok) {
    return NextResponse.json(
      { error: 'Too many uploads. Please slow down.' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSec) } },
    )
  }

  if (!request.headers.get('content-type')?.includes('multipart/form-data')) {
    return NextResponse.json(
      { error: 'Expected multipart/form-data with a "file" field' },
      { status: 415 },
    )
  }

  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Malformed multipart body' }, { status: 400 })
  }

  const file = form.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Missing "file" field' }, { status: 400 })
  }
  // Size is checked before the buffer is materialised so an oversized upload
  // cannot be pulled into memory just to be rejected.
  if (file.size === 0) {
    return NextResponse.json({ error: 'Uploaded file is empty' }, { status: 400 })
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: 'File too large (max 8 MB)' }, { status: 413 })
  }
  if (!ACCEPTED.includes(file.type)) {
    return NextResponse.json(
      { error: 'Please upload a photo or scan of your payslip — PDFs are not supported.' },
      { status: 415 },
    )
  }

  let text: string
  try {
    text = await ocr(Buffer.from(await file.arrayBuffer()))
  } catch (err) {
    reportError('api.payslip.parse.ocr', err)
    return NextResponse.json({ error: 'Could not read that image' }, { status: 422 })
  }

  const result = parsePayslip(text)

  if (result.ok) {
    return NextResponse.json({ data: result.data, notes: result.notes })
  }

  if (result.reason === 'empty-text') {
    return NextResponse.json(
      { error: 'No readable text found — try a sharper, straighter photo.' },
      { status: 422 },
    )
  }

  // Something was read but it does not validate as a payslip. The caller gets
  // the Zod tree so the UI can point at the offending field, and the partial so
  // it can pre-fill what was found rather than discarding a good read.
  return NextResponse.json(
    {
      error: 'Could not read every field from that payslip',
      issues: z.treeifyError(result.error),
      partial: result.partial,
    },
    { status: 400 },
  )
}
