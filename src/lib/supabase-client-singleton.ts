import { createClient as createBrowserClient, isSupabaseConfigured } from './supabase-browser'
import type { SupabaseClient } from '@supabase/supabase-js'

let client: SupabaseClient | null = null

/**
 * Returns a singleton Supabase browser client.
 * This prevents multiple client initializations in different components/hooks,
 * which helps stay within connection pool limits.
 */
export function getSupabaseBrowserClient() {
  if (!isSupabaseConfigured) return null
  if (!client) {
    client = createBrowserClient()
  }
  return client
}
