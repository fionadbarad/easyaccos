/**
 * Shared Zod schemas for the AI route surface. Centralised so input limits
 * and shapes can't drift between the route handler and tests.
 */

import { z } from 'zod'

export const CategoriseRequestSchema = z.object({
  description: z.string().trim().min(1, 'description is required').max(500, 'description too long (max 500 chars)'),
  amount:      z.number().finite().min(0).optional(),
})
export type CategoriseRequest = z.infer<typeof CategoriseRequestSchema>

const HistoryTurnSchema = z.object({
  role:  z.enum(['user', 'model']),
  parts: z.array(z.object({ text: z.string() })).min(1),
})
export type HistoryTurn = z.infer<typeof HistoryTurnSchema>

export const ChatRequestSchema = z.object({
  message: z.string().trim().min(1, 'message is required').max(4000, 'message too long (max 4000 chars)'),
  history: z.array(HistoryTurnSchema).max(50).optional(),
  context: z.record(z.string(), z.unknown()).optional(),
})
export type ChatRequest = z.infer<typeof ChatRequestSchema>
