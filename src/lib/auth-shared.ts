import { cache } from 'react'
import { createClient } from './supabase-server'

/**
 * Fetch the current authenticated user from Supabase.
 *
 * Memoized with React `cache()` so repeated calls within a SINGLE request/render
 * hit the network only once. We deliberately do NOT cache across requests:
 * `getUser()` validates the session against Supabase's auth server, and any
 * cross-request cache of an authenticated `User` risks serving one user's
 * identity to another. (The previous implementation keyed a 60s `unstable_cache`
 * on a cookie name Supabase never sets — so the key was constant and the first
 * user's identity leaked to everyone. See docs/AUDIT.md SEC-1.)
 */
export const getCachedUser = cache(async () => {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()
    if (error || !user) return null
    return user
  } catch {
    return null
  }
})
