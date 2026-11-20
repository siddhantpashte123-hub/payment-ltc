'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState, useCallback, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { LogOut, RefreshCw, ArrowLeft } from 'lucide-react'
import { MobileNav } from '@/components/wallet/MobileNav'

interface WalletData {
  balance: number
  address: string
  explorerAddress?: string
  transactions: Array<{
    id: string
    type: 'deposit' | 'send'
    amount: number
    status: 'completed' | 'pending' | 'failed'
    address: string
    name?: string
    note?: string
    created_at: string
    tx_hash?: string
    explorer?: string
  }>
}

/**
 * Shared dashboard shell: handles auth, wallet loading and header chrome
 * for /dashboard, /dashboard/deposit and /dashboard/withdraw.
 */
export function useWallet() {
  const router = useRouter()
  const [data, setData] = useState<WalletData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const getClient = () => createClient()

  const getAccessToken = useCallback(async () => {
    const { data: session } = await getClient().auth.getSession()
    return session?.session?.access_token
  }, [])

  const load = useCallback(async () => {
    const {
      data: { user: authUser },
    } = await getClient().auth.getUser()
    if (!authUser) {
      router.push('/login')
      return
    }
    setLoading(true)
    setError('')
    try {
      const accessToken = await getAccessToken()
      const res = await fetch('/api/wallet', {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
        cache: 'no-store',
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        setError(
          errData.error || `Wallet API returned ${res.status}. Check server logs.`
        )
        return
      }
      const wallet = await res.json()
      setData(wallet)
    } catch {
      setError('Network error while loading wallet.')
    } finally {
      setLoading(false)
    }
  }, [router, getAccessToken])

  useEffect(() => {
    load()
  }, [load])

  return { data, loading, error, refresh: load, getAccessToken }
}

export function DashboardHeader({
  title,
  subtitle,
  showBack,
  onRefresh,
  loading,
}: {
  title: string
  subtitle?: string
  showBack?: boolean
  onRefresh?: () => void
  loading?: boolean
}) {
  const router = useRouter()
  const getClient = () => createClient()

  const handleLogOut = async () => {
    await getClient().auth.signOut()
    router.push('/login')
  }

  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-10">
      <div className="flex items-center gap-4">
        {showBack && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/dashboard')}
            className="h-11 px-3"
          >
            <ArrowLeft size={16} />
          </Button>
        )}
        <div>
          <h1 className="text-4xl font-bold text-white tracking-tight">{title}</h1>
          {subtitle && (
            <p className="text-white/50 text-sm mt-1">{subtitle}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3">
        {onRefresh && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={loading}
            className="h-11 px-4"
          >
            <RefreshCw
              size={16}
              className={`mr-2 ${loading ? 'animate-spin' : ''}`}
            />
            Refresh
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogOut}
          className="h-11 px-4"
        >
          <LogOut size={16} className="mr-2" />
          Sign out
        </Button>
      </div>
    </div>
  )
}

export function DashboardError({ error }: { error: string }) {
  return (
    <div className="glass-panel border-rose-500/30 bg-rose-500/5 rounded-2xl px-6 py-5">
      <p className="text-rose-500 font-medium text-sm break-words whitespace-pre-wrap">
        {error}
      </p>
    </div>
  )
}

export function DashboardLoading() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-white/10 border-t-white rounded-full animate-spin" />
        <p className="text-white/50 text-sm">Loading wallet…</p>
      </div>
    </div>
  )
}

export function DashboardPageShell({
  children,
}: {
  children: ReactNode
}) {
  return (
    <div className="min-h-screen bg-black px-6 py-10 md:py-14 pb-28 md:pb-14">
      <div className="max-w-7xl mx-auto">{children}</div>
      <MobileNav />
    </div>
  )
}
