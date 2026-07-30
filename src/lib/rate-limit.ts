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

// How many reverse proxies sit between the public internet and this app. On
// Vercel that is exactly one (the edge network). Kept in step with
// HMRC_TRUSTED_PROXY_HOPS in lib/hmrc/fraud-headers.ts, which reads the same
// header for the same reason.
const DEFAULT_TRUSTED_PROXY_HOPS = 1

function trustedProxyHops(): number {
  const raw = process.env.HMRC_TRUSTED_PROXY_HOPS
  if (!raw) return DEFAULT_TRUSTED_PROXY_HOPS
  const n = Number.parseInt(raw, 10)
  return Number.isInteger(n) && n >= 1 ? n : DEFAULT_TRUSTED_PROXY_HOPS
}

/**
 * Best-effort client key from proxy headers, for unauthenticated rate limiting.
 *
 * X-Forwarded-For is APPENDED to at each hop, so the list reads
 * `<what the client claimed>, <observed by hop 1>, …`. Only the entries our own
 * proxies appended are trustworthy. Taking the LEFTMOST entry — which is what
 * this did — means the caller picks their own bucket key: sending a different
 * `X-Forwarded-For` on each request gives an unlimited number of fresh 60/min
 * windows, which defeats the only thing standing between an anonymous caller
 * and the Gemini bill on /api/ai/categorise. Count in from the right instead,
 * matching extractClientIp in lib/hmrc/fraud-headers.ts.
 */
export function clientIpKey(req: Request): string {
  const xff = req.headers.get('x-forwarded-for')
  if (xff) {
    const hops = xff
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    const idx = hops.length - trustedProxyHops()
    // idx < 0 means fewer hops than our own infrastructure should have added, so
    // the chain isn't what we assume and no entry in it can be trusted.
    if (idx >= 0 && idx < hops.length) return hops[idx]!
  }
  return req.headers.get('x-real-ip')?.trim() || 'anon'
}
