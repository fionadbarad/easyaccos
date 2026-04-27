/**
 * useUserData — Supabase-backed persistence with encrypted IndexedDB
 * guest fallback.
 *
 * Public API: { items, persist, loading, isAuthenticated, syncStatus }.
 * Local data is AES-GCM encrypted and survives browser refreshes via
 * IndexedDB rather than localStorage. Existing localStorage data is migrated
 * transparently on first read.
 *
 * `syncStatus` reports the last Supabase write outcome so the UI can surface
 * connectivity problems instead of silently dropping changes. `updated_at`
 * timestamps are included on every upsert and used to skip stale local
 * writes that would clobber a newer server-side row.
 */

'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient, isSupabaseConfigured } from '@/lib/supabase-browser'
import { secureRead, secureWrite } from '@/lib/storage/secure-store'
import { appendAuditLog } from '@/lib/audit'
import { reportError, reportWarn } from '@/lib/monitor'
import type { SupabaseClient, User } from '@supabase/supabase-js'

type Table = 'user_transactions' | 'user_expenses' | 'user_invoices' | 'user_mileage'

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'offline' | 'error'

const RESTORE_EVENT = 'easyacco:restored'

export function useUserData<T extends { id: string; updated_at?: string }>(
  table: Table,
  localKey: string,
  seed: T[],
) {
  const supabaseRef  = useRef<SupabaseClient | null>(isSupabaseConfigured ? createClient() : null)
  const supabase     = supabaseRef.current

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

  // ── Load data when user is known ─────────────────────────────────────────
  const reloadKey = useRestoreSignal()

  useEffect(() => {
    let cancelled = false

    async function loadLocal() {
      try {
        const recordKey = `${table}:${user?.id ?? 'guest'}`
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
            await loadLocal()
          } else {
            setItems((rows ?? []) as T[])
            setSyncStatus('synced')
            // Cache an encrypted local copy for instant rehydration next load.
            try { await secureWrite(`${table}:${user.id}`, rows ?? []) }
            catch (err) { reportError('useUserData.cacheWrite', err, { table }) }
            setLoading(false)
          }
        } catch (err) {
          if (cancelled) return
          reportError('useUserData.load.exception', err, { table })
          setSyncStatus('error')
          await loadLocal()
        }
      } else if (user === null) {
        await loadLocal()
      }
    }

    load()
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, table, localKey, reloadKey])

  // ── Persist ───────────────────────────────────────────────────────────────
  const persist = useCallback(async (next: T[]) => {
    const now = new Date().toISOString()

    // Stamp updated_at on rows whose contents changed (or are new) so the
    // server-side conflict check below can compare timestamps meaningfully.
    const prevMap = new Map(items.map(i => [i.id, i]))
    const stamped: T[] = next.map((item) => {
      const before = prevMap.get(item.id)
      const changed = !before || JSON.stringify(before) !== JSON.stringify(item)
      return changed ? { ...item, updated_at: now } : item
    })

    // ── Audit diff (best-effort, never blocks persist) ──────────────────────
    const nextMap  = new Map(stamped.map(i => [i.id, i]))
    const actor    = user?.email ?? 'guest'
    const entity   = table.replace(/^user_/, '')

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

    setItems(stamped)

    if (user && supabase) {
      setSyncStatus('syncing')
      try {
        // Pull current ids + updated_at to detect both deletions and stale writes.
        const { data: existing, error: selectErr } = await supabase
          .from(table)
          .select('id, updated_at')
          .eq('user_id', user.id)

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

        // Skip rows whose server copy is newer than what we are about to write.
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
            upsertable.map((item) => ({ ...item, user_id: user.id, updated_at: item.updated_at ?? now })),
            { onConflict: 'id' },
          )
          if (upErr) throw upErr
        }

        try { await secureWrite(`${table}:${user.id}`, stamped) }
        catch (err) { reportError('useUserData.localCache', err, { table }) }

        setSyncStatus('synced')
      } catch (err) {
        reportError('useUserData.persist', err, { table, userId: user.id })
        setSyncStatus('error')
        // Keep optimistic state in encrypted local cache so user data isn't lost.
        try { await secureWrite(`${table}:${user.id}`, stamped) }
        catch (cacheErr) { reportError('useUserData.persist.localFallback', cacheErr, { table }) }
      }
    } else {
      try { await secureWrite(`${table}:guest`, stamped) }
      catch (err) { reportError('useUserData.persist.guest', err, { table }) }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, table, supabase, items])

  return { items, persist, loading, isAuthenticated: !!user, syncStatus }
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
