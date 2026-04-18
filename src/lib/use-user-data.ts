/**
 * useUserData — Supabase-backed persistence with localStorage guest fallback.
 *
 * When the user is authenticated, all reads/writes go to Supabase.
 * When the user is a guest, data lives in localStorage only.
 *
 * Required Supabase tables — run once in your Supabase SQL editor:
 *
 *   CREATE TABLE user_transactions (
 *     id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 *     user_id     uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
 *     date        text        NOT NULL,
 *     description text        NOT NULL,
 *     type        text        NOT NULL CHECK (type IN ('income','expense')),
 *     amount      numeric     NOT NULL,
 *     reference   text        NOT NULL DEFAULT '',
 *     created_at  timestamptz NOT NULL DEFAULT now()
 *   );
 *   ALTER TABLE user_transactions ENABLE ROW LEVEL SECURITY;
 *   CREATE POLICY "own_transactions" ON user_transactions
 *     FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
 *
 *   CREATE TABLE user_expenses (
 *     id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 *     user_id     uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
 *     date        text        NOT NULL,
 *     description text        NOT NULL,
 *     category    text        NOT NULL,
 *     amount      numeric     NOT NULL,
 *     created_at  timestamptz NOT NULL DEFAULT now()
 *   );
 *   ALTER TABLE user_expenses ENABLE ROW LEVEL SECURITY;
 *   CREATE POLICY "own_expenses" ON user_expenses
 *     FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
 */

'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient, isSupabaseConfigured } from '@/lib/supabase-browser'
import type { SupabaseClient, User } from '@supabase/supabase-js'

type Table = 'user_transactions' | 'user_expenses'

export function useUserData<T extends { id: string }>(
  table: Table,
  localKey: string,
  seed: T[],
) {
  const supabaseRef  = useRef<SupabaseClient | null>(isSupabaseConfigured ? createClient() : null)
  const supabase     = supabaseRef.current

  const [items,   setItems]   = useState<T[]>([])
  const [user,    setUser]    = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  // ── Track auth state ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!supabase) {
      setUser(null)   // no Supabase → always guest mode
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

    async function load() {
      if (user && supabase) {
        const { data: rows, error } = await supabase
          .from(table)
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })

        if (!cancelled) {
          if (error) {
            // Supabase table may not exist yet — fall back to localStorage
            loadLocal()
          } else {
            setItems((rows ?? []) as T[])
            setLoading(false)
          }
        }
      } else if (user === null) {
        // Definitively not logged in (null vs undefined)
        loadLocal()
      }
    }

    function loadLocal() {
      try {
        const saved = localStorage.getItem(localKey)
        setItems(saved ? JSON.parse(saved) : seed)
      } catch {
        setItems(seed)
      }
      if (!cancelled) setLoading(false)
    }

    load()
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, table, localKey])

  // ── Persist ───────────────────────────────────────────────────────────────
  const persist = useCallback(async (next: T[]) => {
    setItems(next)

    if (user && supabase) {
      try {
        // 1. Find IDs currently in Supabase for this user
        const { data: existing } = await supabase
          .from(table).select('id').eq('user_id', user.id)
        const existingIds = new Set<string>((existing ?? []).map((r: { id: string }) => r.id))
        const nextIds     = new Set<string>(next.map((i) => i.id))

        // 2. Delete rows that were removed
        const toDelete = [...existingIds].filter((id) => !nextIds.has(id))
        if (toDelete.length > 0) {
          await supabase.from(table).delete().in('id', toDelete)
        }

        // 3. Upsert current snapshot
        if (next.length > 0) {
          await supabase.from(table).upsert(
            next.map((item) => ({ ...item, user_id: user.id })),
            { onConflict: 'id' },
          )
        }
      } catch {
        // Silent fallback — don't break the UI if Supabase is unreachable
      }
    } else {
      localStorage.setItem(localKey, JSON.stringify(next))
    }
  }, [user, table, localKey, supabase])

  return { items, persist, loading, isAuthenticated: !!user }
}
