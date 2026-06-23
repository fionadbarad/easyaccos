/**
 * useUserData — Supabase-backed persistence with encrypted IndexedDB
 * guest fallback.
 *
 * Public API: { items, persist, loading, isAuthenticated, syncStatus }.
 * Local data is AES-GCM encrypted and survives browser refreshes via
 * IndexedDB rather than localStorage. Existing localStorage data is migrated
 * transparently on first read.
 *
 * The hook composes three single-purpose helpers below:
 *   - emitAuditDiff:     write create/update/delete entries to the audit log
 *   - syncSupabaseRows:  upsert/delete with updated_at conflict skip
 *   - loadLocalSnapshot: encrypted IDB read with seed fallback
 */

'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { createClient, isSupabaseConfigured } from '@/lib/supabase-browser'
import { secureRead, secureWrite } from '@/lib/storage/secure-store'
import { appendAuditLog } from '@/lib/audit'
import { reportError, reportWarn } from '@/lib/monitor'
import type { SupabaseClient, User } from '@supabase/supabase-js'

type Table = 'user_transactions' | 'user_expenses' | 'user_invoices' | 'user_mileage'

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'offline' | 'error'

const RESTORE_EVENT = 'easyacco:restored'

interface AuditableRow { id: string; updated_at?: string }

export function useUserData<T extends AuditableRow>(
  table: Table,
  localKey: string,
  seed: T[],
) {
  const supabase     = useMemo<SupabaseClient | null>(() => (
    isSupabaseConfigured ? createClient() : null
  ), [])

  const [items,      setItems]      = useState<T[]>([])
  const [user,       setUser]       = useState<User | null>(null)
  const [loading,    setLoading]    = useState(true)
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(supabase ? 'idle' : 'offline')

  // ── Track auth state ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!supabase) {
      setUser(null)
      return
    }
    supabase.auth.getSession()
      .then(({ data }) => setUser(data.session?.user ?? null))
      .catch((err) => {
        reportError('useUserData.getSession', err, { table })
        setUser(null)
      })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [supabase, table])

  const reloadKey = useRestoreSignal()

  // ── Load on mount / auth change / restore signal ─────────────────────────
  useEffect(() => {
    let cancelled = false

    async function load() {
      if (user && supabase) {
        setSyncStatus('syncing')
        try {
          const { data: rows, error } = await supabase
            .from(table)
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })

          if (cancelled) return
          if (error) {
            reportError('useUserData.load', error, { table, userId: user.id })
            setSyncStatus('error')
            await loadLocalSnapshot<T>(table, user.id, localKey, seed, cancelled, setItems, setLoading)
            return
          }
          setItems((rows ?? []) as T[])
          setSyncStatus('synced')
          try { await secureWrite(`${table}:${user.id}`, rows ?? []) }
          catch (err) { reportError('useUserData.cacheWrite', err, { table }) }
          setLoading(false)
        } catch (err) {
          if (cancelled) return
          reportError('useUserData.load.exception', err, { table })
          setSyncStatus('error')
          await loadLocalSnapshot<T>(table, user.id, localKey, seed, cancelled, setItems, setLoading)
        }
      } else if (user === null) {
        await loadLocalSnapshot<T>(table, null, localKey, seed, cancelled, setItems, setLoading)
      }
    }

    load()
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, table, localKey, reloadKey])

  // ── Persist ───────────────────────────────────────────────────────────────
  const persist = useCallback(async (next: T[]) => {
    const now      = new Date().toISOString()
    const prevMap  = new Map(items.map(i => [i.id, i]))

    // Stamp updated_at on rows whose contents changed so the conflict check
    // below has a meaningful timestamp to compare against the server copy.
    const stamped: T[] = next.map((item) => {
      const before = prevMap.get(item.id)
      const changed = !before || JSON.stringify(before) !== JSON.stringify(item)
      return changed ? { ...item, updated_at: now } : item
    })

    emitAuditDiff(table, prevMap, stamped, user, supabase)
    setItems(stamped)

    if (user && supabase) {
      setSyncStatus('syncing')
      const ok = await syncSupabaseRows(supabase, table, user.id, stamped, now)
      setSyncStatus(ok ? 'synced' : 'error')
      // Always keep an encrypted local cache so optimistic state isn't lost
      // even when the server write fails.
      try { await secureWrite(`${table}:${user.id}`, stamped) }
      catch (err) { reportError('useUserData.localCache', err, { table }) }
    } else {
      try { await secureWrite(`${table}:guest`, stamped) }
      catch (err) { reportError('useUserData.persist.guest', err, { table }) }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, table, supabase, items])

  return { items, persist, loading, isAuthenticated: !!user, syncStatus }
}

// ── Helpers ────────────────────────────────────────────────────────────────

/** Read encrypted snapshot from IDB; fall back to seed on any failure. */
async function loadLocalSnapshot<T extends AuditableRow>(
  table:    Table,
  userId:   string | null,
  localKey: string,
  seed:     T[],
  cancelled: boolean,
  setItems:  (xs: T[]) => void,
  setLoading: (b: boolean) => void,
): Promise<void> {
  try {
    const recordKey = `${table}:${userId ?? 'guest'}`
    const data = await secureRead<T[]>(recordKey, localKey, seed)
    if (!cancelled) {
      setItems(data)
      setLoading(false)
    }
  } catch (err) {
    reportError('useUserData.loadLocal', err, { table })
    if (!cancelled) {
      setItems(seed)
      setLoading(false)
    }
  }
}

/** Best-effort audit log diff: create/update/delete entries per row change. */
function emitAuditDiff<T extends AuditableRow>(
  table:    Table,
  prevMap:  Map<string, T>,
  stamped:  T[],
  user:     User | null,
  supabase: SupabaseClient | null,
): void {
  const nextMap = new Map(stamped.map(i => [i.id, i]))
  const actor   = user?.email ?? 'guest'
  const entity  = table.replace(/^user_/, '')

  for (const [id, after] of nextMap) {
    const before = prevMap.get(id)
    const op = before ? 'update' : 'create'
    if (op === 'update' && JSON.stringify(before) === JSON.stringify(after)) continue
    void appendAuditLog({ entity, entityId: id, op, before: before ?? null, after, actor }, supabase, user?.id)
  }
  for (const [id, before] of prevMap) {
    if (!nextMap.has(id)) {
      void appendAuditLog({ entity, entityId: id, op: 'delete', before, after: null, actor }, supabase, user?.id)
    }
  }
}

/**
 * Mirror `stamped` to Supabase: delete rows missing from the new set, then
 * upsert the rest. Rows whose server copy is newer than the local copy are
 * skipped (logged as conflicts) so a slow client cannot overwrite a faster
 * write from another device.
 *
 * Returns true on success, false on any error (caller flips syncStatus).
 */
async function syncSupabaseRows<T extends AuditableRow>(
  supabase: SupabaseClient,
  table:    Table,
  userId:   string,
  stamped:  T[],
  now:      string,
): Promise<boolean> {
  try {
    const { data: existing, error: selectErr } = await supabase
      .from(table)
      .select('id, updated_at')
      .eq('user_id', userId)

    if (selectErr) throw selectErr

    const existingMap = new Map<string, string | null>(
      (existing ?? []).map((r: { id: string; updated_at: string | null }) => [r.id, r.updated_at]),
    )
    const nextIds = new Set<string>(stamped.map((i) => i.id))

    const toDelete = [...existingMap.keys()].filter((id) => !nextIds.has(id))
    if (toDelete.length > 0) {
      const { error: delErr } = await supabase.from(table).delete().in('id', toDelete)
      if (delErr) throw delErr
    }

    const upsertable: T[] = []
    for (const item of stamped) {
      const serverTs = existingMap.get(item.id)
      const localTs  = item.updated_at
      if (serverTs && localTs && serverTs > localTs) {
        reportWarn('useUserData.persist.conflict', 'server row newer than local — skipping', {
          table, id: item.id, serverTs, localTs,
        })
        continue
      }
      upsertable.push(item)
    }

    if (upsertable.length > 0) {
      const { error: upErr } = await supabase.from(table).upsert(
        upsertable.map((item) => ({ ...item, user_id: userId, updated_at: item.updated_at ?? now })),
        { onConflict: 'id' },
      )
      if (upErr) throw upErr
    }
    return true
  } catch (err) {
    reportError('useUserData.persist', err, { table, userId })
    return false
  }
}

/**
 * Bumps a counter whenever a global restore event fires. Components using
 * useUserData re-load their backing data automatically — no page refresh.
 */
function useRestoreSignal(): number {
  const [tick, setTick] = useState(0)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const handler = () => setTick((n) => n + 1)
    window.addEventListener(RESTORE_EVENT, handler)
    return () => window.removeEventListener(RESTORE_EVENT, handler)
  }, [])
  return tick
}

export function emitRestoreEvent(): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(RESTORE_EVENT))
}
