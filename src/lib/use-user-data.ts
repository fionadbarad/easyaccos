/**
 * useUserData — Supabase-backed persistence with encrypted IndexedDB
 * guest fallback.
 *
 * Public API is unchanged: { items, persist, loading, isAuthenticated }.
 * Local data is now AES-GCM encrypted and survives browser refreshes via
 * IndexedDB rather than localStorage. Existing localStorage data is migrated
 * transparently on first read.
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient, isSupabaseConfigured } from '@/lib/supabase-browser'
import { secureRead, secureWrite } from '@/lib/storage/secure-store'
import { appendAuditLog } from '@/lib/audit'
import type { SupabaseClient, User } from '@supabase/supabase-js'

type Table = 'user_transactions' | 'user_expenses' | 'user_invoices' | 'user_mileage'

export function useUserData<T extends { id: string }>(
  table: Table,
  localKey: string,
  seed: T[],
) {
  const [supabase] = useState<SupabaseClient | null>(() => isSupabaseConfigured ? createClient() : null)

  const [items,   setItems]   = useState<T[]>([])
  const [user,    setUser]    = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  // ── Track auth state ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!supabase) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setUser(null)
      return
    }
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [supabase])

  // ── Load data when user is known ─────────────────────────────────────────
  useEffect(() => {
    let cancelled = false

    async function loadLocal() {
      const recordKey = `${table}:guest`
      const data = await secureRead<T[]>(recordKey, localKey, seed)
      if (!cancelled) {
        setItems(data)
        setLoading(false)
      }
    }

    async function load() {
      if (user && supabase) {
        const { data: rows, error } = await supabase
          .from(table)
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })

        if (cancelled) return
        if (error) {
          await loadLocal()
        } else {
          setItems((rows ?? []) as T[])
          // Also cache an encrypted local copy so the authed user gets
          // instant rehydration on next load before Supabase replies.
          await secureWrite(`${table}:${user.id}`, rows ?? [])
          setLoading(false)
        }
      } else if (user === null) {
        await loadLocal()
      }
    }

    load()
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, table, localKey])

  // ── Persist ───────────────────────────────────────────────────────────────
  const persist = useCallback(async (next: T[]) => {
    // ── Audit diff (best-effort, never blocks persist) ──────────────────────
    const prev     = items   // closure over latest state
    const prevMap  = new Map(prev.map(i => [i.id, i]))
    const nextMap  = new Map(next.map(i => [i.id, i]))
    const actor    = user?.email ?? 'guest'
    const entity   = table.replace(/^user_/, '')  // "expenses", "invoices", …

    for (const [id, after] of nextMap) {
      const before = prevMap.get(id)
      const op = before ? 'update' : 'create'
      if (op === 'update') {
        if (JSON.stringify(before) === JSON.stringify(after)) continue
      }
      void appendAuditLog({ entity, entityId: id, op, before: before ?? null, after, actor }, supabase, user?.id)
    }
    for (const [id, before] of prevMap) {
      if (!nextMap.has(id)) {
        void appendAuditLog({ entity, entityId: id, op: 'delete', before, after: null, actor }, supabase, user?.id)
      }
    }

    setItems(next)

    if (user && supabase) {
      try {
        const { data: existing } = await supabase
          .from(table).select('id').eq('user_id', user.id)
        const existingIds = new Set<string>((existing ?? []).map((r: { id: string }) => r.id))
        const nextIds     = new Set<string>(next.map((i) => i.id))

        const toDelete = [...existingIds].filter((id) => !nextIds.has(id))
        if (toDelete.length > 0) {
          await supabase.from(table).delete().in('id', toDelete)
        }

        if (next.length > 0) {
          await supabase.from(table).upsert(
            next.map((item) => ({ ...item, user_id: user.id })),
            { onConflict: 'id' },
          )
        }

        await secureWrite(`${table}:${user.id}`, next)
      } catch {
        await secureWrite(`${table}:${user.id}`, next)
      }
    } else {
      await secureWrite(`${table}:guest`, next)
    }
  }, [user, table, supabase, items])

  return { items, persist, loading, isAuthenticated: !!user }
}
