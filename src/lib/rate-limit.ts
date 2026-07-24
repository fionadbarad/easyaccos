/**
 * Lightweight in-process fixed-window rate limiter.
 *
 * Purpose: stop a signed-in user (or a leaked session) from hammering the
 * paid Gemini endpoints — accidental render loops, a stuck retry, or casual
 * abuse. It is a first line of defence, not a billing firewall.
 *
 * LIMITATION — read before relying on this for strict global limits:
 * state lives in a module-level Map, so on serverless (Vercel) each running
 * instance keeps its own counters. The effective ceiling is therefore
 * `limit × active_instances`, not a single global `limit`. That is fine for
 * curbing runaway usage; if you later need a hard global cap (per-user spend
 * ceiling), back this with Redis/Upstash or a Supabase counter — the call
 * sites won't need to change, only this module.
 */

export interface RateLimitResult {
  /** true if the request is allowed. */
  ok: boolean
  /** requests still allowed in the current window (0 when blocked). */
  remaining: number
  /** seconds until the window resets — send as the `Retry-After` header. */
  retryAfterSec: number
  /** epoch ms when the current window resets. */
  resetAt: number
}

type Bucket = { count: number; resetAt: number }

const buckets = new Map<string, Bucket>()

// Bounds memory if a burst of distinct keys (e.g. many users) accumulates.
// Expired buckets are swept opportunistically once the map grows past this.
const MAX_TRACKED_KEYS = 10_000

function sweepExpired(now: number): void {
  for (const [key, bucket] of buckets) {
    if (now >= bucket.resetAt) buckets.delete(key)
  }
}

/**
 * Record one hit against `key` and report whether it is within `limit` per
 * `windowMs`. `now` is injectable for deterministic tests.
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
  now: number = Date.now(),
): RateLimitResult {
  const existing = buckets.get(key)

  // New window: either first hit for this key, or the previous window elapsed.
  if (!existing || now >= existing.resetAt) {
    if (buckets.size > MAX_TRACKED_KEYS) sweepExpired(now)
    const resetAt = now + windowMs
    buckets.set(key, { count: 1, resetAt })
    return { ok: true, remaining: Math.max(0, limit - 1), retryAfterSec: 0, resetAt }
  }

  // Within the current window and over the limit: block.
  if (existing.count >= limit) {
    return {
      ok: false,
      remaining: 0,
      retryAfterSec: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
      resetAt: existing.resetAt,
    }
  }

  // Within the current window and under the limit: allow, increment.
  existing.count += 1
  return {
    ok: true,
    remaining: Math.max(0, limit - existing.count),
    retryAfterSec: 0,
    resetAt: existing.resetAt,
  }
}

/** Test-only: drop all tracked windows. */
export function __resetRateLimitForTests(): void {
  buckets.clear()
}
