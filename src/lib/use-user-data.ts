/**
 * useUserData — Supabase-backed persistence with encrypted IndexedDB
 * guest fallback.
 *
 * Public API: { items, persist, loading, isAuthenticated, syncStatus }.
 * Local data is AES-GCM encrypted and survives browser refreshes via
 * IndexedDB rather than localStorage. Existing localStorage data is migrated
 * transparently on first read.
 *
 * LOADING CONTRACT (DAT-5): `loading` stays true until the Supabase session has
 * resolved, so it now covers "we do not yet know who you are" as well as "the
 * rows are still coming". `items` is `[]` for that whole window — consumers
 * must not treat an empty list as "no records" while `loading` is true. That is
 * deliberate: the alternative was showing, and then syncing, guest data on
 * behalf of a user who turned out to be signed in.
 */

'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { getSupabaseBrowserClient } from '@/lib/supabase-client-singleton'
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
  // THREE states, not two (DAT-5):
  //   undefined — the session has not resolved yet; we do not know who this is
  //   null      — resolved, and nobody is signed in (guest)
  //   User      — resolved, signed in
  //
  // This used to initialise to `null`, which is indistinguishable from "signed
  // out", so every mount loaded the GUEST snapshot before the session came
  // back. Usually that was just a flash of guest data — but a user who acted
  // inside that window ran `persist` with guest `items` and, moments later, an
  // authenticated `user`, upserting guest rows into their real account. Loading
  // now waits for the answer instead of assuming one.
  // With no Supabase configured there is no session to wait for, so this is a
  // definitive guest from the first render — seeded here rather than corrected
  // in an effect, which would both flash and strand the loader on `undefined`.
  const [user, setUser] = useState<User | null | undefined>(supabase ? undefined : null)
  const [loading, setLoading] = useState(true)
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(supabase ? 'idle' : 'offline')

  // The resolved user, readable from `persist` without making it a dependency.
  const userRef = useRef<User | null | undefined>(supabase ? undefined : null)
  useEffect(() => {
    userRef.current = user
  }, [user])

  // Resolves once the session lookup has settled either way. `persist` awaits
  // this rather than branching on an `undefined` user, so an action fired
  // during the resolve window is attributed to the right account instead of
  // being written as guest data. Already-resolved when there is no session to
  // look up.
  const sessionReadyRef = useRef<Promise<void> | null>(supabase ? null : Promise.resolve())

  // ── Track auth state ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!supabase) return

    let mounted = true
    let debounceTimer: NodeJS.Timeout

    // Check current session
    sessionReadyRef.current = supabase.auth
      .getSession()
      .then(({ data }) => {
        const resolved = data.session?.user ?? null
        userRef.current = resolved
        if (mounted) setUser(resolved)
      })
      .catch((err) => {
        reportError('useUserData.getSession', err, { table })
        // A failed lookup is still an answer: treat it as signed-out rather
        // than hanging the loader on `undefined` forever.
        userRef.current = null
        if (mounted) setUser(null)
      })

    // Subscribe to auth changes with a small debounce to avoid rapid re-renders
    // during multi-step auth flows
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_, session) => {
      clearTimeout(debounceTimer)
      const next = session?.user ?? null
      // Keep the ref in step immediately, not after the debounce: `persist` can
      // fire inside that 50ms and must see the current account, not the
      // previous one.
      userRef.current = next
      debounceTimer = setTimeout(() => {
        if (mounted) setUser(next)
      }, 50)
    })

    return () => {
      mounted = false
      clearTimeout(debounceTimer)
      subscription.unsubscribe()
    }
  }, [supabase, table])

  const reloadKey = useRestoreSignal()

  // `seed` is only the value to fall back to when nothing is stored yet — it is
  // not something a reload should be keyed on. Four call sites pass an inline
  // `[]`, which is a fresh array identity on every render; with `seed` in the
  // load effect's dependency list that made the effect re-run on every render,
  // and each load's `setItems(newArray)` triggered the next render — an
  // unbounded loop of Supabase selects (and IndexedDB reads in guest mode) for
  // as long as the page stayed open. Holding it in a ref keeps the latest value
  // available to the loader without making it a reload trigger.
  const seedRef = useRef(seed)
  useEffect(() => {
    seedRef.current = seed
  }, [seed])

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
              seedRef.current,
              cancelled,
              setItems,
              setLoading,
            )
            return
          }
          setItems((rows ?? []) as T[])
          setSyncStatus('synced')
          try {
            await secureWrite(`${table}:${user.id}`, rows ?? [], localKey)
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
            seedRef.current,
            cancelled,
            setItems,
            setLoading,
          )
        }
      } else if (user === null) {
        // Explicitly `=== null`, not `else`: while the session is still
        // resolving `user` is `undefined` and we load NOTHING, leaving
        // `loading` true. Falling through to the guest snapshot here is what
        // showed guest rows to a signed-in user for the first few hundred
        // milliseconds of every mount (DAT-5).
        await loadLocalSnapshot<T>(
          table,
          null,
          localKey,
          seedRef.current,
          cancelled,
          setItems,
          setLoading,
        )
      }
    }

    load()
    return () => {
      cancelled = true
    }
    // `reloadKey` ticks when a backup restore emits RESTORE_EVENT; it is a
    // dependency so the restored rows are actually re-read into the UI.
    // `seed` is deliberately NOT a dependency — see seedRef above.
  }, [user, table, localKey, supabase, reloadKey])

  // ── Persist ───────────────────────────────────────────────────────────────
  const persist = useCallback(
    async (next: T[]) => {
      // Who is this write for? Answer that BEFORE touching any store (DAT-5).
      // An action fired while the session is still resolving used to take the
      // guest branch — writing to `${table}:guest`, and then, once the session
      // landed, syncing those guest rows up into the real account. Waiting on
      // the lookup costs one tick on the very first write and nothing after.
      if (userRef.current === undefined && sessionReadyRef.current) {
        await sessionReadyRef.current
      }
      // Still undefined means no session lookup was ever started (no Supabase),
      // which is a definitive guest.
      const activeUser = userRef.current ?? null

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

      emitAuditDiff(table, prevMap, stamped, activeUser, supabase)
      setItems(stamped)

      if (activeUser && supabase) {
        setSyncStatus('syncing')

        const MAX_RETRIES = 3
        let ok = false
        let attempt = 0

        while (attempt < MAX_RETRIES && !ok) {
          ok = await syncSupabaseRows(
            supabase,
            table,
            activeUser.id,
            stamped,
            deletedIds,
            now,
            setItems,
          )
          if (!ok) {
            attempt++
            if (attempt < MAX_RETRIES) {
              await new Promise((r) => setTimeout(r, Math.pow(2, attempt) * 1000))
            }
          }
        }

        setSyncStatus(ok ? 'synced' : 'error')
        try {
          await secureWrite(`${table}:${activeUser.id}`, stamped, localKey)
        } catch (err) {
          reportError('useUserData.localCache', err, { table })
        }
      } else {
        try {
          await secureWrite(`${table}:guest`, stamped, localKey)
        } catch (err) {
          reportError('useUserData.persist.guest', err, { table })
        }
      }
    },
    // `user` is deliberately NOT a dependency: persist reads the identity from
    // `userRef` after awaiting `sessionReadyRef`, precisely so it uses the
    // account current at CALL time rather than whatever was captured when the
    // callback was last rebuilt (DAT-5).
    [table, localKey, supabase, items],
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
            // Publish the server's version through setItems only. `stamped` is
            // the very array already handed to setItems by the caller, so
            // assigning into it mutated live React state in place — the value
            // changed without a re-render, and any memo comparing by identity
            // saw no change at all. The functional update below is the whole
            // fix; the array itself is left alone.
            setItems((prev) => {
              const i = prev.findIndex((r) => r.id === item.id)
              if (i === -1) return prev
              const copy = [...prev]
              copy[i] = { ...serverRow } as T
              return copy
            })
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
