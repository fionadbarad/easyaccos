/**
 * The AI kill-switch, and the claim it underwrites.
 *
 * /privacy and /security now tell users that EasyAcco "has no AI features
 * enabled and sends your data to no AI provider". That statement is only true
 * if the API routes are actually closed — hiding the buttons is not enough,
 * because /api/ai/chat and /api/ai/categorise stay deployed and directly
 * callable, and the categorise route does not even require a session.
 *
 * An inaccurate description of processing is exactly what the HMRC rejection
 * was about (see docs/COMPLIANCE.md), so this locks the gate rather than
 * trusting it.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

const CHAT = '@/app/api/ai/chat/route'
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

  it('/api/ai/chat 404s with AI off, without calling out', async () => {
    vi.stubEnv('NEXT_PUBLIC_EA_AI', '')
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)

    const { POST } = await import(CHAT)
    const res = await POST(
      postTo('https://easyacco.uk/api/ai/chat', { message: 'what is my tax?' }) as never,
    )

    expect(res.status).toBe(404)
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
