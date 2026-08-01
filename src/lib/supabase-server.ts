import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { reportError } from '@/lib/monitor'

/**
 * Creates a Supabase server client with optimized connection settings.
 * We use a shorter global fetch timeout to prevent hanging connections
 * from exhausting the pool during high traffic.
 */
export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            )
          } catch (err) {
            // reportError is not available in server components if it uses window
            // but we should at least not swallow it silently in dev
            reportError('supabase.cookieSet', err)
          }
        },
      },
      global: {
        // Reduce fetch timeout to 10s to fail fast and free up connections
        fetch: (url, options) => {
          return fetch(url, {
            ...options,
            signal: AbortSignal.timeout(10000),
          })
        },
      },
    },
  )
}
