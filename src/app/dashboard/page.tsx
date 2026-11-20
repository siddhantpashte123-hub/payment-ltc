'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import { BalanceCard } from '@/components/wallet/BalanceCard'
import { AddressDisplay } from '@/components/wallet/AddressDisplay'
import { SendForm } from '@/components/wallet/SendForm'
import { TransactionList } from '@/components/wallet/TransactionList'
import { Button } from '@/components/ui/button'
import { LogOut, Wallet, RefreshCw } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface WalletData {
  balance: number
  address: string
  transactions: Array<{
    id: string
    type: 'deposit' | 'send'
    amount: number
    status: 'completed' | 'pending' | 'failed'
    address: string
    created_at: string
    tx_hash?: string
  }>
}

export default function DashboardPage() {
  const router = useRouter()
  const [data, setData] = useState<WalletData | null>(null)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<{ email?: string } | null>(null)

  const getClient = () => createClient()

  const getAccessToken = async () => {
    const { data: session } = await getClient().auth.getSession()
    return session?.session?.access_token
  }

  useEffect(() => {
    let mounted = true
    const load = async () => {
      const {
        data: { user: authUser },
      } = await getClient().auth.getUser()
      if (!authUser) {
        router.push('/login')
        return
      }
      setUser({ email: authUser.email })

      const accessToken = await getAccessToken()
      try {
        const res = await fetch('/api/wallet', {
          headers: accessToken
            ? { Authorization: `Bearer ${accessToken}` }
            : {},
        })
        if (res.ok) {
          const wallet = await res.json()
          if (mounted) setData(wallet)
        }
      } catch {
        // silent
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => {
      mounted = false
    }
  }, [])

  const refresh = async () => {
    const accessToken = await getAccessToken()
    if (!accessToken) return
    const res = await fetch('/api/wallet', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (res.ok) {
      const wallet = await res.json()
      setData(wallet)
    }
  }

  const handleSend = async (data: { to: string; amount: number }) => {
    const accessToken = await getAccessToken()
    if (!accessToken) return

    const res = await fetch('/api/wallet/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(data),
    })

    if (res.ok) {
      await refresh()
    } else {
      const err = await res.json()
      alert(err.error || 'Send failed')
    }
  }

  const handleLogOut = async () => {
    await getClient().auth.signOut()
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-white/10 border-t-white rounded-full animate-spin" />
          <p className="text-white/50 text-sm">Loading wallet…</p>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6">
        <div className="glass-panel p-8 rounded-3xl text-center">
          <p className="text-white/50 mb-4">Unable to load wallet.</p>
          <Button onClick={() => router.push('/login')}>Sign in again</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black px-6 py-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">
              Dashboard
            </h1>
            <p className="text-white/50 text-sm mt-1">
              Welcome back{user?.email ? `, ${user.email.split('@')[0]}` : ''}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={refresh}
              className="h-10 px-3"
            >
              <RefreshCw size={16} className="mr-2" />
              Refresh
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogOut}
              className="h-10 px-3"
            >
              <LogOut size={16} className="mr-2" />
              Sign out
            </Button>
          </div>
        </div>

        <BalanceCard balance={data.balance} />

        <div className="mt-8 grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <AddressDisplay address={data.address} />
          </div>
          <div>
            <SendForm onSend={handleSend} balance={data.balance} />
          </div>
        </div>

        <div className="mt-8">
          <TransactionList transactions={data.transactions} />
        </div>
      </div>
    </div>
  )
}
