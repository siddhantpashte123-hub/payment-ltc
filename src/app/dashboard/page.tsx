'use client'

import { useEffect, useState } from 'react'
import {
  useWallet,
  DashboardHeader,
  DashboardError,
  DashboardLoading,
  DashboardPageShell,
} from '@/components/wallet/DashboardShell'
import { BalanceCard } from '@/components/wallet/BalanceCard'
import { AddressDisplay } from '@/components/wallet/AddressDisplay'
import { TransactionList } from '@/components/wallet/TransactionList'
import { PricePanel } from '@/components/wallet/PricePanel'
import { BigActionButton } from '@/components/wallet/BigActionButton'
import { ArrowDownLeft, ArrowUpRight, Coins } from 'lucide-react'

interface PriceData {
  priceInr: number
  priceUsd: number
}

export default function DashboardPage() {
  const { data, loading, error, refresh } = useWallet()
  const [price, setPrice] = useState<PriceData | null>(null)

  // Fetch LTC price for the fiat value of the balance.
  useEffect(() => {
    let mounted = true
    const load = async () => {
      try {
        const res = await fetch('/api/price', { cache: 'no-store' })
        if (!res.ok) return
        const p = await res.json()
        if (mounted) setPrice({ priceInr: p.priceInr, priceUsd: p.priceUsd })
      } catch {
        // price is optional; keep last value
      }
    }
    load()
    const id = setInterval(load, 60000)
    return () => {
      mounted = false
      clearInterval(id)
    }
  }, [])

  if (loading) return <DashboardLoading />

  const fiatValueInr =
    data && price ? data.balance * price.priceInr : undefined

  return (
    <DashboardPageShell>
      <DashboardHeader
        title="Dashboard"
        subtitle="Your Litecoin balance, prices and transactions — all in one place"
        onRefresh={refresh}
        loading={loading}
      />

      {error && <DashboardError error={error} />}

      {!data ? (
        <div className="glass-panel p-10 rounded-3xl text-center">
          <p className="text-white/50 mb-4">
            Wallet is not ready yet. Sign in again to create it.
          </p>
          <button onClick={() => (window.location.href = '/login')} className="glass-btn">
            Sign in again
          </button>
        </div>
      ) : (
        <>
          {/* Top: Balance + live price (both sides) */}
          <div className="grid lg:grid-cols-3 gap-6 mb-10">
            <div className="lg:col-span-1">
              <BalanceCard balance={data.balance} fiatValue={fiatValueInr} />
            </div>
            <div className="lg:col-span-2">
              <PricePanel />
            </div>
          </div>

          {/* Big action buttons: Deposit + Withdraw */}
          <section className="mb-10">
            <div className="grid sm:grid-cols-2 gap-6">
              <BigActionButton
                href="/dashboard/deposit"
                icon={<ArrowDownLeft size={26} className="text-emerald-400" />}
                subtitle="Send LTC into your wallet"
              >
                Deposit
              </BigActionButton>
              <BigActionButton
                href="/dashboard/withdraw"
                icon={<ArrowUpRight size={26} className="text-white/80" />}
                subtitle="Send LTC to any address"
              >
                Withdraw
              </BigActionButton>
            </div>
          </section>

          {/* Deposit address */}
          <section className="mb-10">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/70">
                <Coins size={18} />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white tracking-tight leading-tight">
                  Your Deposit Address
                </h2>
                <p className="text-xs text-white/40 leading-tight">
                  Unique address for your wallet — use it to deposit LTC
                </p>
              </div>
            </div>
            <AddressDisplay
              address={data.address}
              explorerAddress={data.explorerAddress}
            />
          </section>

          {/* Section: Activity */}
          <section>
            <div className="mb-5 flex items-center gap-3">
              <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/70">
                <Coins size={18} />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white tracking-tight leading-tight">
                  Activity
                </h2>
                <p className="text-xs text-white/40 leading-tight">
                  Your deposit and withdrawal history with counterparty
                </p>
              </div>
            </div>
            <TransactionList transactions={data.transactions} />
          </section>
        </>
      )}
    </DashboardPageShell>
  )
}
