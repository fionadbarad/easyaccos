// ── Kittax Brain — re-exports from the canonical module + new helpers ─────────
// The canonical offline tax engine lives in src/lib/kittax-brain.ts.
// This module re-exports everything from there and adds context-aware helpers.
export { kittaxAnswer, calculateFullTax } from '../kittax-brain'
export type { } from './types'
