import { createClient } from '@supabase/supabase-js'

export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
export const anonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
export const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY!

/** Admin client (bypasses RLS). Server-side only. */
export function adminClient() {
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export type AuthUser = {
  id: string
  email?: string
  user_metadata?: Record<string, unknown>
}

/**
 * Verify a Supabase access token. The /auth/v1/user endpoint requires BOTH
 * the Authorization bearer token and the project apikey header.
 */
export async function getUserFromToken(
  accessToken: string
): Promise<AuthUser | null> {
  try {
    const res = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        apikey: anonKey,
      },
      cache: 'no-store',
    })
    if (!res.ok) return null
    const user = (await res.json()) as AuthUser
    return user?.id ? user : null
  } catch {
    return null
  }
}

export function bearerToken(request: Request): string | null {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) return null
  return authHeader.slice(7).trim() || null
}

/**
 * Deterministic LTC deposit address generator (mainnet-looking, starts with L/M).
 * NOTE: placeholder only. For real funds, derive addresses from an HD wallet
 * (BIP44) or an address-generation service and keep the private keys server-side.
 */
export function generateDepositAddress(userId: string): string {
  const chars = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ123456789'
  let hash = 0
  for (let i = 0; i < userId.length; i++) {
    hash = (hash << 5) - hash + userId.charCodeAt(i)
    hash |= 0
  }
  let addr = hash < 0 ? 'L' : 'M'
  for (let i = 0; i < 32; i++) {
    hash = (hash << 5) - hash + userId.charCodeAt(i % userId.length) + i
    hash |= 0
    addr += chars[Math.abs(hash) % chars.length]
  }
  return addr
}
