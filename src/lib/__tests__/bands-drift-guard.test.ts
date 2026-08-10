// ── Bands drift guard ────────────────────────────────────────────────────────
// Mythos-tier: the bug class "user-facing copy disagrees with the engine"
// becomes a test failure, not a production incident.
//
// The chat-route system prompt previously told users dividend tax was 8.75%.
// bands-2026.ts said 10.75% (post-Apr-2026 hike). Both numbers shipped to
// production — the AI advised users using rates the engine refused to use.
//
// This test scans every file in DRIFT_PRONE_FILES for hard-coded HMRC
// thresholds and rates that MUST come from bands-2026.ts. If a literal
// matches an "old/wrong" pattern (or fails to match a current band), the
// test fails and names the file + line.
//
// Adding a new file with user-facing tax copy? Add it to DRIFT_PRONE_FILES.
// Changing a band? Update bands-2026.ts only — these patterns auto-derive.

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import * as B from '../tax/bands-2026'

const ROOT = resolve(__dirname, '../../..')

// Files where user-facing tax copy lives. If any of these mention an HMRC
// threshold or rate, it MUST trace back to bands-2026.
const DRIFT_PRONE_FILES = [
  // src/app/api/ai/chat/route.ts used to head this list — it built a system
  // prompt full of rates from bands-2026 and was the file this guard was
  // written for. The route is gone (docs/COMPLIANCE.md); restoring it means
  // putting it back here in the same change.
  'src/lib/acco/context.ts',
  'src/lib/tax-scenarios.ts',
  'src/features/tax/useTaxScenario.ts',
  // The mileage page held five AMAP rates of its own, plus a rate table and a
  // tax-saving line written as "55p", "25p", "20%" and "40%" in prose. It is
  // the file this guard existed for and was not watching: the car rate had
  // already moved 45p → 55p once, and the copy and the calculation were two
  // separate places to remember.
  //
  // That page is now a three-line wrapper and the tax copy lives in the four
  // files below. Splitting a watched file WITHOUT re-listing the pieces would
  // have silently switched this guard off for the surface it was written for,
  // so the whole mileage feature is listed rather than just the parts that
  // currently mention a rate.
  'src/app/dashboard/mileage/page.tsx',
  'src/features/mileage/mileage-model.ts',
  'src/features/mileage/components/MileageDashboard.tsx',
  'src/features/mileage/components/AmapRatePanel.tsx',
  'src/features/mileage/components/JourneyForm.tsx',
  // The public evidence page: five HMRC scenarios worked by hand. If a band
  // moves in bands-2026 and this page keeps the old arithmetic, it presents
  // stale sums as proof the engine is right.
  'src/app/validation/page.tsx',
  'src/features/tracker/TaxPotCalculator.tsx',
  'src/features/tax/FullResultPanel.tsx',
  'src/components/TaxEstimator2026.tsx',
] as const

// Numeric literals that may NEVER appear in user-facing copy: they represent
// a threshold or rate that has a canonical home in bands-2026 and would be
// drift if hard-coded. Stored as the literal patterns engineers would write.
//
// 8.75 / 33.75 — pre-Apr-2026 dividend rates. Shipped wrong once; can't again.
// 13.8         — pre-Apr-2026 employer NI rate.
// 12,570 / 50,270 / 100,000 / 125,140 / 37,700 / 30,000 / 7,105 / 5,000
//              — every threshold has an export in bands-2026.
const FORBIDDEN_LITERALS: Array<{ pattern: RegExp; reason: string; useInstead: string }> = [
  {
    pattern: /\b8\.75\s*%/,
    reason: 'pre-2026 dividend basic rate',
    useInstead: 'pct(DIV_BASIC) from bands-2026 (now 10.75%)',
  },
  {
    pattern: /\b33\.75\s*%/,
    reason: 'pre-2026 dividend higher rate',
    useInstead: 'pct(DIV_HIGHER) from bands-2026 (now 35.75%)',
  },
  {
    pattern: /\b13\.8\s*%/,
    reason: 'pre-2026 employer NI rate',
    useInstead: 'pct(EMPLOYER_NI_RATE) from bands-2026 (now 15%)',
  },
  {
    pattern: /\b45p\b/,
    reason: 'pre-Apr-2026 AMAP car rate',
    useInstead: 'pence(AMAP_CAR_FIRST) from bands-2026 (now 55p)',
  },
  {
    pattern: /['"`\s(]\d\dp\s*(per mile|\/mi)/,
    reason: 'AMAP rate written into copy',
    useInstead: 'pence(AMAP_CAR_FIRST | AMAP_CAR_EXCESS | AMAP_MOTORCYCLE | AMAP_BICYCLE)',
  },
  {
    pattern: /\b10[,_]000\s*(mile|mi\b)/,
    reason: 'AMAP car threshold literal',
    useInstead: 'AMAP_CAR_THRESHOLD.toLocaleString() from bands-2026',
  },
  {
    pattern: /£\s*12[,_]?570\b/,
    reason: 'PA / NI Primary Threshold literal',
    useInstead: 'fmtGBP(PA_BASE) / fmtGBP(NI_PT)',
  },
  {
    pattern: /£\s*50[,_]?270\b/,
    reason: 'NI UEL / basic rate ceiling literal',
    useInstead: 'fmtGBP(RUK_BASIC_LIMIT) / fmtGBP(NI_UEL)',
  },
  {
    pattern: /£\s*100[,_]?000\b/,
    reason: 'PA taper start literal',
    useInstead: 'fmtGBP(PA_TAPER_START)',
  },
  {
    pattern: /£\s*125[,_]?140\b/,
    reason: 'PA taper end / additional rate threshold',
    useInstead: 'fmtGBP(PA_TAPER_END) / fmtGBP(RUK_HIGHER_LIMIT)',
  },
  {
    pattern: /£\s*37[,_]?700\b/,
    reason: 'rUK basic rate band width literal',
    useInstead: 'fmtGBP(RUK_BASIC_RATE_WIDTH)',
  },
  {
    pattern: /£\s*30[,_]?000\s*(rule|exemption|redundancy)/i,
    reason: 'redundancy exemption literal',
    useInstead: 'fmtGBP(REDUNDANCY_EXEMPTION)',
  },
  {
    pattern: /£\s*7[,_]?105\b/,
    reason: 'NI Class 2 SPT literal',
    useInstead: 'fmtGBP(NI_CLASS2_SPT)',
  },
]

// Sanity: these are the actual current values. If someone changes
// bands-2026.ts, the assertions below verify our regex assumptions still
// match what the bands export — i.e. the *current* values are not in the
// "forbidden literal" set. If a future band change collides, this test
// will tell us to update both at once.
const CURRENT_BANDS_SANITY = {
  DIV_BASIC_PCT: (B.DIV_BASIC * 100).toFixed(2),
  DIV_HIGHER_PCT: (B.DIV_HIGHER * 100).toFixed(2),
  EMPLOYER_NI_RATE_PCT: (B.EMPLOYER_NI_RATE * 100).toFixed(0),
  PA_BASE: B.PA_BASE,
  PA_TAPER_START: B.PA_TAPER_START,
  PA_TAPER_END: B.PA_TAPER_END,
  RUK_BASIC_LIMIT: B.RUK_BASIC_LIMIT,
  RUK_BASIC_WIDTH: B.RUK_BASIC_RATE_WIDTH,
  REDUNDANCY: B.REDUNDANCY_EXEMPTION,
  NI_CLASS2_SPT: B.NI_CLASS2_SPT,
}

describe('bands drift guard: user-facing copy must derive from bands-2026', () => {
  it('current bands-2026 exports do not match any forbidden pattern', () => {
    // If a future rate change makes the current value match an "old/wrong"
    // pattern, this fires first — and the dev knows to update both files.
    expect(`${CURRENT_BANDS_SANITY.DIV_BASIC_PCT}%`).not.toMatch(/^8\.75%$/)
    expect(`${CURRENT_BANDS_SANITY.DIV_HIGHER_PCT}%`).not.toMatch(/^33\.75%$/)
    expect(`${CURRENT_BANDS_SANITY.EMPLOYER_NI_RATE_PCT}%`).not.toMatch(/^13\.8%$/)
  })

  for (const file of DRIFT_PRONE_FILES) {
    it(`${file} contains no hard-coded HMRC thresholds or rates`, () => {
      const path = resolve(ROOT, file)
      const src = readFileSync(path, 'utf8')

      const hits: string[] = []
      const lines = src.split('\n')

      for (const { pattern, reason, useInstead } of FORBIDDEN_LITERALS) {
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i]
          if (line === undefined) continue
          // Strip leading-comment lines so historical/explanatory comments
          // (e.g. JSDoc citing legacy figures) don't trip the guard. Code
          // and string literals are still scanned.
          if (/^\s*(\/\/|\*)/.test(line)) continue
          // Same for trailing comments: `SALARY, // £12,570 — bands-2026` is
          // code deriving from the constant, annotated with the figure. The
          // `[^:]` guard keeps `https://` from being treated as a comment.
          const code = line.replace(/(^|[^:])\/\/.*$/, '$1')
          if (pattern.test(code)) {
            hits.push(`  ${file}:${i + 1}  "${line.trim()}"\n    ↳ ${reason} — use ${useInstead}`)
          }
        }
      }

      if (hits.length > 0) {
        throw new Error(
          `Forbidden HMRC literal(s) found — these must derive from bands-2026.ts:\n\n${hits.join('\n\n')}\n`,
        )
      }
    })
  }
})
