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

// The chat request schemas (ChatRequestSchema, its bounded history turns and the
// AccoContext mirror) were removed alongside /api/ai/chat — see the "AI Tax
// Advisory removed" note in docs/COMPLIANCE.md. Restoring the route means
// restoring them; the history bounds in particular existed for a reason
// (unbounded replayed turns are a prompt-size and billing hole, not just a
// validation nicety).
