/**
 * Guards on the published privacy notice.
 *
 * Two different failures, both of which reach real visitors and neither of
 * which any other test would notice, because the page is static JSX that always
 * renders successfully whatever it says.
 *
 *   1. It shipped reading "[[CONTROLLER LEGAL NAME]] is the data controller"
 *      to everyone who opened /privacy. A privacy notice that has not been
 *      filled in is worse than none — it tells a reader, and an HMRC reviewer,
 *      that nobody checked.
 *
 *   2. The controller is a sole trader working from home, so the obvious way to
 *      fill in placeholder (1) is to paste a home address onto a public,
 *      permanently-archived page. Art. 13(1)(a) does not require one: it asks
 *      for "the identity and the contact details of the controller", and a
 *      monitored email is contact details. This test is what stops a later
 *      well-meaning edit — or a future me, asked to "complete the notice" —
 *      from publishing it.
 *
 * Read as source text rather than rendered, because the point is that the
 * string is not in the file at all.
 */

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const SOURCE = readFileSync(resolve(process.cwd(), 'src/app/privacy/page.tsx'), 'utf8')

describe('privacy notice', () => {
  it('has no unfilled placeholders', () => {
    expect(SOURCE).not.toContain('[[')
  })

  it('names a data controller', () => {
    expect(SOURCE).toMatch(/const CONTROLLER_NAME = '(?!\s*')[^']+'/)
  })

  it('gives a contact route', () => {
    expect(SOURCE).toMatch(/const CONTACT_EMAIL = '[^']+@[^']+'/)
  })

  it('publishes no UK postcode', () => {
    // Full UK postcode shape: AA9A 9AA / A9 9AA / AA99 9AA and friends.
    const postcode = /\b[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}\b/g
    expect(SOURCE.match(postcode)).toBeNull()
  })

  it('publishes no street address', () => {
    // Not exhaustive — a determined paste gets through. It catches the shape of
    // an address typed into a hurry, which is the realistic case.
    const street = /\b\d+[a-z]?\s+[A-Z][a-z]+\s+(Road|Street|Avenue|Lane|Way|Close|Drive|Court)\b/
    expect(SOURCE).not.toMatch(street)
  })
})
