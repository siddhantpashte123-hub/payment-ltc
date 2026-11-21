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
import { ArrowDownLeft, ArrowUpRight, Coins, ArrowLeftRight } from 'lucide-react'

interface PriceData {
  priceInr: number
  priceUsd: number
}

export default function DashboardPage() {
  const { data, loading, error, refresh } = useWallet()
  const [price, setPrice] = useState<PriceData | null>(null)

  // Fetch LTC price for the fiat value of the balance + transaction INR.
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

  // Totals from transactions.
  const totals = (data?.transactions || []).reduce(
    (acc, tx) => {
      if (tx.type === 'deposit') acc.received += tx.amount
      else acc.sent += tx.amount
      return acc
    },
    { received: 0, sent: 0 }
  )
  const net = totals.received - totals.sent

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
          <div className="grid lg:grid-cols-3 gap-6 mb-6">
            <div className="lg:col-span-1">
              <BalanceCard balance={data.balance} fiatValue={fiatValueInr} />
            </div>
            <div className="lg:col-span-2">
              <PricePanel />
            </div>
          </div>

          {/* Totals strip */}
          <div className="grid grid-cols-3 md:grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-10">
            <TotalCard
              icon={<ArrowDownLeft size={18} />}
              label="Total Received"
              value={totals.received}
              tint="emerald"
              priceInr={price?.priceInr}
            />
            <TotalCard
              icon={<ArrowUpRight size={18} />}
              label="Total Sent"
              value={totals.sent}
              tint="white"
              priceInr={price?.priceInr}
            />
            <TotalCard
              icon={<ArrowLeftRight size={18} />}
              label="Net"
              value={net}
              tint={net >= 0 ? 'emerald' : 'rose'}
              priceInr={price?.priceInr}
            />
          </div>

          {/* Big action buttons: Deposit + Withdraw + Receive */}
          <section className="mb-10">
            <div className="grid sm:grid-cols-3 gap-6">
              <BigActionButton
                href="/dashboard/receive"
                icon={<ArrowDownLeft size={26} className="text-emerald-400" />}
                subtitle="Request a specific amount"
              >
                Receive
              </BigActionButton>
              <BigActionButton
                href="/dashboard/deposit"
                icon={<ArrowDownLeft size={26} className="text-white/80" />}
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
            <TransactionList
              transactions={data.transactions}
              priceInr={price?.priceInr}
            />
          </section>
        </>
      )}
    </DashboardPageShell>
  )
}

function TotalCard({
  icon,
  label,
  value,
  tint,
  priceInr,
}: {
  icon: React.ReactNode
  label: string
  value: number
  tint: 'emerald' | 'white' | 'rose'
  priceInr?: number
}) {
  const tintClass =
    tint === 'emerald'
      ? 'text-emerald-400'
      : tint === 'rose'
      ? 'text-rose-400'
      : 'text-white'

  return (
    <div className="glass-panel p-5">
      <div className="flex items-center gap-2 mb-2">
        <span className={tintClass}>{icon}</span>
        <span className="text-[11px] text-white/40 uppercase tracking-wider">
          {label}
        </span>
      </div>
      <div className={`text-lg sm:text-xl font-bold ${tintClass}`}>
        {value.toFixed(8)} <span className="text-xs text-white/40">LTC</span>
      </div>
      {priceInr !== undefined && (
        <div className="text-[11px] text-white/40 mt-1">
          ≈ ₹{(value * priceInr).toLocaleString(undefined, { maximumFractionDigits: 2 })}
        </div>
      )}
    </div>
  )
}
