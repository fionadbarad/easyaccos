// HMRC 2026/27 single source of truth.
// Update this file when 2027/28 figures are announced - all engines and
// scenario calculators import from here, so there's only one place to change.

// ── Income Tax - Personal Allowance ─────────────────────────────────────────
export const PA_BASE                 = 12_570
export const PA_TAPER_START          = 100_000
export const PA_TAPER_END            = 125_140
export const MARRIAGE_ALLOWANCE_XFER = 1_260
export const BLIND_PERSONS_ALLOWANCE = 3_250

// ── Income Tax - rUK bands ──────────────────────────────────────────────────
export const RUK_BASIC_RATE       = 0.20
export const RUK_HIGHER_RATE      = 0.40
export const RUK_ADDITIONAL_RATE  = 0.45
export const RUK_BASIC_RATE_WIDTH = 37_700    // £12,571 – £50,270 at 20%
export const RUK_BASIC_LIMIT      = 50_270
export const RUK_HIGHER_LIMIT     = 125_140   // above this: 45%

// Taxable-income basis of the additional-rate threshold (gross − PA_BASE).
// Kept as a derived export for callers that work in taxable-income space.
export const RUK_TAXABLE_ADDITIONAL_THRESHOLD = RUK_HIGHER_LIMIT - PA_BASE  // 112,570

// ── Income Tax - Scotland band ceilings (absolute gross income) ─────────────
export const SCO_STARTER_END      = 16_537    // 19%
export const SCO_BASIC_END        = 29_526    // 20%
export const SCO_INTERMEDIATE_END = 43_662    // 21%
export const SCO_HIGHER_END       = 75_000    // 42%
export const SCO_ADVANCED_END     = 125_140   // 45%
                                              // above: 48%

// ── National Insurance ──────────────────────────────────────────────────────
export const NI_PT           = 12_570   // Primary Threshold
export const NI_UEL          = 50_270   // Upper Earnings Limit
export const NI_C1_MAIN      = 0.08     // Employee Class 1 main
export const NI_C1_UPPER     = 0.02     // Employee Class 1 above UEL
export const NI_C4_MAIN      = 0.06     // SE Class 4 main
export const NI_C4_UPPER     = 0.02     // SE Class 4 above UEL
export const NI_C2_WEEKLY    = 3.65     // Class 2 voluntary
export const NI_CLASS2_SPT   = 7_105    // Class 2 Small Profits Threshold

// Employer NI - effective 6 April 2026
export const EMPLOYER_NI_RATE     = 0.15    // was 13.8%
export const EMPLOYER_NI_THRESH   = 5_000   // Secondary Threshold

// ── Dividends - 2026/27 hike (effective 6 April 2026) ──────────────────────
export const DIV_ALLOWANCE = 500
export const DIV_BASIC     = 0.1075   // 10.75% (was 8.75%)
export const DIV_HIGHER    = 0.3575   // 35.75% (was 33.75%)
export const DIV_ADDL      = 0.3935   // 39.35%

// ── Student Loans 2026/27 ───────────────────────────────────────────────────
export const SL_PLAN1_THRESH    = 26_900
export const SL_PLAN2_THRESH    = 29_385
export const SL_PLAN4_THRESH    = 33_795   // Scotland
export const SL_PLAN5_THRESH    = 25_000   // post-Aug 2023
export const SL_POSTGRAD_THRESH = 21_000
export const SL_PLAN_RATE       = 0.09     // plans 1–5
export const SL_POSTGRAD_RATE   = 0.06

// ── Misc ────────────────────────────────────────────────────────────────────
export const DIRECTOR_OPTIMAL_SALARY = 12_570
export const NLW_RATE                = 12.71   // National Living Wage, 1 Apr 2026
export const REDUNDANCY_EXEMPTION    = 30_000
