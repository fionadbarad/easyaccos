import { randomBytes } from 'node:crypto'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { decrypt, encrypt, randomToken } from '../crypto'

const TEST_KEY = randomBytes(32).toString('base64')
let saved: string | undefined

beforeEach(() => {
  saved = process.env.HMRC_COOKIE_SECRET
  process.env.HMRC_COOKIE_SECRET = TEST_KEY
})

afterEach(() => {
  if (saved === undefined) delete process.env.HMRC_COOKIE_SECRET
  else process.env.HMRC_COOKIE_SECRET = saved
})

describe('hmrc/crypto · AES-256-GCM cookie payloads', () => {
  test('encrypt → decrypt round-trips arbitrary JSON', () => {
    const payload = JSON.stringify({ accessToken: 'a'.repeat(40), expiresAt: 1234567890 })
    const enc = encrypt(payload)
    expect(decrypt(enc)).toBe(payload)
  })

  test('encrypt produces a fresh IV every call (different ciphertext for same input)', () => {
    const enc1 = encrypt('hello')
    const enc2 = encrypt('hello')
    expect(enc1).not.toBe(enc2)
    expect(decrypt(enc1)).toBe('hello')
    expect(decrypt(enc2)).toBe('hello')
  })

  test('decrypt returns null when the auth tag is flipped (tamper detection)', () => {
    const enc = encrypt('top-secret')
    const [iv, tag, ct] = enc.split('.') as [string, string, string]
    const tagBuf = Buffer.from(tag.replace(/-/g, '+').replace(/_/g, '/'), 'base64')
    tagBuf[0] = (tagBuf[0] ?? 0) ^ 0x01
    const flippedTag = tagBuf
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')
    expect(decrypt(`${iv}.${flippedTag}.${ct}`)).toBeNull()
  })

  test('decrypt returns null when ciphertext is flipped (tamper detection)', () => {
    const enc = encrypt('top-secret')
    const [iv, tag, ct] = enc.split('.') as [string, string, string]
    const ctBuf = Buffer.from(ct.replace(/-/g, '+').replace(/_/g, '/'), 'base64')
    ctBuf[0] = (ctBuf[0] ?? 0) ^ 0x01
    const flippedCt = ctBuf
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')
    expect(decrypt(`${iv}.${tag}.${flippedCt}`)).toBeNull()
  })

  test('decrypt rejects a truncated auth tag', () => {
    // Node will happily verify a 4-byte GCM tag unless authTagLength is pinned.
    // The tag comes out of a cookie, so an attacker chooses it: without this
    // being rejected, forging a token drops from 2^128 work to 2^32.
    const enc = encrypt('top-secret')
    const [iv, tag, ct] = enc.split('.') as [string, string, string]
    const short = Buffer.from(tag.replace(/-/g, '+').replace(/_/g, '/'), 'base64').subarray(0, 4)
    const shortTag = short
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')
    expect(decrypt(`${iv}.${shortTag}.${ct}`)).toBeNull()
  })

  test('decrypt rejects every tag length Node would otherwise accept', () => {
    // 16 is the only legitimate one. The rest are the sizes GCM permits and
    // which setAuthTag would take without complaint.
    const enc = encrypt('top-secret')
    const [iv, tag, ct] = enc.split('.') as [string, string, string]
    const full = Buffer.from(tag.replace(/-/g, '+').replace(/_/g, '/'), 'base64')
    for (const len of [4, 8, 12, 13, 14, 15]) {
      const t = full
        .subarray(0, len)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '')
      expect(decrypt(`${iv}.${t}.${ct}`)).toBeNull()
    }
    expect(decrypt(enc)).toBe('top-secret')
  })

  test('decrypt returns null on malformed payload (wrong number of parts)', () => {
    expect(decrypt('not-a-cookie')).toBeNull()
    expect(decrypt('a.b')).toBeNull()
    expect(decrypt('a.b.c.d')).toBeNull()
  })

  test('decrypt returns null when encrypted under a different key', () => {
    const enc = encrypt('payload')
    process.env.HMRC_COOKIE_SECRET = randomBytes(32).toString('base64')
    expect(decrypt(enc)).toBeNull()
  })

  test('encrypt throws when HMRC_COOKIE_SECRET is missing', () => {
    delete process.env.HMRC_COOKIE_SECRET
    expect(() => encrypt('x')).toThrow(/HMRC_COOKIE_SECRET/)
  })

  test('encrypt throws when HMRC_COOKIE_SECRET is the wrong length', () => {
    process.env.HMRC_COOKIE_SECRET = Buffer.from('too-short').toString('base64')
    expect(() => encrypt('x')).toThrow(/32 bytes/)
  })

  test('randomToken produces base64url with no padding and differs each call', () => {
    const a = randomToken()
    const b = randomToken()
    expect(a).not.toBe(b)
    expect(a).toMatch(/^[A-Za-z0-9_-]+$/)
    expect(a).not.toContain('=')
  })
})
