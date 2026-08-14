// HMRC 2026/27 single source of truth.
// Update this file when 2027/28 figures are announced — all engines and
// scenario calculators import from here, so there's only one place to change.
//
// Figures verified against the 2026/27 (6 Apr 2026 – 5 Apr 2027) rate research.
// Primary sources (gov.uk unless noted):
//   [IT]  Income Tax rates and Personal Allowances
//   [SCO] Scottish income tax — Current rates 6 Apr 2026–5 Apr 2027 (mygov.scot)
//   [NI]  Rates and allowances: National Insurance contributions
//   [DIV] Check if you have to pay tax on dividends
//   [SL]  Student loan and postgraduate loan repayment thresholds
// Plan 2 SL threshold £29,385/yr confirmed against HMRC (2026/27).

// ── Income Tax — Personal Allowance ─────────────────────────────────────────
export const PA_BASE = 12_570
export const PA_TAPER_START = 100_000
export const PA_TAPER_END = 125_140
export const MARRIAGE_ALLOWANCE_XFER = 1_260
export const BLIND_PERSONS_ALLOWANCE = 3_250

// ── Income Tax — rUK bands ──────────────────────────────────────────────────
export const RUK_BASIC_RATE = 0.2
export const RUK_HIGHER_RATE = 0.4
export const RUK_ADDITIONAL_RATE = 0.45
export const RUK_BASIC_RATE_WIDTH = 37_700 // £12,571 – £50,270 at 20%
export const RUK_BASIC_LIMIT = 50_270
export const RUK_HIGHER_LIMIT = 125_140 // taxable income above this: 45%

// ── Income Tax — Scotland band ceilings (absolute gross income) [SCO] ───────
export const SCO_STARTER_END = 16_537 // 19%
export const SCO_BASIC_END = 29_526 // 20%
export const SCO_INTERMEDIATE_END = 43_662 // 21%
export const SCO_HIGHER_END = 75_000 // 42%
export const SCO_ADVANCED_END = 125_140 // 45%
// above: 48%

// ── National Insurance [NI] ─────────────────────────────────────────────────
export const NI_PT = 12_570 // Primary Threshold
export const NI_UEL = 50_270 // Upper Earnings Limit
export const NI_C1_MAIN = 0.08 // Employee Class 1 main
export const NI_C1_UPPER = 0.02 // Employee Class 1 above UEL
export const NI_C4_MAIN = 0.06 // SE Class 4 main
export const NI_C4_UPPER = 0.02 // SE Class 4 above UEL
export const NI_C2_WEEKLY = 3.65 // Class 2 voluntary
export const NI_CLASS2_SPT = 7_105 // Class 2 Small Profits Threshold

// Employer NI — effective 6 April 2026
export const EMPLOYER_NI_RATE = 0.15 // was 13.8%
export const EMPLOYER_NI_THRESH = 5_000 // Secondary Threshold

// ── Dividends — 2026/27 (effective 6 April 2026) [DIV] ─────────────────────
export const DIV_ALLOWANCE = 500
export const DIV_BASIC = 0.1075 // 10.75% (was 8.75%)
export const DIV_HIGHER = 0.3575 // 35.75% (was 33.75%)
export const DIV_ADDL = 0.3935 // 39.35%

// ── Student Loans 2026/27 [SL] ──────────────────────────────────────────────
export const SL_PLAN1_THRESH = 26_900
export const SL_PLAN2_THRESH = 29_385 // £29,385/yr — confirmed HMRC 2026/27
export const SL_PLAN4_THRESH = 33_795 // Scotland
export const SL_PLAN5_THRESH = 25_000 // post-Aug 2023
export const SL_POSTGRAD_THRESH = 21_000
export const SL_PLAN_RATE = 0.09 // plans 1–5
export const SL_POSTGRAD_RATE = 0.06
// Unearned income (dividends, savings, property) is DISREGARDED for student
// loan purposes at or below this figure, and brought in IN FULL above it. It is
// a cliff edge, not an allowance: £2,000 of dividends adds nothing to the
// repayment base, £2,001 adds the whole £2,001.
export const SL_UNEARNED_DISREGARD = 2_000

// ── Pension: Annual Allowance, taper & relief (2026/27) ─────────────────────
// SIPP relief works at source: the saver pays 80% of the gross contribution and
// the provider reclaims the basic-rate 20% into the pot. Higher-rate relief is
// given by extending the basic-rate band by the gross contribution (TAX-10).
export const ANNUAL_ALLOWANCE = 60_000 // standard annual allowance
export const PENSION_BASIC_RELIEF_RATE = 0.2 // 20% reclaimed at source
// Tapered annual allowance: for the highest earners the AA reduces by £1 for
// every £2 of *adjusted income* above £260,000, but only once *threshold income*
// also exceeds £200,000. It bottoms out at a £10,000 floor (reached at £360,000
// adjusted income).
export const AA_TAPER_THRESHOLD_INCOME = 200_000
export const AA_TAPER_ADJUSTED_INCOME = 260_000
export const AA_TAPER_FLOOR = 10_000
// Money Purchase Annual Allowance — applies once a defined-contribution pot has
// been flexibly accessed. Flat £10,000; it does not itself taper.
export const MPAA = 10_000

// ── Approved Mileage Allowance Payments [AMAP] 2026/27 ──────────────────────
// The statutory rates for claiming business travel in your own vehicle.
//
// These lived in src/app/dashboard/mileage/page.tsx — five tax constants inside
// a 970-line React component, in a file this one claims to be the single source
// of truth for. That is not a tidiness complaint. Rates change on 6 April, and
// a figure nobody thinks to look for is a figure nobody updates: the car rate
// already moved 45p → 55p once, and the next time it moves, whoever edits this
// file will believe they are done.
//
// The 10,000-mile threshold is PER TAX YEAR, per person — not per vehicle and
// not lifetime.
export const AMAP_CAR_FIRST = 0.55 // first 10,000 business miles
export const AMAP_CAR_EXCESS = 0.25 // every mile above that
export const AMAP_MOTORCYCLE = 0.24 // flat, no threshold
export const AMAP_BICYCLE = 0.2 // flat, no threshold
export const AMAP_CAR_THRESHOLD = 10_000

// ── Misc ────────────────────────────────────────────────────────────────────
export const DIRECTOR_OPTIMAL_SALARY = 12_570
export const NLW_RATE = 12.71 // National Living Wage, 1 Apr 2026
export const REDUNDANCY_EXEMPTION = 30_000
