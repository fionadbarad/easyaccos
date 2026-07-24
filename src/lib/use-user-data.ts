/**
 * useUserData — Supabase-backed persistence with encrypted IndexedDB
 * guest fallback.
 *
 * Public API: { items, persist, loading, isAuthenticated, syncStatus }.
 * Local data is AES-GCM encrypted and survives browser refreshes via
 * IndexedDB rather than localStorage. Existing localStorage data is migrated
 * transparently on first read.
 */

'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { getSupabaseBrowserClient } from '@/lib/supabase-client-singleton'
import { isSupabaseConfigured } from '@/lib/supabase-browser'
import { secureRead, secureWrite } from '@/lib/storage/secure-store'
import { appendAuditLog } from '@/lib/audit'
import { reportError, reportWarn } from '@/lib/monitor'
import type { SupabaseClient, User } from '@supabase/supabase-js'

type Table = 'user_transactions' | 'user_expenses' | 'user_invoices' | 'user_mileage'

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'offline' | 'error'

const RESTORE_EVENT = 'easyacco:restored'

interface AuditableRow {
  id: string
  updated_at?: string
}

export function useUserData<T extends AuditableRow>(table: Table, localKey: string, seed: T[]) {
  const supabase = useMemo(() => getSupabaseBrowserClient(), [])

  const [items, setItems] = useState<T[]>([])
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(supabase ? 'idle' : 'offline')

  // ── Track auth state ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!supabase) return

    let mounted = true
    let debounceTimer: NodeJS.Timeout

    // Check current session
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (mounted) setUser(data.session?.user ?? null)
      })
      .catch((err) => {
        reportError('useUserData.getSession', err, { table })
        if (mounted) setUser(null)
      })

    // Subscribe to auth changes with a small debounce to avoid rapid re-renders
    // during multi-step auth flows
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_, session) => {
      clearTimeout(debounceTimer)
      debounceTimer = setTimeout(() => {
        if (mounted) setUser(session?.user ?? null)
      }, 50)
    })

    return () => {
      mounted = false
      clearTimeout(debounceTimer)
      subscription.unsubscribe()
    }
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
            await loadLocalSnapshot<T>(
              table,
              user.id,
              localKey,
              seed,
              cancelled,
              setItems,
              setLoading,
            )
            return
          }
          setItems((rows ?? []) as T[])
          setSyncStatus('synced')
          try {
            await secureWrite(`${table}:${user.id}`, rows ?? [])
          } catch (err) {
            reportError('useUserData.cacheWrite', err, { table })
          }
          setLoading(false)
        } catch (err) {
          if (cancelled) return
          reportError('useUserData.load.exception', err, { table })
          setSyncStatus('error')
          await loadLocalSnapshot<T>(
            table,
            user.id,
            localKey,
            seed,
            cancelled,
            setItems,
            setLoading,
          )
        }
      } else if (user === null) {
        await loadLocalSnapshot<T>(table, null, localKey, seed, cancelled, setItems, setLoading)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [user, table, localKey, seed, supabase])

  // ── Persist ───────────────────────────────────────────────────────────────
  const persist = useCallback(
    async (next: T[]) => {
      const now = new Date().toISOString()
      const prevMap = new Map(items.map((i) => [i.id, i]))

      // Stamp updated_at on rows whose contents changed
      const stamped: T[] = next.map((item) => {
        const before = prevMap.get(item.id)
        const changed = !before || JSON.stringify(before) !== JSON.stringify(item)
        return changed ? { ...item, updated_at: now } : item
      })

      // Deletions are only rows the caller had loaded and then removed
      // (prev − next). We must NOT infer deletions from the server/local
      // difference: `items` can legitimately be a partial view (a second tab,
      // a failed load that fell back to a snapshot, an auth race where items is
      // still empty), and deleting the server rows missing from that partial
      // view would destroy real records. See DAT-1.
      const deletedIds = diffDeletedIds(items, next)

      emitAuditDiff(table, prevMap, stamped, user, supabase)
      setItems(stamped)

      if (user && supabase) {
        setSyncStatus('syncing')

        const MAX_RETRIES = 3
        let ok = false
        let attempt = 0

        while (attempt < MAX_RETRIES && !ok) {
          ok = await syncSupabaseRows(supabase, table, user.id, stamped, deletedIds, now, setItems)
          if (!ok) {
            attempt++
            if (attempt < MAX_RETRIES) {
              await new Promise((r) => setTimeout(r, Math.pow(2, attempt) * 1000))
            }
          }
        }

        setSyncStatus(ok ? 'synced' : 'error')
        try {
          await secureWrite(`${table}:${user.id}`, stamped)
        } catch (err) {
          reportError('useUserData.localCache', err, { table })
        }
      } else {
        try {
          await secureWrite(`${table}:guest`, stamped)
        } catch (err) {
          reportError('useUserData.persist.guest', err, { table })
        }
      }
    },
    [user, table, supabase, items],
  )

  const lastSynced = useMemo(() => {
    const newest = items.reduce((acc, i) => {
      if (!i.updated_at) return acc
      return !acc || i.updated_at > acc ? i.updated_at : acc
    }, '')
    return newest ? new Date(newest).toLocaleString() : null
  }, [items])

  return { items, persist, loading, isAuthenticated: !!user, syncStatus, lastSynced }
}

// ── Helpers ────────────────────────────────────────────────────────────────

async function loadLocalSnapshot<T extends AuditableRow>(
  table: Table,
  userId: string | null,
  localKey: string,
  seed: T[],
  cancelled: boolean,
  setItems: (xs: T[]) => void,
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

function emitAuditDiff<T extends AuditableRow>(
  table: Table,
  prevMap: Map<string, T>,
  stamped: T[],
  user: User | null,
  supabase: SupabaseClient | null,
): void {
  const nextMap = new Map(stamped.map((i) => [i.id, i]))
  const actor = user?.email ?? 'guest'
  const entity = table.replace(/^user_/, '')

  for (const [id, after] of nextMap) {
    const before = prevMap.get(id)
    const op = before ? 'update' : 'create'
    if (op === 'update' && JSON.stringify(before) === JSON.stringify(after)) continue
    void appendAuditLog(
      { entity, entityId: id, op, before: before ?? null, after, actor },
      supabase,
      user?.id,
    )
  }
  for (const [id, before] of prevMap) {
    if (!nextMap.has(id)) {
      void appendAuditLog(
        { entity, entityId: id, op: 'delete', before, after: null, actor },
        supabase,
        user?.id,
      )
    }
  }
}

/**
 * Rows the caller explicitly removed: present in `prev` (the last loaded
 * state) and absent from `next` (the desired state). This is the only safe
 * source of deletions — deriving them from the server/local difference lets a
 * partial local view delete real server rows (DAT-1).
 */
export function diffDeletedIds<T extends AuditableRow>(prev: T[], next: T[]): string[] {
  const nextIds = new Set(next.map((i) => i.id))
  return prev.filter((i) => !nextIds.has(i.id)).map((i) => i.id)
}

export async function syncSupabaseRows<T extends AuditableRow>(
  supabase: SupabaseClient,
  table: Table,
  userId: string,
  stamped: T[],
  deletedIds: string[],
  now: string,
  setItems: (updater: (prev: T[]) => T[]) => void,
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

    // Delete only rows the caller intentionally removed AND that exist on the
    // server. A row on the server that was never in the caller's local view is
    // never touched here, so a stale/partial local state cannot wipe records.
    const toDelete = deletedIds.filter((id) => existingMap.has(id))
    if (toDelete.length > 0) {
      const { error: delErr } = await supabase
        .from(table)
        .delete()
        .eq('user_id', userId)
        .in('id', toDelete)
      if (delErr) throw delErr
    }

    const upsertable: T[] = []
    for (const item of stamped) {
      const serverTs = existingMap.get(item.id)
      const localTs = item.updated_at
      if (serverTs && localTs && serverTs > localTs) {
        // Server has newer data — fetch the full row and merge into local state.
        reportWarn(
          'useUserData.persist.conflict',
          'server row newer than local — fetching and merging',
          {
            table,
            id: item.id,
            serverTs,
            localTs,
          },
        )
        try {
          const { data: serverRow, error: fetchErr } = await supabase
            .from(table)
            .select('*')
            .eq('id', item.id)
            .single()
          if (!fetchErr && serverRow) {
            // Replace local with server version in the stamped array
            const idx = stamped.indexOf(item)
            if (idx !== -1) {
              stamped[idx] = { ...serverRow } as T
              setItems((prev) => {
                const copy = [...prev]
                const i = copy.findIndex((r) => r.id === item.id)
                if (i !== -1) copy[i] = { ...serverRow } as T
                return copy
              })
            }
          }
        } catch (err) {
          reportError('useUserData.persist.conflictFetch', err, { table, id: item.id })
        }
        continue
      }
      upsertable.push(item)
    }

    if (upsertable.length > 0) {
      const { error: upErr } = await supabase.from(table).upsert(
        upsertable.map((item) => ({
          ...item,
          user_id: userId,
          updated_at: item.updated_at ?? now,
        })),
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
