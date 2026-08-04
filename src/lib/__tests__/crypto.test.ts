import { describe, it, expect } from 'vitest'
import {
  generateDeviceKey,
  encryptWithKey,
  decryptWithKey,
  encryptWithPassphrase,
  decryptWithPassphrase,
  type PassphraseEnvelope,
} from '@/lib/storage/crypto'

describe('crypto — device key', () => {
  it('round-trips JSON through AES-GCM', async () => {
    const key = await generateDeviceKey()
    const payload = JSON.stringify({ hello: 'world', n: 42, arr: [1, 2, 3] })
    const env = await encryptWithKey(key, payload)
    expect(env.iv).toBeTypeOf('string')
    expect(env.ct).toBeTypeOf('string')
    expect(env.ct).not.toContain('hello')
    const out = await decryptWithKey(key, env)
    expect(out).toBe(payload)
  })

  it('produces different ciphertexts for the same plaintext (random IV)', async () => {
    const key = await generateDeviceKey()
    const a = await encryptWithKey(key, 'same')
    const b = await encryptWithKey(key, 'same')
    expect(a.ct).not.toBe(b.ct)
    expect(a.iv).not.toBe(b.iv)
  })

  it('fails to decrypt with a different key', async () => {
    const k1 = await generateDeviceKey()
    const k2 = await generateDeviceKey()
    const env = await encryptWithKey(k1, 'secret')
    await expect(decryptWithKey(k2, env)).rejects.toBeDefined()
  })
})

describe('crypto — passphrase (backup)', () => {
  // PBKDF2 at 310k iterations is deliberately slow; keep these tests lean.
  it('encrypts and decrypts with the correct passphrase', async () => {
    const env = await encryptWithPassphrase('correct horse battery staple', 'ledger')
    expect(env.v).toBe(1)
    expect(env.kdf).toBe('PBKDF2')
    expect(env.cipher).toBe('AES-GCM')
    const out = await decryptWithPassphrase('correct horse battery staple', env)
    expect(out).toBe('ledger')
  }, 15_000)

  it('rejects a wrong passphrase with a clear error', async () => {
    const env = await encryptWithPassphrase('right', 'ledger')
    await expect(decryptWithPassphrase('wrong', env)).rejects.toThrow(/passphrase|corrupted/i)
  }, 15_000)

  it('rejects an empty passphrase on encrypt', async () => {
    await expect(encryptWithPassphrase('', 'x')).rejects.toThrow(/passphrase/i)
  })

  // The iteration count comes out of a file the user was handed, so it is
  // untrusted input. An absurd count must be refused BEFORE deriveKey runs —
  // 10 billion rounds would otherwise freeze the tab. These cases are fast
  // precisely because nothing derives.
  describe('iteration-count bounds', () => {
    const envelope = (iterations: number): PassphraseEnvelope => ({
      v: 1,
      kdf: 'PBKDF2',
      hash: 'SHA-256',
      iterations,
      salt: 'AAAAAAAAAAAAAAAAAAAAAA==',
      cipher: 'AES-GCM',
      iv: 'AAAAAAAAAAAAAAAA',
      ct: 'AAAAAAAAAAAAAAAAAAAAAA==',
    })

    it('rejects a count high enough to hang the tab', async () => {
      const start = Date.now()
      await expect(decryptWithPassphrase('pw', envelope(10_000_000_000))).rejects.toThrow(
        /iteration count/i,
      )
      expect(Date.now() - start).toBeLessThan(1_000)
    })

    it('rejects a brute-forceable count', async () => {
      await expect(decryptWithPassphrase('pw', envelope(1))).rejects.toThrow(/iteration count/i)
    })

    it('rejects a non-integer count', async () => {
      await expect(decryptWithPassphrase('pw', envelope(310_000.5))).rejects.toThrow(
        /iteration count/i,
      )
      await expect(decryptWithPassphrase('pw', envelope(NaN))).rejects.toThrow(/iteration count/i)
    })

    it('still accepts the count our own exports write', async () => {
      const env = await encryptWithPassphrase('pw', 'ledger')
      expect(env.iterations).toBe(310_000)
      expect(await decryptWithPassphrase('pw', env)).toBe('ledger')
    }, 15_000)
  })
})
