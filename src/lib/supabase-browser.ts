import { createBrowserClient } from '@supabase/ssr'
import { reportWarn } from '@/lib/monitor'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

/**
 * True when Supabase credentials are present in the environment.
 * When false, the app runs in localStorage-only guest mode.
 */
export const isSupabaseConfigured = url.length > 0 && key.length > 0

if (!isSupabaseConfigured && typeof window !== 'undefined') {
  reportWarn(
    'supabase.notConfigured',
    '[EasyAcco] Supabase credentials are not set. ' +
      'Copy .env.example to .env.local and fill in NEXT_PUBLIC_SUPABASE_URL ' +
      'and NEXT_PUBLIC_SUPABASE_ANON_KEY to enable cloud sync. ' +
      'Running in localStorage-only mode.',
  )
}

export function createClient() {
  if (!isSupabaseConfigured) {
    throw new Error(
      '[EasyAcco] createClient() called without Supabase credentials. ' +
        'Check isSupabaseConfigured before calling this function.',
    )
  }
  return createBrowserClient(url, key)
}
