import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Server-side Supabase client.
 *
 * createServerClient() THROWS if the Supabase URL or anon key is missing or
 * malformed. It is called from /auth/callback and other server paths. An
 * uncaught throw there 500s the page ("This page couldn't load") AFTER the
 * user completes Google login — which is exactly the failure clients hit. We
 * therefore validate the env first and, when unavailable or invalid, return a
 * safe no-op stub so the callback fails gracefully (redirect to /login with an
 * error) instead of crashing the page.
 */

function hasValidConfig(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  // Supabase URLs look like https://<ref>.supabase.co
  return Boolean(
    url &&
      /^https:\/\/[a-z0-9]+\.supabase\.co/i.test(url) &&
      key &&
      key.length > 10
  )
}

/** Minimal no-op server client returned when Supabase env is not configured. */
function createStubClient(): SupabaseClient {
  const noSession = { data: { session: null, user: null }, error: null }
  const stub = {
    auth: {
      // Signal an error so /auth/callback redirects to /login?error=...
      // instead of faking a session and bouncing the user to /dashboard.
      exchangeCodeForSession: async () => ({
        data: { session: null, user: null },
        error: new Error('Supabase is not configured on this deployment.'),
      }),
      getSession: async () => noSession,
      getUser: async () => ({ data: { user: null }, error: null }),
    },
  }
  return stub as unknown as SupabaseClient
}

export async function createClient() {
  if (!hasValidConfig()) {
    return createStubClient()
  }
  const cookieStore = await cookies()

  try {
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
                cookieStore.set(name, value, options)
              )
            } catch {
              // The `setAll` method was called from a Server Component
            }
          },
        },
      }
    )
  } catch {
    // createServerClient can still throw on malformed keys; never crash a page.
    return createStubClient()
  }
}
