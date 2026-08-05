/**
 * The AI kill-switch, and the claim it underwrites.
 *
 * /privacy and /security now tell users that EasyAcco "has no AI features
 * enabled and sends your data to no AI provider". That statement is only true
 * if the API routes are actually closed — hiding the buttons is not enough,
 * because /api/ai/categorise stays deployed and directly callable, and does not
 * even require a session.
 *
 * /api/ai/chat was deleted outright rather than left behind the flag; the last
 * case here holds that deletion in place, so a future restore has to be
 * deliberate and arrive with its own 404 test.
 *
 * An inaccurate description of processing is exactly what the HMRC rejection
 * was about (see docs/COMPLIANCE.md), so this locks the gate rather than
 * trusting it.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

const CATEGORISE = '@/app/api/ai/categorise/route'

function postTo(url: string, body: unknown) {
  return new Request(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }) as unknown as Parameters<(typeof import('@/app/api/ai/categorise/route'))['POST']>[0]
}

beforeEach(() => {
  vi.resetModules()
  // A Gemini key being present must not matter — the switch decides, not the key.
  vi.stubEnv('GEMINI_API_KEY', 'test-key-should-never-be-used')
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe('AI is off by default', () => {
  it('AI_ENABLED is false when NEXT_PUBLIC_EA_AI is unset', async () => {
    vi.stubEnv('NEXT_PUBLIC_EA_AI', '')
    const { AI_ENABLED } = await import('@/lib/ai-enabled')
    expect(AI_ENABLED).toBe(false)
  })

  it('stays false for values that are not an explicit opt-in', async () => {
    for (const v of ['0', 'false', 'no', 'off', 'yes']) {
      vi.resetModules()
      vi.stubEnv('NEXT_PUBLIC_EA_AI', v)
      const { AI_ENABLED } = await import('@/lib/ai-enabled')
      expect(AI_ENABLED, `value ${v}`).toBe(false)
    }
  })

  it('turns on only for an explicit 1 or true', async () => {
    for (const v of ['1', 'true', 'TRUE']) {
      vi.resetModules()
      vi.stubEnv('NEXT_PUBLIC_EA_AI', v)
      const { AI_ENABLED } = await import('@/lib/ai-enabled')
      expect(AI_ENABLED, `value ${v}`).toBe(true)
    }
  })
})

describe('the API routes are closed, not merely hidden', () => {
  it('/api/ai/categorise 404s with AI off, without calling out', async () => {
    vi.stubEnv('NEXT_PUBLIC_EA_AI', '')
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)

    const { POST } = await import(CATEGORISE)
    const res = await POST(postTo('https://easyacco.uk/api/ai/categorise', { description: 'Uber' }))

    expect(res.status).toBe(404)
    // The load-bearing assertion: nothing left the server.
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('the gate runs before the body is even parsed', async () => {
    // A malformed body must still 404 rather than 400: the route has to be
    // indistinguishable from one that does not exist.
    vi.stubEnv('NEXT_PUBLIC_EA_AI', '')
    const { POST } = await import(CATEGORISE)
    const bad = new Request('https://easyacco.uk/api/ai/categorise', {
      method: 'POST',
      body: 'not json at all',
    }) as never
    const res = await POST(bad)
    expect(res.status).toBe(404)
  })

  it('a present GEMINI_API_KEY does not re-open the route', async () => {
    // The switch, not the credential, decides. Leaving a key in the
    // environment must not silently restore third-party processing.
    vi.stubEnv('NEXT_PUBLIC_EA_AI', '')
    vi.stubEnv('GEMINI_API_KEY', 'a-real-looking-key')
    const { POST } = await import(CATEGORISE)
    const res = await POST(
      postTo('https://easyacco.uk/api/ai/categorise', { description: 'Adobe' }),
    )
    expect(res.status).toBe(404)
  })
})

describe('the AI Tax Advisory chat route is gone, not gated', () => {
  // A 404-behind-a-flag route and a deleted route are indistinguishable to a
  // caller but not to a reviewer: the first still has a code path to Google in
  // the deployed bundle. COMPLIANCE.md now claims the second, so assert the
  // file's absence rather than trusting the claim to stay true.
  // Asserted against the filesystem rather than by attempting an import: a
  // literal `import('@/app/api/ai/chat/route')` is resolved statically by tsc,
  // so a test that the module is missing would itself fail to type-check.
  it('has no route file on disk', () => {
    const ROOT = resolve(__dirname, '../../..')
    expect(existsSync(resolve(ROOT, 'src/app/api/ai/chat/route.ts'))).toBe(false)
    expect(existsSync(resolve(ROOT, 'src/app/api/ai/chat'))).toBe(false)
  })
})
