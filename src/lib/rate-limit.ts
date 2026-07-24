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

export type RateLimitResult = { ok: true } | { ok: false; retryAfterSec: number }

export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now()
  const bucket = buckets.get(key)

  if (!bucket || now >= bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    // Opportunistic cleanup so the map can't grow unbounded.
    if (buckets.size > 5000) {
      for (const [k, v] of buckets) if (now >= v.resetAt) buckets.delete(k)
    }
    return { ok: true }
  }

  if (bucket.count >= limit) {
    return { ok: false, retryAfterSec: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)) }
  }

  bucket.count++
  return { ok: true }
}

/** Best-effort client key from proxy headers, for unauthenticated rate limiting. */
export function clientIpKey(req: Request): string {
  const xff = req.headers.get('x-forwarded-for')
  if (xff) return xff.split(',')[0]?.trim() || 'anon'
  return req.headers.get('x-real-ip')?.trim() || 'anon'
}
