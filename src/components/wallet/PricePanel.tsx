'use client'

import { useEffect, useState } from 'react'
import { TrendingUp, TrendingDown, Activity } from 'lucide-react'

interface PriceData {
  priceInr: number
  priceUsd: number
  change24h: number
  changeInr24h: number
  lastUpdated: number | string
  history: Array<{ t: number; p: number }>
  sol?: {
    priceInr: number
    priceUsd: number
    change24h: number
    changeInr24h: number
  } | null
}

export function PricePanel({ coin = 'ltc' }: { coin?: 'ltc' | 'sol' }) {
  const [price, setPrice] = useState<PriceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true
    const load = async () => {
      try {
        const res = await fetch('/api/price', { cache: 'no-store' })
        if (!res.ok) throw new Error('failed')
        const data = await res.json()
        if (mounted) {
          setPrice(data)
          setLoading(false)
        }
      } catch {
        if (mounted) {
          setError('Price unavailable')
          setLoading(false)
        }
      }
    }
    load()
    // Refresh every 60s.
    const id = setInterval(load, 60000)
    return () => {
      mounted = false
      clearInterval(id)
    }
  }, [])

  // Select the relevant coin's price data.
  const active =
    coin === 'sol' && price?.sol
      ? { ...price.sol, history: price.history }
      : price

  if (loading) {
    return (
      <div className="premium-card p-5 h-44 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/10 border-t-white rounded-full animate-spin" />
      </div>
    )
  }

  // Guard against a non-OK or partially-populated price response. If the price
  // values are missing or not valid numbers (e.g. rate-limited / partial API
  // payload), render a graceful fallback instead of throwing on .toLocaleString().
  const hasPrice =
    !!active &&
    typeof active.priceInr === 'number' &&
    typeof active.priceUsd === 'number'

  if (error || !hasPrice) {
    return (
      <div className="premium-card p-5 h-44 flex items-center justify-center text-sm text-white/40">
        {error || 'Price unavailable'}
      </div>
    )
  }

  const change =
    typeof active.change24h === 'number' ? active.change24h : 0
  const isUp = change >= 0
  const unit = coin === 'sol' ? 'SOL' : 'LTC'

  return (
    <div className="premium-card p-5 relative overflow-hidden">
      <div className="glow-orb w-40 h-40 bg-emerald-500/15 -top-12 right-8" />
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Activity size={18} className="text-emerald-400" />
            <h3 className="text-sm font-semibold gradient-text uppercase tracking-wider">
              {unit} Market
            </h3>
          </div>
          <span
            className={`inline-flex items-center gap-1 text-xs font-semibold rounded-full px-2.5 py-1 ${
              isUp
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
            }`}
          >
            {isUp ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
            {isUp ? '+' : ''}
            {change.toFixed(2)}% (24h)
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl p-3 bg-white/[0.03] border border-white/10">
            <div className="text-[10px] text-white/40 uppercase tracking-wider">
              1 {unit} in INR
            </div>
            <div className="text-lg font-bold text-white mt-0.5">
              ₹{active.priceInr.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </div>
          </div>
          <div className="rounded-xl p-3 bg-white/[0.03] border border-white/10">
            <div className="text-[10px] text-white/40 uppercase tracking-wider">
              1 {unit} in USD
            </div>
            <div className="text-lg font-bold text-white mt-0.5">
              ${active.priceUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
