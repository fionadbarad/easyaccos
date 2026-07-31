/**
 * Identifier generation for locally-created records.
 *
 * `crypto.randomUUID()` is not universally present: it is gated on a SECURE
 * CONTEXT, so it is `undefined` over plain http (a LAN address during
 * development, a device on an internal network) and absent entirely on Safari
 * before 15.4. Every call site here creates a record the user just typed —
 * an invoice, an expense, a journey, an audit entry — and several of them are
 * invoked as `void appendAuditLog(...)`, where the TypeError becomes an
 * unhandled promise rejection and the save appears to silently do nothing.
 *
 * So: use the platform UUID when it exists, and otherwise build a v4-shaped id
 * from `crypto.getRandomValues`, falling back to `Math.random` only when there
 * is no WebCrypto at all. Uniqueness is what these ids need — they are record
 * keys, never secrets or tokens.
 */

const HEX: string[] = Array.from({ length: 256 }, (_, i) => i.toString(16).padStart(2, '0'))

function randomBytes(n: number): Uint8Array {
  const out = new Uint8Array(n)
  const c = typeof globalThis !== 'undefined' ? globalThis.crypto : undefined
  if (c?.getRandomValues) {
    c.getRandomValues(out)
    return out
  }
  for (let i = 0; i < n; i++) out[i] = Math.floor(Math.random() * 256)
  return out
}

/** A RFC-4122 v4-shaped unique identifier. Never throws. */
export function newId(): string {
  const c = typeof globalThis !== 'undefined' ? globalThis.crypto : undefined
  if (typeof c?.randomUUID === 'function') {
    try {
      return c.randomUUID()
    } catch {
      /* fall through to the manual path below */
    }
  }

  const b = randomBytes(16)
  b[6] = (b[6]! & 0x0f) | 0x40 // version 4
  b[8] = (b[8]! & 0x3f) | 0x80 // RFC-4122 variant

  const h = (i: number) => HEX[b[i]!]!
  return (
    `${h(0)}${h(1)}${h(2)}${h(3)}-${h(4)}${h(5)}-${h(6)}${h(7)}-` +
    `${h(8)}${h(9)}-${h(10)}${h(11)}${h(12)}${h(13)}${h(14)}${h(15)}`
  )
}
