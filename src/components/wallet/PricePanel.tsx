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
}

export function PricePanel() {
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

  if (loading) {
    return (
      <div className="glass-panel p-5 h-44 flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-white/10 border-t-white rounded-full animate-spin" />
      </div>
    )
  }

  if (error || !price) {
    return (
      <div className="glass-panel p-5 h-44 flex items-center justify-center text-sm text-white/40">
        {error}
      </div>
    )
  }

  const change = price.change24h
  const isUp = change >= 0
  const min = price.history.length ? Math.min(...price.history.map((h) => h.p)) : 0
  const max = price.history.length ? Math.max(...price.history.map((h) => h.p)) : 1
  const range = max - min || 1

  // SVG sparkline.
  const w = 520
  const h = 140
  const pts = price.history.length
    ? price.history
        .map((pt, i) => {
          const x = (i / (price.history.length - 1 || 1)) * w
          const y = h - ((pt.p - min) / range) * (h - 16) - 8
          return `${x},${y}`
        })
        .join(' ')
    : ''

  return (
    <div className="glass-panel p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Activity size={18} className="text-emerald-400" />
          <h3 className="text-sm font-semibold text-white uppercase tracking-wider">
            LTC Market
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

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-white/5 border border-white/10 rounded-xl p-3">
          <div className="text-[10px] text-white/40 uppercase tracking-wider">
            1 LTC in INR
          </div>
          <div className="text-lg font-bold text-white mt-0.5">
            ₹{price.priceInr.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-3">
          <div className="text-[10px] text-white/40 uppercase tracking-wider">
            1 LTC in USD
          </div>
          <div className="text-lg font-bold text-white mt-0.5">
            ${price.priceUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      {/* Price graph */}
      <div className="bg-black/40 border border-white/10 rounded-xl p-3">
        <div className="text-[10px] text-white/40 uppercase tracking-wider mb-2">
          7-Day Price (INR)
        </div>
        {pts ? (
          <svg
            viewBox={`0 0 ${w} ${h}`}
            className="w-full h-32"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="spark" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#34d399" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#34d399" stopOpacity="0" />
              </linearGradient>
            </defs>
            <polyline
              points={pts}
              fill="none"
              stroke="#34d399"
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            <polygon
              points={`0,${h} ${pts} ${w},${h}`}
              fill="url(#spark)"
            />
          </svg>
        ) : (
          <div className="h-32 flex items-center justify-center text-xs text-white/40">
            No chart data
          </div>
        )}
      </div>
    </div>
  )
}
