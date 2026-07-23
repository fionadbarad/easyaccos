/**
 * Lightweight monitoring shim — central place to forward errors and warnings
 * out of catch blocks. Defaults to a console transport in dev; production
 * sites can register a real sink (Sentry/Logtail/Honeycomb/etc.) by calling
 * `setMonitorTransport(fn)` once at boot.
 *
 * Built-in protection:
 *   - de-duplication: identical {scope, message} events within DEDUPE_MS are
 *     collapsed into a single emission so one repeating bug doesn't blow out
 *     your log budget;
 *   - rate-limit: hard cap per-process to MAX_BURST in WINDOW_MS.
 */

export type MonitorLevel = 'info' | 'warn' | 'error'

export interface MonitorEvent {
  level: MonitorLevel
  scope: string
  message: string
  meta?: Record<string, unknown>
  timestamp: number
}

export type MonitorTransport = (event: MonitorEvent) => void

const DEDUPE_MS = 30_000
const WINDOW_MS = 60_000
const MAX_BURST = 100

const recent = new Map<string, number>()
const burst: number[] = []

let transport: MonitorTransport = consoleTransport

export function setMonitorTransport(fn: MonitorTransport): void {
  transport = fn
}

export function reportError(scope: string, error: unknown, meta?: Record<string, unknown>): void {
  emit({
    level: 'error',
    scope,
    message: error instanceof Error ? error.message : String(error),
    meta: { ...meta, stack: error instanceof Error ? error.stack : undefined },
    timestamp: Date.now(),
  })
}

export function reportWarn(scope: string, message: string, meta?: Record<string, unknown>): void {
  emit({ level: 'warn', scope, message, meta, timestamp: Date.now() })
}

export function reportInfo(scope: string, message: string, meta?: Record<string, unknown>): void {
  emit({ level: 'info', scope, message, meta, timestamp: Date.now() })
}

function emit(ev: MonitorEvent): void {
  if (rateLimited(ev.timestamp)) return
  if (deduped(ev)) return
  try {
    transport(ev)
  } catch {
    /* never let the monitor itself throw */
  }
}

function deduped(ev: MonitorEvent): boolean {
  const key = `${ev.level}:${ev.scope}:${ev.message}`
  const last = recent.get(key)
  if (last !== undefined && ev.timestamp - last < DEDUPE_MS) return true
  recent.set(key, ev.timestamp)
  // Trim the dedupe map if it grows; cheap LRU-ish housekeeping.
  if (recent.size > 256) {
    const cutoff = ev.timestamp - DEDUPE_MS
    for (const [k, t] of recent) if (t < cutoff) recent.delete(k)
  }
  return false
}

function rateLimited(now: number): boolean {
  while (burst.length > 0 && (burst[0] ?? 0) < now - WINDOW_MS) burst.shift()
  if (burst.length >= MAX_BURST) return true
  burst.push(now)
  return false
}

function consoleTransport(ev: MonitorEvent): void {
  if (typeof console === 'undefined') return
  const tag = `[monitor:${ev.scope}]`
  if (ev.level === 'error') console.error(tag, ev.message, ev.meta ?? {})
  else if (ev.level === 'warn') console.warn(tag, ev.message, ev.meta ?? {})
  else console.info(tag, ev.message, ev.meta ?? {})
}

/** Test-only: drop dedupe/rate state between tests. */
export function __resetMonitor(): void {
  recent.clear()
  burst.length = 0
  transport = consoleTransport
}
