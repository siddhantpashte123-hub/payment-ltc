'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import { BalanceCard } from '@/components/wallet/BalanceCard'
import { AddressDisplay } from '@/components/wallet/AddressDisplay'
import { SendForm } from '@/components/wallet/SendForm'
import { TransactionList } from '@/components/wallet/TransactionList'
import { Button } from '@/components/ui/button'
import { LogOut, RefreshCw, Wallet } from 'lucide-react'
import { useRouter } from 'next/navigation'

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
    created_at: string
    tx_hash?: string
    explorer?: string
  }>
}

export default function DashboardPage() {
  const router = useRouter()
  const [data, setData] = useState<WalletData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
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
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}))
          if (mounted) {
            setError(
              errData.error ||
                `Wallet API returned ${res.status}. Check server logs.`
            )
          }
          return
        }
        const wallet = await res.json()
        if (mounted) {
          setData(wallet)
          setLoading(false)
        }
      } catch {
        if (mounted) setError('Network error while loading wallet.')
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
    setError('')
    setLoading(true)
    const accessToken = await getAccessToken()
    if (!accessToken) return
    const res = await fetch('/api/wallet', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (res.ok) {
      const wallet = await res.json()
      setData(wallet)
    } else {
      const errData = await res.json().catch(() => ({}))
      setError(errData.error || 'Could not refresh wallet.')
    }
    setLoading(false)
  }

  const handleSend = async (sendData: { to: string; amount: number }) => {
    const accessToken = await getAccessToken()
    if (!accessToken) return

    const res = await fetch('/api/wallet/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(sendData),
    })

    if (res.ok) {
      setError('')
      await refresh()
    } else {
      const errData = await res.json().catch(() => ({}))
      alert(errData.error || 'Send failed')
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

  return (
    <div className="min-h-screen bg-black px-6 py-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
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

        {error && (
          <div className="mb-6 glass-panel border-rose-500/30 bg-rose-500/5 rounded-2xl px-6 py-5">
            <p className="text-rose-500 font-medium text-sm break-words whitespace-pre-wrap">
              {error}
            </p>
          </div>
        )}

        {!data ? (
          <div className="glass-panel p-8 rounded-3xl text-center">
            <p className="text-white/50 mb-4">
              Wallet is not ready yet. Sign in again to create it.
            </p>
            <Button onClick={() => router.push('/login')}>Sign in again</Button>
          </div>
        ) : (
          <>
            {/* Section 1: Balance */}
            <section className="mb-6">
              <SectionTitle
                icon={<Wallet size={16} />}
                title="Balance"
                subtitle="Your confirmed on-chain Litecoin balance"
              />
              <BalanceCard balance={data.balance} />
            </section>

            {/* Section 2: Deposit + Send */}
            <section className="mb-6">
              <SectionTitle
                icon={<Wallet size={16} />}
                title="Deposit & Send"
                subtitle="Fund your wallet or send LTC to any address"
              />
              <div className="grid lg:grid-cols-2 gap-6">
                <div>
                  <AddressDisplay
                    address={data.address}
                    explorerAddress={data.explorerAddress}
                  />
                </div>
                <div>
                  <SendForm onSend={handleSend} balance={data.balance} />
                </div>
              </div>
            </section>

            {/* Section 3: Transaction history */}
            <section>
              <SectionTitle
                icon={<RefreshCw size={16} />}
                title="Activity"
                subtitle="Your deposit and send history"
              />
              <TransactionList transactions={data.transactions} />
            </section>
          </>
        )}
      </div>
    </div>
  )
}

function SectionTitle({
  icon,
  title,
  subtitle,
}: {
  icon: React.ReactNode
  title: string
  subtitle: string
}) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/70">
        {icon}
      </div>
      <div>
        <h2 className="text-lg font-semibold text-white tracking-tight leading-tight">
          {title}
        </h2>
        <p className="text-xs text-white/40 leading-tight">{subtitle}</p>
      </div>
    </div>
  )
}
