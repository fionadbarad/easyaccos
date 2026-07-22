import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { createClient } from './supabase-server'
import { cookies } from 'next/headers'

/**
 * Fetch the current user from Supabase with multiple layers of caching:
 * 1. React 'cache()' - memoizes the promise within a single request (avoids duplicate network calls if called multiple times in one render)
 * 2. Next.js 'unstable_cache' - memoizes the result across requests for 60 seconds (avoids hitting Supabase Auth server on every page load)
 */
export const getCachedUser = cache(async () => {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('sb-access-token')?.value || 'anonymous'
  
  // We use the session cookie value as part of the cache key to ensure users don't get each other's cached data
  return unstable_cache(
    async () => {
      try {
        const supabase = await createClient()
        const { data: { user }, error } = await supabase.auth.getUser()
        if (error || !user) return null
        return user
      } catch (e) {
        return null
      }
    },
    ['supabase-user', sessionCookie],
    {
      revalidate: 60, // Cache for 60 seconds
      tags: ['auth']
    }
  )()
})
