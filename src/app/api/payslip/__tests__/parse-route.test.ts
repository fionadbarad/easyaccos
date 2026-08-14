/**
 * /api/payslip/parse — the only file-upload route in the app, and until now the
 * only one with no tests at all.
 *
 * A payslip carries employer, pay, tax and NI, so the guards here are the ones
 * that matter: auth before anything is read, a size ceiling checked before the
 * body is materialised, and a content-type allowlist that turns a PDF away
 * rather than feeding it to the OCR engine.
 *
 * tesseract.js is mocked to return fixed text. The real engine downloads a
 * ~15 MB model and takes seconds per pass — running it here would test
 * tesseract, not this route. The OCR text fixtures are lifted from
 * payslipParser.test.ts, which documents them as the shape tesseract actually
 * returns for a payslip.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

const ROUTE = '@/app/api/payslip/parse/route'

vi.mock('@/lib/monitor', () => ({ reportError: vi.fn(), reportWarn: vi.fn() }))

const session = vi.hoisted(() => ({ user: { id: 'user-1' } as { id: string } | null }))

vi.mock('@/lib/supabase-server', () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: session.user }, error: null }) },
  }),
}))

// What OCR "reads" for the next request. Set per test.
const ocr = vi.hoisted(() => ({ text: '' as string, throws: false }))

vi.mock('tesseract.js', () => ({
  createWorker: async () => ({
    recognize: async () => {
      if (ocr.throws) throw new Error('wasm exploded')
      return { data: { text: ocr.text } }
    },
    terminate: async () => {},
  }),
}))

/** A readable two-column payslip, as tesseract flattens it. */
const PAYSLIP_TEXT = `
ACME TRADING LTD
Payslip for period 4                    Date 31/07/2026
Employee  J SMITH                       Works Number 00412
Tax Code  1257L                         NI Number QQ123456C

                          This Period      Year to Date
Gross Pay                   2,450.00         9,800.00
PAYE Income Tax               312.40         1,249.60
National Insurance            145.20           580.80
Net Pay                     1,992.40
`

/** Legible text that is plainly not a payslip — a shop receipt. */
const NOT_A_PAYSLIP_TEXT = `
CORNER SHOP LTD
2 x Sandwich            7.00
Crisps                  1.20
TOTAL                   8.20
CARD PAYMENT ACCEPTED
`

beforeEach(() => {
  vi.resetModules() // also resets the in-memory rate-limit map between cases
  session.user = { id: 'user-1' }
  ocr.text = PAYSLIP_TEXT
  ocr.throws = false
})

afterEach(() => {
  vi.restoreAllMocks()
})

function upload(bytes: Uint8Array, type: string, filename = 'payslip.png'): NextRequest {
  const form = new FormData()
  form.append('file', new File([bytes as BlobPart], filename, { type }))
  return new NextRequest('http://localhost:3000/api/payslip/parse', {
    method: 'POST',
    body: form,
  })
}

const smallImage = () => new Uint8Array([0x89, 0x50, 0x4e, 0x47, 1, 2, 3, 4])

describe('POST /api/payslip/parse', () => {
  it('returns 200 with the parsed payslip and the notes that came with it', async () => {
    const { POST } = await import(ROUTE)
    const res = await POST(upload(smallImage(), 'image/png'))

    expect(res.status).toBe(200)
    const body = await res.json()

    expect(body.data).toEqual({
      grossPay: 2450,
      taxPaid: 312.4,
      nationalInsurance: 145.2,
      taxCode: '1257L',
      employerName: 'ACME TRADING LTD',
    })
    // The current-period column, never year-to-date — 9,800.00 sits on the same
    // line and reading it would overstate gross fourfold.
    expect(body.data.grossPay).not.toBe(9800)
    // Notes travel with the data so the confirming user can see what was
    // inferred rather than read off a label.
    expect(Array.isArray(body.notes)).toBe(true)
    expect(body).not.toHaveProperty('error')
  })

  it('returns 400 with Zod issues and the partial read when the text is not a payslip', async () => {
    ocr.text = NOT_A_PAYSLIP_TEXT
    const { POST } = await import(ROUTE)
    const res = await POST(upload(smallImage(), 'image/png'))

    expect(res.status).toBe(400)
    const body = await res.json()

    expect(body.error).toMatch(/could not read every field/i)
    // Both halves matter: `issues` lets the UI point at the offending field,
    // `partial` lets it pre-fill what WAS found instead of discarding a good
    // partial read and making the user start again.
    expect(body.issues).toBeDefined()
    expect(body.partial).toBeDefined()
    expect(typeof body.partial).toBe('object')
  })

  it('returns 413 for an upload over the 8 MB ceiling', async () => {
    const oversize = new Uint8Array(8 * 1024 * 1024 + 1)
    const { POST } = await import(ROUTE)
    const res = await POST(upload(oversize, 'image/png'))

    expect(res.status).toBe(413)
    expect((await res.json()).error).toMatch(/too large/i)
  })

  it('returns 415 for a PDF, naming the reason', async () => {
    const { POST } = await import(ROUTE)
    const res = await POST(upload(smallImage(), 'application/pdf', 'payslip.pdf'))

    expect(res.status).toBe(415)
    // The message has to say PDFs specifically: "unsupported type" leaves the
    // user re-uploading the same file.
    expect((await res.json()).error).toMatch(/pdf/i)
  })

  it('returns 415 when the body is not multipart at all', async () => {
    const { POST } = await import(ROUTE)
    const res = await POST(
      new NextRequest('http://localhost:3000/api/payslip/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file: 'nope' }),
      }),
    )

    expect(res.status).toBe(415)
  })

  it('returns 401 for an anonymous caller and never reaches OCR', async () => {
    session.user = null
    const { POST } = await import(ROUTE)
    const res = await POST(upload(smallImage(), 'image/png'))

    expect(res.status).toBe(401)
    expect((await res.json()).error).toBe('Unauthorized')
  })

  it('returns 400 when the file field is missing', async () => {
    const form = new FormData()
    form.append('notafile', 'x')
    const { POST } = await import(ROUTE)
    const res = await POST(
      new NextRequest('http://localhost:3000/api/payslip/parse', { method: 'POST', body: form }),
    )

    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/missing "file"/i)
  })

  it('returns 400 for an empty file rather than running OCR on nothing', async () => {
    const { POST } = await import(ROUTE)
    const res = await POST(upload(new Uint8Array(0), 'image/png'))

    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/empty/i)
  })

  it('returns 422 when OCR reads nothing legible', async () => {
    ocr.text = '   \n  \n '
    const { POST } = await import(ROUTE)
    const res = await POST(upload(smallImage(), 'image/png'))

    expect(res.status).toBe(422)
    expect((await res.json()).error).toMatch(/no readable text/i)
  })

  it('returns 422, not 500, when the OCR engine throws', async () => {
    ocr.throws = true
    const { POST } = await import(ROUTE)
    const res = await POST(upload(smallImage(), 'image/png'))

    expect(res.status).toBe(422)
    expect((await res.json()).error).toMatch(/could not read that image/i)
  })

  it('rate-limits a single user after 10 uploads in the window', async () => {
    const { POST } = await import(ROUTE)
    for (let i = 0; i < 10; i++) {
      expect((await POST(upload(smallImage(), 'image/png'))).status).toBe(200)
    }

    const res = await POST(upload(smallImage(), 'image/png'))
    expect(res.status).toBe(429)
    // Without Retry-After the client has no way to back off other than guessing.
    expect(res.headers.get('Retry-After')).toBeTruthy()
  })
})
