/**
 * WebCrypto helpers: device key (at-rest IndexedDB encryption)
 * and passphrase-derived key (backup file encryption).
 *
 * Device key is a non-extractable AES-GCM CryptoKey persisted in IndexedDB
 * via structured clone. It never leaves the origin. If the user clears site
 * data, the key (and therefore the data it protects) is gone — which is the
 * correct behaviour for local-first storage.
 */

const KDF_ITERATIONS = 310_000
const KDF_HASH = 'SHA-256'
const KDF_SALT_BYTES = 16
const IV_BYTES = 12

type CipherEnvelope = {
  iv: string // base64
  ct: string // base64
}

export type PassphraseEnvelope = {
  v: 1
  kdf: 'PBKDF2'
  hash: typeof KDF_HASH
  iterations: number
  salt: string // base64
  cipher: 'AES-GCM'
  iv: string // base64
  ct: string // base64
}

function subtle(): SubtleCrypto {
  const g: Crypto | undefined =
    typeof globalThis !== 'undefined' ? (globalThis.crypto as Crypto) : undefined
  if (!g?.subtle) throw new Error('WebCrypto unavailable in this environment')
  return g.subtle
}

function randomBytes(n: number): Uint8Array {
  const buf = new Uint8Array(n)
  crypto.getRandomValues(buf)
  return buf
}

/** TS 6 narrows Uint8Array to `<ArrayBufferLike>`; WebCrypto wants BufferSource. */
const buf = (u: Uint8Array): BufferSource => u as unknown as BufferSource

// ── base64 helpers (browser + node) ────────────────────────────────────────
function bytesToB64(bytes: Uint8Array): string {
  if (typeof Buffer !== 'undefined') return Buffer.from(bytes).toString('base64')
  let s = ''
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]!)
  return btoa(s)
}

function b64ToBytes(b64: string): Uint8Array {
  if (typeof Buffer !== 'undefined') return new Uint8Array(Buffer.from(b64, 'base64'))
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

const enc = new TextEncoder()
const dec = new TextDecoder()

// ── Device key (extractable=false, AES-GCM 256) ───────────────────────────
export async function generateDeviceKey(): Promise<CryptoKey> {
  return subtle().generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt'])
}

export async function encryptWithKey(key: CryptoKey, plaintext: string): Promise<CipherEnvelope> {
  const iv = randomBytes(IV_BYTES)
  const ct = new Uint8Array(
    await subtle().encrypt({ name: 'AES-GCM', iv: buf(iv) }, key, buf(enc.encode(plaintext))),
  )
  return { iv: bytesToB64(iv), ct: bytesToB64(ct) }
}

export async function decryptWithKey(key: CryptoKey, env: CipherEnvelope): Promise<string> {
  const iv = b64ToBytes(env.iv)
  const pt = await subtle().decrypt({ name: 'AES-GCM', iv: buf(iv) }, key, buf(b64ToBytes(env.ct)))
  return dec.decode(pt)
}

// ── Passphrase-derived key (for backup files) ─────────────────────────────
async function deriveKey(
  passphrase: string,
  salt: Uint8Array,
  iterations: number,
): Promise<CryptoKey> {
  const material = await subtle().importKey('raw', buf(enc.encode(passphrase)), 'PBKDF2', false, [
    'deriveKey',
  ])
  return subtle().deriveKey(
    { name: 'PBKDF2', salt: buf(salt), iterations, hash: KDF_HASH },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

export async function encryptWithPassphrase(
  passphrase: string,
  plaintext: string,
): Promise<PassphraseEnvelope> {
  if (!passphrase) throw new Error('Passphrase required')
  const salt = randomBytes(KDF_SALT_BYTES)
  const iv = randomBytes(IV_BYTES)
  const key = await deriveKey(passphrase, salt, KDF_ITERATIONS)
  const ct = new Uint8Array(
    await subtle().encrypt({ name: 'AES-GCM', iv: buf(iv) }, key, buf(enc.encode(plaintext))),
  )
  return {
    v: 1,
    kdf: 'PBKDF2',
    hash: KDF_HASH,
    iterations: KDF_ITERATIONS,
    salt: bytesToB64(salt),
    cipher: 'AES-GCM',
    iv: bytesToB64(iv),
    ct: bytesToB64(ct),
  }
}

export async function decryptWithPassphrase(
  passphrase: string,
  env: PassphraseEnvelope,
): Promise<string> {
  if (env.v !== 1 || env.kdf !== 'PBKDF2' || env.cipher !== 'AES-GCM') {
    throw new Error('Unsupported backup format')
  }
  const salt = b64ToBytes(env.salt)
  const iv = b64ToBytes(env.iv)
  const key = await deriveKey(passphrase, salt, env.iterations)
  try {
    const pt = await subtle().decrypt(
      { name: 'AES-GCM', iv: buf(iv) },
      key,
      buf(b64ToBytes(env.ct)),
    )
    return dec.decode(pt)
  } catch {
    throw new Error('Incorrect passphrase or corrupted backup')
  }
}
