import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { exchangeCodeForTokens, readHmrcEnv, refreshTokens } from '../oauth'

const HMRC_KEYS = [
  'HMRC_CLIENT_ID',
  'HMRC_CLIENT_SECRET',
  'HMRC_API_BASE',
  'HMRC_LOGIN_BASE',
  'HMRC_REDIRECT_URI',
  'HMRC_SCOPES',
] as const

const ALL_SET = {
  HMRC_CLIENT_ID: 'cid',
  HMRC_CLIENT_SECRET: 'csec',
  HMRC_API_BASE: 'https://test-api.service.hmrc.gov.uk',
  HMRC_LOGIN_BASE: 'https://test-www.tax.service.gov.uk',
  HMRC_REDIRECT_URI: 'http://localhost:3000/api/hmrc/auth/callback',
  HMRC_SCOPES: 'hello',
}

let saved: Record<string, string | undefined>

beforeEach(() => {
  saved = Object.fromEntries(HMRC_KEYS.map((k) => [k, process.env[k]]))
  for (const [k, v] of Object.entries(ALL_SET)) {
    process.env[k] = v
  }
})

afterEach(() => {
  for (const k of HMRC_KEYS) {
    if (saved[k] === undefined) delete process.env[k]
    else process.env[k] = saved[k]
  }
  vi.unstubAllGlobals()
})

describe('readHmrcEnv', () => {
  test('returns config when all keys present', () => {
    const env = readHmrcEnv()
    expect('error' in env).toBe(false)
    if ('error' in env) return
    expect(env.clientId).toBe('cid')
    expect(env.loginBase).toBe('https://test-www.tax.service.gov.uk')
    expect(env.scopes).toBe('hello')
  })

  test('returns error listing each missing key', () => {
    delete process.env.HMRC_CLIENT_ID
    delete process.env.HMRC_REDIRECT_URI
    const env = readHmrcEnv()
    expect('error' in env).toBe(true)
    if ('error' in env) {
      expect(env.error).toContain('HMRC_CLIENT_ID')
      expect(env.error).toContain('HMRC_REDIRECT_URI')
    }
  })
})

function mockFetchOnce(status: number, json: unknown) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValueOnce({
      ok: status >= 200 && status < 300,
      status,
      json: async () => json,
    }),
  )
}

describe('exchangeCodeForTokens', () => {
  test('parses a successful response into StoredTokens', async () => {
    mockFetchOnce(200, {
      access_token: 'AT',
      refresh_token: 'RT',
      scope: 'hello',
      expires_in: 14400,
      token_type: 'bearer',
    })
    const env = readHmrcEnv()
    if ('error' in env) throw new Error('env not set')
    const before = Date.now()
    const r = await exchangeCodeForTokens(env, 'thecode')
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.tokens.accessToken).toBe('AT')
    expect(r.tokens.refreshToken).toBe('RT')
    expect(r.tokens.scope).toBe('hello')
    // expiresAt should be ~ now + 14400s, within a reasonable window
    expect(r.tokens.expiresAt).toBeGreaterThanOrEqual(before + 14400 * 1000 - 1000)
    expect(r.tokens.expiresAt).toBeLessThanOrEqual(Date.now() + 14400 * 1000 + 1000)
  })

  test('returns error result when HMRC responds non-2xx', async () => {
    mockFetchOnce(400, { error: 'invalid_grant', error_description: 'bad code' })
    const env = readHmrcEnv()
    if ('error' in env) throw new Error('env not set')
    const r = await exchangeCodeForTokens(env, 'badcode')
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.status).toBe(400)
    expect(r.message).toBe('bad code')
  })

  test('returns error result when access_token is missing despite 200', async () => {
    mockFetchOnce(200, { scope: 'hello' })
    const env = readHmrcEnv()
    if ('error' in env) throw new Error('env not set')
    const r = await exchangeCodeForTokens(env, 'thecode')
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.message).toMatch(/missing/i)
  })
})

describe('refreshTokens', () => {
  test('parses a successful refresh response', async () => {
    mockFetchOnce(200, {
      access_token: 'AT2',
      refresh_token: 'RT2',
      scope: 'hello',
      expires_in: 14400,
    })
    const env = readHmrcEnv()
    if ('error' in env) throw new Error('env not set')
    const r = await refreshTokens(env, 'oldRT')
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.tokens.accessToken).toBe('AT2')
    expect(r.tokens.refreshToken).toBe('RT2')
  })

  test('returns error when refresh is rejected', async () => {
    mockFetchOnce(401, { error: 'invalid_grant' })
    const env = readHmrcEnv()
    if ('error' in env) throw new Error('env not set')
    const r = await refreshTokens(env, 'oldRT')
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.status).toBe(401)
  })
})
