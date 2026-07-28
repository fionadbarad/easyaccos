import { describe, it, expect, beforeEach } from 'vitest'
import { rateLimit, __resetRateLimitForTests } from '../rate-limit'

describe('rateLimit', () => {
  beforeEach(() => {
    __resetRateLimitForTests()
  })

  it('allows requests up to the limit within a window', () => {
    const t0 = 1_000_000
    for (let i = 0; i < 5; i++) {
      const r = rateLimit('user-a', 5, 60_000, t0)
      expect(r.ok).toBe(true)
    }
  })

  it('blocks the request that exceeds the limit', () => {
    const t0 = 1_000_000
    for (let i = 0; i < 5; i++) rateLimit('user-a', 5, 60_000, t0)
    const blocked = rateLimit('user-a', 5, 60_000, t0)
    expect(blocked.ok).toBe(false)
    expect(blocked.remaining).toBe(0)
    expect(blocked.retryAfterSec).toBeGreaterThan(0)
  })

  it('reports remaining count as it counts down', () => {
    const t0 = 1_000_000
    expect(rateLimit('user-a', 3, 60_000, t0).remaining).toBe(2)
    expect(rateLimit('user-a', 3, 60_000, t0).remaining).toBe(1)
    expect(rateLimit('user-a', 3, 60_000, t0).remaining).toBe(0)
  })

  it('resets after the window elapses', () => {
    const t0 = 1_000_000
    for (let i = 0; i < 5; i++) rateLimit('user-a', 5, 60_000, t0)
    expect(rateLimit('user-a', 5, 60_000, t0).ok).toBe(false)
    // One ms past the window boundary → fresh window.
    const after = rateLimit('user-a', 5, 60_000, t0 + 60_001)
    expect(after.ok).toBe(true)
    expect(after.remaining).toBe(4)
  })

  it('tracks keys independently', () => {
    const t0 = 1_000_000
    for (let i = 0; i < 5; i++) rateLimit('user-a', 5, 60_000, t0)
    expect(rateLimit('user-a', 5, 60_000, t0).ok).toBe(false)
    // A different key is unaffected.
    expect(rateLimit('user-b', 5, 60_000, t0).ok).toBe(true)
  })

  it('retryAfterSec is at least 1 second when blocked', () => {
    const t0 = 1_000_000
    rateLimit('user-a', 1, 60_000, t0)
    // Block near the very end of the window: ceil of sub-second must be >= 1.
    const blocked = rateLimit('user-a', 1, 60_000, t0 + 59_900)
    expect(blocked.ok).toBe(false)
    expect(blocked.retryAfterSec).toBeGreaterThanOrEqual(1)
  })
})
