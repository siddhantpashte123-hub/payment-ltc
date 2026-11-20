'use client'

import type { ReactNode } from 'react'

// Note: @supabase/ssr no longer exports SessionProvider. The browser client
// created in @/lib/supabase/client manages auth state via cookies/localStorage,
// so Providers simply passes children through.
export function Providers({ children }: { children: ReactNode }) {
  return <>{children}</>
}
