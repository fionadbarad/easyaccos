/**
 * /api/ai/categorise — the only surviving AI route, and untested until now.
 *
 * The first block is compliance evidence, not coverage: with NEXT_PUBLIC_EA_AI
 * unset the route must 404 before it looks at anything, because that is what
 * makes /privacy's "nothing is sent to Google" true of the deployed
 * configuration rather than merely true of the hidden UI (CLAUDE.md hard rule
 * 2, docs/COMPLIANCE.md). Every later case stubs the flag ON deliberately to
 * exercise the code behind it, and @google/genai is mocked throughout — no
 * test in this file can reach Google even if the flag leaks.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

const ROUTE = '@/app/api/ai/categorise/route'

vi.mock('@/lib/monitor', () => ({ reportError: vi.fn(), reportWarn: vi.fn() }))

// What the model "returns", and whether the call blows up. Set per test.
const gemini = vi.hoisted(() => ({ text: 'Other', throws: false }))

const generateContent = vi.hoisted(() => vi.fn())

vi.mock('@google/genai', () => ({
  GoogleGenAI: class {
    models = {
      generateContent: async (...args: unknown[]) => {
        generateContent(...args)
        if (gemini.throws) throw new Error('gemini unavailable')
        return { text: gemini.text }
      },
    }
  },
}))

function post(body: unknown, ip = '203.0.113.1'): NextRequest {
  return new NextRequest('http://localhost:3000/api/ai/categorise', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-real-ip': ip },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.resetModules()
  generateContent.mockClear()
  gemini.text = 'Other'
  gemini.throws = false
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('the AI flag gates the route', () => {
  it('404s with the flag unset, without touching the body or Google', async () => {
    vi.stubEnv('NEXT_PUBLIC_EA_AI', '')
    const { POST } = await import(ROUTE)
    const res = await POST(post({ description: 'Uber to client' }))

    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({ error: 'Not found' })
    expect(generateContent).not.toHaveBeenCalled()
  })

  it('404s for a flag value that is not an explicit yes', async () => {
    // "0", "false", "no" and typos must all read as OFF. A data-sharing feature
    // has to fail closed.
    for (const value of ['0', 'false', 'no', 'yes', 'on']) {
      vi.resetModules()
      vi.stubEnv('NEXT_PUBLIC_EA_AI', value)
      const { POST } = await import(ROUTE)
      const res = await POST(post({ description: 'Uber to client' }))
      expect(res.status, `NEXT_PUBLIC_EA_AI=${value}`).toBe(404)
    }
    expect(generateContent).not.toHaveBeenCalled()
  })
})

describe('POST /api/ai/categorise (flag on)', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_EA_AI', '1')
  })

  it('returns 400 for a malformed JSON body', async () => {
    const { POST } = await import(ROUTE)
    const res = await POST(post('{not json'))

    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/invalid json/i)
  })

  it('returns 400 with the schema message for an empty description', async () => {
    const { POST } = await import(ROUTE)
    const res = await POST(post({ description: '   ' }))

    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/description is required/i)
  })

  it('returns 400 for a description past the 500-char ceiling', async () => {
    const { POST } = await import(ROUTE)
    const res = await POST(post({ description: 'x'.repeat(501) }))

    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/too long/i)
  })

  it('returns 400 for a negative amount', async () => {
    const { POST } = await import(ROUTE)
    const res = await POST(post({ description: 'Lunch', amount: -1 }))

    expect(res.status).toBe(400)
  })

  describe('with no API key configured', () => {
    beforeEach(() => {
      vi.stubEnv('GEMINI_API_KEY', '')
      vi.stubEnv('GOOGLE_API_KEY', '')
    })

    it('answers from the keyword heuristic and never calls Google', async () => {
      const { POST } = await import(ROUTE)
      const res = await POST(post({ description: 'Uber to client meeting' }))

      expect(res.status).toBe(200)
      expect(await res.json()).toEqual({
        category: 'Travel & Transport',
        source: 'heuristic',
      })
      expect(generateContent).not.toHaveBeenCalled()
    })

    it('falls back to Other for a description it cannot place', async () => {
      const { POST } = await import(ROUTE)
      const res = await POST(post({ description: 'zzzz unmatched thing' }))

      expect(await res.json()).toEqual({ category: 'Other', source: 'heuristic' })
    })

    it.each([
      ['Adobe Creative Cloud subscription', 'Software & Subscriptions'],
      ['Accountant fees', 'Professional Services'],
      ['Broadband bill', 'Utilities'],
      ['Client lunch at Pret', 'Meals (business)'],
      ['New monitor and keyboard', 'Office & Equipment'],
    ])('routes %j to %s', async (description, expected) => {
      const { POST } = await import(ROUTE)
      const res = await POST(post({ description }))
      expect((await res.json()).category).toBe(expected)
    })
  })

  describe('with an API key configured', () => {
    beforeEach(() => {
      vi.stubEnv('GEMINI_API_KEY', 'test-key')
    })

    it('returns the model category and marks the source as ai', async () => {
      gemini.text = 'Travel & Transport'
      const { POST } = await import(ROUTE)
      const res = await POST(post({ description: 'Something ambiguous' }))

      expect(res.status).toBe(200)
      expect(await res.json()).toEqual({ category: 'Travel & Transport', source: 'ai' })
      expect(generateContent).toHaveBeenCalledOnce()
    })

    it('includes the amount in the prompt when one is supplied', async () => {
      const { POST } = await import(ROUTE)
      await POST(post({ description: 'Train ticket', amount: 42.5 }))

      const [args] = generateContent.mock.calls[0] as [{ contents: string }]
      expect(args.contents).toContain('Train ticket')
      expect(args.contents).toContain('£42.50')
    })

    it('falls back to the heuristic when the model answers with nonsense', async () => {
      // The model is instructed to reply with one category and nothing else,
      // but it is not constrained to. An unrecognised answer must not be
      // echoed back to the UI as a category.
      gemini.text = 'I think this might be a business expense of some kind'
      const { POST } = await import(ROUTE)
      const res = await POST(post({ description: 'Uber home' }))

      expect(await res.json()).toEqual({ category: 'Travel & Transport', source: 'ai' })
    })

    it('falls back to the heuristic when the Google call throws', async () => {
      gemini.throws = true
      const { POST } = await import(ROUTE)
      const res = await POST(post({ description: 'Uber to the airport' }))

      expect(res.status).toBe(200)
      expect(await res.json()).toEqual({
        category: 'Travel & Transport',
        source: 'heuristic-fallback',
      })
    })
  })

  it('rate-limits one IP after 60 requests in the window', async () => {
    vi.stubEnv('GEMINI_API_KEY', '')
    vi.stubEnv('GOOGLE_API_KEY', '')
    const { POST } = await import(ROUTE)
    for (let i = 0; i < 60; i++) {
      expect((await POST(post({ description: 'Coffee' }, '198.51.100.7'))).status).toBe(200)
    }

    const res = await POST(post({ description: 'Coffee' }, '198.51.100.7'))
    expect(res.status).toBe(429)
    expect(res.headers.get('Retry-After')).toBeTruthy()
  })
})
