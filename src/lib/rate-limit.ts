/**
 * Minimal in-memory fixed-window rate limiter.
 *
 * NOTE: in a serverless deployment this counts per-instance, not globally, so
 * it is a soft guard against runaway usage and cost — not a hard security
 * boundary. For strict, global limits back it with Redis/Upstash. See
 * docs/AUDIT.md SEC-6.
 */

type Bucket = { count: number; resetAt: number }

const buckets = new Map<string, Bucket>()

export type RateLimitResult =
  | { ok: true; remaining: number; retryAfterSec: 0 }
  | { ok: false; remaining: 0; retryAfterSec: number }

/**
 * `now` is injectable so tests can advance the clock instead of sleeping;
 * callers leave it out and get wall time.
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
  now: number = Date.now(),
): RateLimitResult {
  const bucket = buckets.get(key)

  if (!bucket || now >= bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    // Opportunistic cleanup so the map can't grow unbounded.
    if (buckets.size > 5000) {
      for (const [k, v] of buckets) if (now >= v.resetAt) buckets.delete(k)
    }
    return { ok: true, remaining: limit - 1, retryAfterSec: 0 }
  }

  if (bucket.count >= limit) {
    return {
      ok: false,
      remaining: 0,
      retryAfterSec: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    }
  }

  bucket.count++
  return { ok: true, remaining: limit - bucket.count, retryAfterSec: 0 }
}

/** Test-only: drop all buckets so cases can't leak state into each other. */
export function __resetRateLimitForTests(): void {
  buckets.clear()
}

/** Best-effort client key from proxy headers, for unauthenticated rate limiting. */
export function clientIpKey(req: Request): string {
  const xff = req.headers.get('x-forwarded-for')
  if (xff) return xff.split(',')[0]?.trim() || 'anon'
  return req.headers.get('x-real-ip')?.trim() || 'anon'
}
