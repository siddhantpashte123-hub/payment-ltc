import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Browser Supabase client.
 *
 * createBrowserClient() THROWS if the Supabase URL or anon key is missing or
 * malformed. Because client components call createClient() during render/SSR,
 * that throw propagates and 500s EVERY page ("This page couldn't load"). We
 * therefore validate the env first and, when it is unavailable or invalid,
 * return a safe no-op stub so pages still render (auth simply won't work until
 * the env is configured) instead of crashing the whole app.
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

/** Minimal no-op client returned when Supabase env is not configured. */
function createStubClient(): SupabaseClient {
  const noSession = { data: { session: null, user: null }, error: null }
  const stub = {
    auth: {
      getSession: async () => noSession,
      getUser: async () => ({ data: { user: null }, error: null }),
      refreshSession: async () => noSession,
      setSession: async () => noSession,
      signInWithPassword: async () => ({
        data: { session: null, user: null },
        error: new Error('Supabase is not configured on this deployment.'),
      }),
      signInWithOAuth: async () => ({
        data: null,
        error: new Error('Supabase is not configured on this deployment.'),
      }),
      signUp: async () => ({
        data: { session: null, user: null },
        error: new Error('Supabase is not configured on this deployment.'),
      }),
      signOut: async () => ({ error: null }),
      onAuthStateChange: () => ({ data: { unsubscribe: () => {} } }),
    },
  }
  return stub as unknown as SupabaseClient
}

export function createClient(): SupabaseClient {
  if (!hasValidConfig()) {
    return createStubClient()
  }
  try {
    return createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  } catch {
    // createBrowserClient can still throw on malformed keys; never crash a page.
    return createStubClient()
  }
}
