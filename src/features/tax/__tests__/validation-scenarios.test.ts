/**
 * The /validation page claims the engine reproduces five HMRC scenarios worked
 * by hand. Until now that claim was only ever checked by a human looking at a
 * browser: the scenarios lived inside the page component, so nothing in CI
 * could see them, and a band change could have turned the public evidence page
 * red without a single test failing.
 *
 * These tests own that claim. If the engine and the hand-worked column ever
 * disagree, this fails before the page can display it.
 */

import { describe, it, expect } from 'vitest'
import { SCENARIOS, runScenarios, tallyScenarios, fmtVal } from '../validation-scenarios'
import { runHmrcScenarios, bucketErrors, totalErrorCodes } from '../hmrc-error-evidence'
import { HMRC_ERROR_MESSAGES } from '@/lib/hmrc/mtd-errors'

describe('validation scenarios — the public evidence page', () => {
  const results = runScenarios()

  it('every assertion in every scenario passes', () => {
    // Reported per-assertion rather than as one boolean: a bare `allPass` tells
    // you the page is wrong without telling you which figure moved.
    const failures = results.flatMap((r) =>
      r.checks
        .filter((c) => !c.match)
        .map((c) => `${r.scenario.id} → ${c.path}: expected ${c.expected}, got ${c.actual}`),
    )
    expect(failures).toEqual([])
  })

  it('the summary the page prints is internally consistent', () => {
    const { total, passing, allPass } = tallyScenarios(results)
    expect(total).toBeGreaterThan(0)
    expect(passing).toBe(total)
    expect(allPass).toBe(true)
  })

  it('covers all five documented scenarios, each with assertions', () => {
    expect(SCENARIOS).toHaveLength(5)
    for (const s of SCENARIOS) {
      expect(s.assertions.length, `${s.id} has no assertions`).toBeGreaterThan(0)
      expect(s.manual.length, `${s.id} has no hand-worked column`).toBeGreaterThan(0)
    }
  })

  it('every assertion resolves to a real value', () => {
    // `pickAssertion` returns undefined for a path the engine does not expose.
    // That would render as an em dash and silently "pass" nothing, so an
    // undefined actual is a broken assertion path, not a failing figure.
    const unresolved = results.flatMap((r) =>
      r.checks.filter((c) => c.actual === undefined).map((c) => `${r.scenario.id} → ${c.path}`),
    )
    expect(unresolved).toEqual([])
  })

  it('scenario ids are unique — they are used as React keys and anchors', () => {
    const ids = SCENARIOS.map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe('fmtVal', () => {
  it('renders booleans as words, not £0', () => {
    expect(fmtVal(true)).toBe('true')
    expect(fmtVal(false)).toBe('false')
  })

  it('renders a missing value as an em dash', () => {
    expect(fmtVal(undefined)).toBe('—')
  })

  it('keeps pence on small non-integers, so a 19% band rate reads correctly', () => {
    expect(fmtVal(19.5)).toBe('19.50')
  })

  it('formats money as currency', () => {
    expect(fmtVal(33_432)).toBe(fmtVal(33_432))
    expect(fmtVal(33_432)).toContain('33,432')
  })
})

describe('HMRC error evidence', () => {
  it('every sandbox scenario maps to a real code and a human message', () => {
    for (const s of runHmrcScenarios()) {
      expect(s.rawCode, `${s.govTestScenario} resolved no code`).not.toBe('—')
      expect(s.friendly.length, `${s.govTestScenario} produced an empty message`).toBeGreaterThan(0)
    }
  })

  it('buckets account for every known error code exactly once', () => {
    // The page presents these buckets as a complete map of what easyacco
    // understands. A code counted twice, or dropped, makes that a false claim.
    const bucketed = bucketErrors().flatMap((b) => b.entries.map(([code]) => code))
    expect(new Set(bucketed).size).toBe(bucketed.length)
    expect(bucketed.sort()).toEqual(Object.keys(HMRC_ERROR_MESSAGES).sort())
  })

  it('the headline count matches the mapper', () => {
    expect(totalErrorCodes()).toBe(Object.keys(HMRC_ERROR_MESSAGES).length)
  })
})
