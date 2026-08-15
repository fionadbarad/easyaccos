/**
 * The published claims about image handling must match what the code does.
 *
 * WHY THIS EXISTS
 * ---------------
 * /privacy carried one sentence about images: "Receipt scanning reads the image
 * entirely inside your browser — the photo never reaches a server of ours or
 * anyone else's." /security went further: "the photo never leaves your device,
 * and there is no upload step to opt out of."
 *
 * Both were written when receipt scanning was the only image feature. The
 * Payslip Reader shipped on 4–5 August and uploads the image to our server for
 * OCR — so the app acquired an upload step that the only statements about
 * images said did not exist, covering the most sensitive document it handles.
 *
 * docs/COMPLIANCE.md §3 records that the HMRC decline was caused by exactly
 * this shape of problem: /security claimed no third-party analytics while
 * layout.tsx loaded Vercel Analytics. Its conclusion — "the list in /privacy and
 * the set of integrations the code actually has must never drift apart; that
 * drift is what caused this rejection" — is what this file enforces.
 *
 * privacy-notice.test.ts already covers the notice's structure (placeholders,
 * controller, contact). This covers its accuracy.
 */

import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const ROOT = resolve(__dirname, '../../..')
const read = (p: string) => readFileSync(join(ROOT, p), 'utf8')

/**
 * A phrase, matched regardless of how Prettier wrapped it.
 *
 * These assertions are about words being present in the notice, not about
 * where the line breaks fall. Matching a literal space means a reflow — which
 * Prettier will do unprompted the next time the paragraph changes length —
 * fails the test for no reason anyone would call a real failure. A test that
 * cries wolf gets deleted, and this one is worth keeping.
 */
const phrase = (s: string) => new RegExp(s.trim().split(/\s+/).join('\\s+'), 'i')

const PAYSLIP_ROUTE = 'src/app/api/payslip/parse/route.ts'
const PRIVACY = 'src/app/privacy/page.tsx'
const SECURITY = 'src/app/security/page.tsx'
const RECEIPT_SCANNER = 'src/components/ReceiptScanner.tsx'

describe('the payslip upload is disclosed', () => {
  it('the route this is all about still exists', () => {
    // If the Payslip Reader is ever withdrawn, this fails and the disclosures
    // below should be revisited rather than left describing a feature that is
    // gone — the same reasoning as ai-disabled.test.ts asserting the deleted
    // chat route is absent from disk.
    expect(existsSync(join(ROOT, PAYSLIP_ROUTE))).toBe(true)
  })

  it('/privacy names the Payslip Reader and says the image is uploaded', () => {
    const doc = read(PRIVACY)
    expect(doc).toMatch(phrase('Payslip Reader'))
    expect(doc).toMatch(phrase('sent to our server'))
  })

  it('/privacy states the image is not retained', () => {
    const doc = read(PRIVACY)
    expect(doc).toMatch(phrase('discarded'))
    expect(doc).toMatch(phrase('we do not store the image'))
  })

  it('/privacy lists the payslip image against the processor that receives it', () => {
    // Vercel hosts the function that does the reading, so the processor table
    // has to say so. A processor table that omits a category of data is the
    // precise failure COMPLIANCE.md §3 describes.
    const doc = read(PRIVACY)
    expect(doc).toMatch(/who="Vercel"[\s\S]{0,300}payslip image/i)
  })

  it('/security names the payslip upload too', () => {
    const doc = read(SECURITY)
    expect(doc).toMatch(phrase('Payslip Reader'))
    expect(doc).toMatch(phrase('does upload'))
  })
})

describe('the retired claims are gone', () => {
  it('neither page claims there is no upload step in the application', () => {
    // The exact phrasing that became false. Scoped forms are fine — /security
    // still says receipt OCR has no upload step, which is true of receipts —
    // so this checks for the unscoped claim only.
    for (const page of [PRIVACY, SECURITY]) {
      expect(read(page), page).not.toMatch(phrase('no upload step to opt out of'))
    }
  })

  it('any "never reaches a server" claim is scoped to receipts', () => {
    // The sentence is true of receipt scanning and false as a statement about
    // the app. If it appears, "Receipt" must appear near it.
    for (const page of [PRIVACY, SECURITY]) {
      const doc = read(page)
      // `[\s\S]` rather than `.` with the `s` flag: dotAll needs an es2018
      // target and this project compiles below that (TS1501).
      const claims =
        doc.match(/[\s\S]{0,200}never (?:reaches a server|leaves your device)[\s\S]{0,80}/gi) ?? []
      for (const claim of claims) {
        expect(claim, `unscoped image claim in ${page}: ${claim.trim()}`).toMatch(/receipt/i)
      }
    }
  })
})

describe('the code still behaves the way the notice describes', () => {
  const route = read(PAYSLIP_ROUTE)

  it('the payslip route writes the image nowhere', () => {
    // Backs "not written to a database, kept on disk, or recorded in a log".
    // If any of these appears, the published claim has become false and the
    // notice must change in the same commit.
    expect(route).not.toMatch(/\.storage\./)
    // `supabase.from(...)`, not any `.from(` — the route legitimately calls
    // `Buffer.from(await file.arrayBuffer())` to get the bytes to OCR, and a
    // looser pattern flags that as persistence.
    expect(route).not.toMatch(/supabase\s*\n?\s*\.\s*from\s*\(/)
    expect(route).not.toMatch(/\.(insert|upsert)\s*\(/)
    expect(route).not.toMatch(/writeFile|createWriteStream|node:fs/)
    expect(route).not.toMatch(/secureWrite/)
    expect(route).not.toMatch(/console\.(log|info|warn|error)/)
  })

  it('the OCR text and image bytes are never handed to the monitor', () => {
    // reportError takes the error only. Passing the extracted text would put a
    // person's pay details into a log the notice says does not hold them.
    const calls = route.match(/report(?:Error|Warn|Info)\([^)]*\)/g) ?? []
    expect(calls.length).toBeGreaterThan(0)
    for (const call of calls) {
      expect(call).not.toMatch(/\btext\b|\bbuffer\b|\bfile\b/i)
    }
  })

  it('the parsed figures are not persisted anywhere', () => {
    // Backs "the figures it produces are shown to you rather than saved".
    const page = read('src/app/dashboard/payslip/page.tsx')
    expect(page).not.toMatch(/useUserData/)
    expect(page).not.toMatch(/secureWrite/)
  })

  it('receipt scanning really does stay in the browser', () => {
    // The other half of the distinction the notice now draws. If receipt OCR
    // ever gained an upload, /privacy and /security would both be wrong again.
    const scanner = read(RECEIPT_SCANNER)
    expect(scanner).toMatch(/tesseract/i)
    expect(scanner).not.toMatch(/fetch\(\s*['"`]\/api\//)
  })
})
