/**
 * Shared Zod schemas for the AI route surface. Centralised so input limits
 * and shapes can't drift between the route handler and tests.
 */

import { z } from 'zod'

export const CategoriseRequestSchema = z.object({
  description: z
    .string()
    .trim()
    .min(1, 'description is required')
    .max(500, 'description too long (max 500 chars)'),
  amount: z.number().finite().min(0).optional(),
})
export type CategoriseRequest = z.infer<typeof CategoriseRequestSchema>

// `message` is capped at 4,000 chars, but the history replayed alongside it was
// not bounded at all: neither the number of parts per turn nor the length of
// each part's text. 50 turns of unbounded text is a far larger prompt — and a
// far larger Gemini bill — than the one message the cap was written for, and
// the 30-requests/minute limit does nothing about per-request size. Bound both.
const MAX_HISTORY_PART_CHARS = 8_000
const MAX_PARTS_PER_TURN = 8

const HistoryTurnSchema = z.object({
  role: z.enum(['user', 'model']),
  parts: z
    .array(z.object({ text: z.string().max(MAX_HISTORY_PART_CHARS, 'history part too long') }))
    .min(1)
    .max(MAX_PARTS_PER_TURN, 'too many parts in a history turn'),
})
export type HistoryTurn = z.infer<typeof HistoryTurnSchema>

// Mirrors AccoContext in src/lib/acco/types.ts. Kept structural so the
// route can hand it straight to buildContextPrompt with no cast.
const AccoContextSchema = z.object({
  currentMonth: z.string(),
  taxYear: z.string(),
  personalAllowance: z.number().finite().nonnegative(),
  basicRateLimit: z.number().finite().nonnegative(),
  higherRateTaper: z.number().finite().nonnegative(),
  topRateTaper: z.number().finite().nonnegative(),
  totalExpensesYTD: z.number().finite().nonnegative().optional(),
  estimatedProfit: z.number().finite().optional(),
  estimatedTaxLiability: z.number().finite().nonnegative().optional(),
  taxBand: z.string().optional(),
})

export const ChatRequestSchema = z.object({
  message: z
    .string()
    .trim()
    .min(1, 'message is required')
    .max(4000, 'message too long (max 4000 chars)'),
  history: z.array(HistoryTurnSchema).max(50).optional(),
  context: AccoContextSchema.optional(),
})
export type ChatRequest = z.infer<typeof ChatRequestSchema>
