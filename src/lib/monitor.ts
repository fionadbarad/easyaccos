/**
 * Lightweight monitoring shim — central place to forward errors and warnings
 * out of catch blocks. Today this writes structured records to the browser
 * console; swap the body for Sentry/Logtail/etc. without touching call sites.
 */

export type MonitorLevel = 'info' | 'warn' | 'error'

export interface MonitorEvent {
  level:   MonitorLevel
  scope:   string
  message: string
  meta?:   Record<string, unknown>
}

export function reportError(scope: string, error: unknown, meta?: Record<string, unknown>): void {
  emit({
    level:   'error',
    scope,
    message: error instanceof Error ? error.message : String(error),
    meta:    { ...meta, stack: error instanceof Error ? error.stack : undefined },
  })
}

export function reportWarn(scope: string, message: string, meta?: Record<string, unknown>): void {
  emit({ level: 'warn', scope, message, meta })
}

function emit(ev: MonitorEvent): void {
  if (typeof console === 'undefined') return
  const tag = `[monitor:${ev.scope}]`
  if (ev.level === 'error')      console.error(tag, ev.message, ev.meta ?? {})
  else if (ev.level === 'warn')  console.warn(tag, ev.message, ev.meta ?? {})
  else                           console.info(tag, ev.message, ev.meta ?? {})
}
