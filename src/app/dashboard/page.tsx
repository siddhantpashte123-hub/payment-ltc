'use client'

import { useEffect, useRef, useState } from 'react'
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
import { FiatToggle } from '@/components/wallet/FiatToggle'
import { formatFiat, useFiatCurrency } from '@/lib/fiat'
import { useNotifications } from '@/lib/notifications'
import {
  ArrowDownLeft,
  ArrowUpRight,
  Coins,
  ArrowLeftRight,
  Activity,
} from 'lucide-react'

type Coin = 'ltc' | 'sol'

interface PriceData {
  priceInr: number
  priceUsd: number
  change24h: number
  changeInr24h: number
  sol?: {
    priceInr: number
    priceUsd: number
    change24h: number
    changeInr24h: number
  } | null
}

export default function DashboardPage() {
  const { data, loading, error, refresh } = useWallet()
  const { push: pushNotification } = useNotifications()
  const [price, setPrice] = useState<PriceData | null>(null)
  const [coin, setCoin] = useState<Coin>('ltc')
  const { currency, ready } = useFiatCurrency()

  // Fetch LTC + SOL prices for fiat values.
  useEffect(() => {
    let mounted = true
    const load = async () => {
      try {
        const res = await fetch('/api/price', { cache: 'no-store' })
        if (!res.ok) return
        const p = await res.json()
        if (mounted) setPrice(p)
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

  const coinData = data?.[coin]
  const priceInr =
    coin === 'ltc' ? price?.priceInr : price?.sol?.priceInr
  const priceUsd =
    coin === 'ltc' ? price?.priceUsd : price?.sol?.priceUsd
  // Fiat value in the user's preferred currency.
  const pricePerCoin = currency === 'USD' ? priceUsd : priceInr
  const fiatValue =
    coinData && pricePerCoin ? coinData.balance * pricePerCoin : undefined

  // Totals from transactions for the selected coin.
  const coinTxs = (data?.transactions || []).filter((tx) => tx.coin === coin)
  const totals = coinTxs.reduce(
    (acc, tx) => {
      if (tx.type === 'deposit') acc.received += tx.amount
      else acc.sent += tx.amount
      return acc
    },
    { received: 0, sent: 0 }
  )
  const net = totals.received - totals.sent
  const unit = coin === 'ltc' ? 'LTC' : 'SOL'

  // Low-balance alert: notify once when balance dips below a threshold.
  const lastLowRef = useRef<{ coin: string; notified: number } | null>(null)
  useEffect(() => {
    if (!coinData || !data) return
    const bal = Number(coinData.balance ?? 0)
    const threshold = coin === 'ltc' ? 0.01 : 0.001
    const now = Date.now()
    const prev = lastLowRef.current
    // Only fire on a fresh crossing (previous balance not low, or different coin).
    if (bal > 0 && bal < threshold) {
      if (prev && prev.coin === coin && prev.notified > now - 60000) return
      lastLowRef.current = { coin, notified: now }
      pushNotification({
        type: 'system',
        title: `Low ${unit} balance`,
        message: `Your balance is ${bal.toFixed(8)} ${unit} — consider topping up.`,
      })
    } else {
      lastLowRef.current = null
    }
  }, [coinData, data, coin, unit, pushNotification])

  return (
    <DashboardPageShell>
      <DashboardHeader
        title="Dashboard"
        subtitle="Your balance, prices and transactions — all in one place"
        onRefresh={refresh}
        loading={loading}
      />

      {error && <DashboardError error={error} />}

      {!data ? (
        <div className="premium-card p-10 rounded-3xl text-center">
          <p className="text-white/50 mb-4">
            Wallet is not ready yet. Sign in again to create it.
          </p>
          <button onClick={() => (window.location.href = '/login')} className="glass-btn">
            Sign in again
          </button>
        </div>
      ) : (
        <>
          {/* Coin toggle + fiat toggle */}
          <div className="flex flex-col items-center gap-3 mb-8 reveal-up">
            <div className="inline-flex p-1 rounded-2xl bg-white/5 border border-white/10 gap-1">
              <CoinToggle
                active={coin === 'ltc'}
                onClick={() => setCoin('ltc')}
                label="Litecoin"
                sub="LTC"
              />
              <CoinToggle
                active={coin === 'sol'}
                onClick={() => setCoin('sol')}
                label="Solana"
                sub="SOL"
              />
            </div>
            <FiatToggle />
          </div>

          {/* Top: Balance + live price (both sides) */}
          <div className="grid lg:grid-cols-3 gap-6 mb-6">
            <div className="reveal-up lg:col-span-1">
              <BalanceCard
                balance={coinData?.balance ?? 0}
                currency={unit}
                fiatValue={fiatValue}
                fiatCurrency={currency}
              />
            </div>
            <div className="reveal-up lg:col-span-2" style={{ animationDelay: '0.08s' }}>
              <PricePanel coin={coin} />
            </div>
          </div>

          {/* Totals strip */}
          <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-10">
            <TotalCard
              reveal
              icon={<ArrowDownLeft size={18} />}
              label="Total Received"
              value={totals.received}
              tint="emerald"
              unit={unit}
              pricePerCoin={pricePerCoin}
              fiatCurrency={currency}
            />
            <TotalCard
              reveal
              icon={<ArrowUpRight size={18} />}
              label="Total Sent"
              value={totals.sent}
              tint="white"
              unit={unit}
              pricePerCoin={pricePerCoin}
              fiatCurrency={currency}
            />
            <TotalCard
              reveal
              icon={<ArrowLeftRight size={18} />}
              label="Net"
              value={net}
              tint={net >= 0 ? 'emerald' : 'rose'}
              unit={unit}
              pricePerCoin={pricePerCoin}
              fiatCurrency={currency}
            />
          </div>

          {/* Big action buttons: Deposit + Withdraw + Receive */}
          <section className="mb-10">
            <div className="grid sm:grid-cols-3 gap-6">
              <BigActionButton
                reveal
                href={`/dashboard/receive?coin=${coin}`}
                icon={<ArrowDownLeft size={26} className="text-emerald-400" />}
                subtitle="Request a specific amount"
              >
                Receive
              </BigActionButton>
              <BigActionButton
                reveal
                href={`/dashboard/deposit?coin=${coin}`}
                icon={<ArrowDownLeft size={26} className="text-white/80" />}
                subtitle={`Send ${unit} into your wallet`}
              >
                Deposit
              </BigActionButton>
              <BigActionButton
                reveal
                href={`/dashboard/withdraw?coin=${coin}`}
                icon={<ArrowUpRight size={26} className="text-white/80" />}
                subtitle={`Send ${unit} to any address`}
              >
                Withdraw
              </BigActionButton>
            </div>
          </section>

          {/* Deposit address */}
          <section className="mb-10">
            <SectionTitle
              reveal
              icon={<Coins size={18} />}
              title={`Your ${unit} Deposit Address`}
              desc={`Unique address for your ${unit} wallet — use it to deposit`}
            />
            <div className="reveal-up" style={{ animationDelay: '0.15s' }}>
              <AddressDisplay
                address={coinData?.address ?? ''}
                explorerAddress={coinData?.explorerAddress}
              />
            </div>
          </section>

          {/* Section: Activity */}
          <section>
            <SectionTitle
              reveal
              icon={<Activity size={18} />}
              title="Activity"
              desc="Your deposit and withdrawal history with counterparty"
            />
            <div className="reveal-up" style={{ animationDelay: '0.2s' }}>
              <TransactionList
                transactions={coinTxs}
                pricePerCoin={pricePerCoin}
                fiatCurrency={currency}
                unit={unit}
              />
            </div>
          </section>

          {/* Footer links */}
          <div className="flex items-center justify-center gap-6 mt-10">
            <a
              href="/dashboard/contacts"
              className="text-xs text-white/40 hover:text-white/70 transition-colors"
            >
              Contacts
            </a>
            <span className="text-white/15">·</span>
            <a
              href="/dashboard/settings"
              className="text-xs text-white/40 hover:text-white/70 transition-colors"
            >
              Security settings
            </a>
          </div>
        </>
      )}
    </DashboardPageShell>
  )
}

function CoinToggle({
  active,
  onClick,
  label,
  sub,
}: {
  active: boolean
  onClick: () => void
  label: string
  sub: string
}) {
  return (
    <button
      onClick={onClick}
      className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
        active
          ? 'bg-gradient-to-br from-white to-white/80 text-black shadow-lg'
          : 'text-white/50 hover:text-white/80'
      }`}
    >
      {label}
      <span className="ml-2 text-xs font-bold opacity-60">{sub}</span>
    </button>
  )
}

function SectionTitle({
  icon,
  title,
  desc,
  reveal,
}: {
  icon: React.ReactNode
  title: string
  desc: string
  reveal?: boolean
}) {
  return (
    <div className={`mb-5 flex items-center gap-3 ${reveal ? 'reveal-up' : ''}`}>
      <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-gradient-to-br from-white/10 to-white/[0.02] border border-white/10 flex items-center justify-center text-white/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">
        {icon}
      </div>
      <div>
        <h2 className="text-xl font-semibold tracking-tight leading-tight gradient-text">
          {title}
        </h2>
        <p className="text-xs text-white/40 leading-tight">{desc}</p>
      </div>
    </div>
  )
}

function TotalCard({
  icon,
  label,
  value,
  tint,
  unit,
  pricePerCoin,
  fiatCurrency,
  reveal,
}: {
  icon: React.ReactNode
  label: string
  value: number
  tint: 'emerald' | 'white' | 'rose'
  unit: string
  pricePerCoin?: number
  fiatCurrency?: 'INR' | 'USD'
  reveal?: boolean
}) {
  const tintClass =
    tint === 'emerald'
      ? 'text-emerald-400'
      : tint === 'rose'
      ? 'text-rose-400'
      : 'text-white'

  return (
    <div className={`premium-card p-3 sm:p-5 ${reveal ? 'reveal-up' : ''} flex flex-col justify-center min-h-[78px] sm:min-h-0`}>
      <div className="flex items-center gap-1.5 sm:gap-2 mb-1">
        <span className={tintClass}>{icon}</span>
        <span className="text-[10px] sm:text-[11px] text-white/40 uppercase tracking-wider truncate">
          {label}
        </span>
      </div>
      <div className={`text-sm sm:text-lg font-bold leading-tight ${tintClass}`}>
        {value.toFixed(8)} <span className="text-[10px] sm:text-xs text-white/40">{unit}</span>
      </div>
      {pricePerCoin !== undefined && (
        <div className="text-[10px] sm:text-[11px] text-white/40 mt-0.5 truncate">
          ≈ {formatFiat(value * pricePerCoin, fiatCurrency ?? 'INR')}
        </div>
      )}
    </div>
  )
}
