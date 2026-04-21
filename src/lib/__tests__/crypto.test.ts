import { describe, it, expect } from 'vitest'
import {
  generateDeviceKey,
  encryptWithKey,
  decryptWithKey,
  encryptWithPassphrase,
  decryptWithPassphrase,
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
})
