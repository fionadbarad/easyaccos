import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request })

  // Cheap bail-out BEFORE building a client or touching the network.
  //
  // getUser() is a blocking round-trip to Supabase's auth server on every
  // matched request. A visitor with no Supabase auth cookie has no session to
  // refresh, so that round-trip can only ever return "no user" — yet it was
  // still being paid for. Crawlers, scanners and any burst of traffic hitting
  // /dashboard/* therefore each cost one upstream auth call, which is how a
  // spike turns into pool exhaustion and 5xx for the signed-in users who
  // actually needed it.
  //
  // @supabase/ssr names its cookies `sb-<project-ref>-auth-token`, chunking
  // large ones with `.0`, `.1` suffixes — so match the prefix, not an exact
  // name. No such cookie means: skip straight through.
  const hasAuthCookie = request.cookies
    .getAll()
    .some((c) => c.name.startsWith('sb-') && c.name.includes('auth-token'))
  if (!hasAuthCookie) return response

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  // Refresh the session — keeps auth tokens alive across pages
  // Without this, tokens expire mid-session silently
  await supabase.auth.getUser()

  return response
}

export const config = {
  // Only /dashboard/* actually reads the server-side session (see
  // src/app/dashboard/layout.tsx, page.tsx, settings/page.tsx). Every other
  // route — marketing pages, /tax, /api/ai/*, etc. — was previously paying
  // for a blocking network round-trip to Supabase's auth server on *every*
  // request for no reason, since nothing on those pages reads the cookie
  // this refreshes. That was the single biggest contributor to slow loads.
  matcher: ['/dashboard/:path*'],
}
