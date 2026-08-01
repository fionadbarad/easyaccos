import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

// AES-256-GCM authenticated encryption for short-lived HMRC token payloads
// stored in HttpOnly cookies. GCM gives us tamper-detection for free via the
// auth tag — if anyone flips a bit in the cookie, decrypt() returns null.

const ALGO = 'aes-256-gcm'
const IV_BYTES = 12 // GCM standard
const TAG_BYTES = 16
const KEY_BYTES = 32 // AES-256

// Node accepts GCM auth tags of 4, 8, 12, 13, 14, 15 or 16 bytes. The tag
// arrives inside a cookie, which is to say it arrives from the attacker, so
// leaving the length open would let a forger present a 4-byte tag and cut the
// work of faking a valid token from 2^128 to 2^32 — a number small enough to
// brute-force. Pinning authTagLength makes anything shorter fail inside the
// cipher itself rather than relying on the explicit check in decrypt(), which a
// later refactor could remove without any test noticing. Both are kept: one is
// the guarantee, the other returns null instead of throwing.
const GCM_OPTS = { authTagLength: TAG_BYTES } as const

function readKey(): Buffer {
  const raw = process.env.HMRC_COOKIE_SECRET
  if (!raw) {
    throw new Error('HMRC_COOKIE_SECRET is not set')
  }
  const key = Buffer.from(raw, 'base64')
  if (key.length !== KEY_BYTES) {
    throw new Error(
      `HMRC_COOKIE_SECRET must decode to ${KEY_BYTES} bytes (got ${key.length}). ` +
        "Generate with: node -e \"console.log(require('crypto').randomBytes(32).toString('base64'))\"",
    )
  }
  return key
}

function toB64Url(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromB64Url(s: string): Buffer {
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4))
  return Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/') + pad, 'base64')
}

export function encrypt(plaintext: string): string {
  const key = readKey()
  const iv = randomBytes(IV_BYTES)
  const cipher = createCipheriv(ALGO, key, iv, GCM_OPTS)
  const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${toB64Url(iv)}.${toB64Url(tag)}.${toB64Url(enc)}`
}

export function decrypt(payload: string): string | null {
  const parts = payload.split('.')
  if (parts.length !== 3) return null
  const [ivPart, tagPart, encPart] = parts as [string, string, string]
  try {
    const key = readKey()
    const iv = fromB64Url(ivPart)
    const tag = fromB64Url(tagPart)
    const enc = fromB64Url(encPart)
    if (iv.length !== IV_BYTES || tag.length !== TAG_BYTES) return null
    const decipher = createDecipheriv(ALGO, key, iv, GCM_OPTS)
    decipher.setAuthTag(tag)
    const dec = Buffer.concat([decipher.update(enc), decipher.final()])
    return dec.toString('utf8')
  } catch {
    return null
  }
}

export function randomToken(byteLen = 32): string {
  return toB64Url(randomBytes(byteLen))
}
