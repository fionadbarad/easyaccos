// @vitest-environment happy-dom

/**
 * feature-flags — the AUD-1 claim (audit trail on by default) had no test
 * (TST-6). ENV_MAP is read at import time, so every case re-imports the
 * module after stubbing the env.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

async function loadFlags() {
  vi.resetModules()
  return import('@/lib/feature-flags')
}

beforeEach(() => {
  localStorage.clear()
  vi.stubEnv('NEXT_PUBLIC_EA_AUDIT', '')
  vi.stubEnv('NEXT_PUBLIC_EA_GAAP', '')
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('feature-flag defaults (AUD-1)', () => {
  it('audit is ON and gaap is OFF when nothing sets them', async () => {
    // If this fails, accounting software ships with its change log off —
    // docs/AUDIT.md AUD-1 becomes an untrue claim.
    const { isFlagEnabled, FLAG_AUDIT, FLAG_GAAP } = await loadFlags()
    expect(isFlagEnabled(FLAG_AUDIT)).toBe(true)
    expect(isFlagEnabled(FLAG_GAAP)).toBe(false)
  })

  it('a localStorage override beats the env var in both directions', async () => {
    // If this fails, the per-device kill switch (or force-on) documented in
    // the module header does nothing.
    vi.stubEnv('NEXT_PUBLIC_EA_AUDIT', '0')
    const { isFlagEnabled, FLAG_AUDIT, setFlag } = await loadFlags()
    expect(isFlagEnabled(FLAG_AUDIT)).toBe(false)
    setFlag(FLAG_AUDIT, true)
    expect(isFlagEnabled(FLAG_AUDIT)).toBe(true)
    setFlag(FLAG_AUDIT, false)
    expect(isFlagEnabled(FLAG_AUDIT)).toBe(false)
  })

  it("pins the 'on' asymmetry: accepted from the env var, ignored as a localStorage override", async () => {
    // Deliberate pin of an inconsistency (TST-6): truthy() accepts 'on' so the
    // env var honours it, but the localStorage branch only recognises
    // '1'|'true'|'0'|'false' — `ea:flags:gaap = "on"` silently falls through.
    // If behaviour here changes, this test is the notice to decide it on
    // purpose rather than by accident.
    localStorage.setItem('ea:flags:gaap', 'on')
    const first = await loadFlags()
    expect(first.isFlagEnabled(first.FLAG_GAAP)).toBe(false) // fell through to default

    vi.stubEnv('NEXT_PUBLIC_EA_GAAP', 'on')
    localStorage.clear()
    const second = await loadFlags()
    expect(second.isFlagEnabled(second.FLAG_GAAP)).toBe(true) // env honours 'on'
  })
})
