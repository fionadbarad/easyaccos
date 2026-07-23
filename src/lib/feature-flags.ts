/**
 * Minimal feature-flag layer. Flags are read from the build env and can be
 * overridden per-device via localStorage (`ea:flags:<name> = "1" | "0"`).
 *
 * SSR-safe: env is consulted first, localStorage only when available.
 */

export const FLAG_GAAP = 'gaap'
export const FLAG_AUDIT = 'audit'

type FlagName = typeof FLAG_GAAP | typeof FLAG_AUDIT

const ENV_MAP: Record<FlagName, string | undefined> = {
  [FLAG_GAAP]: process.env.NEXT_PUBLIC_EA_GAAP,
  [FLAG_AUDIT]: process.env.NEXT_PUBLIC_EA_AUDIT,
}

function truthy(v: string | null | undefined): boolean {
  if (!v) return false
  return v === '1' || v.toLowerCase() === 'true' || v.toLowerCase() === 'on'
}

export function isFlagEnabled(name: FlagName): boolean {
  if (typeof window !== 'undefined') {
    try {
      const override = localStorage.getItem(`ea:flags:${name}`)
      if (override === '1' || override === 'true') return true
      if (override === '0' || override === 'false') return false
    } catch {
      /* ignore */
    }
  }
  return truthy(ENV_MAP[name])
}

export function setFlag(name: FlagName, on: boolean): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(`ea:flags:${name}`, on ? '1' : '0')
  } catch {
    /* ignore */
  }
}
