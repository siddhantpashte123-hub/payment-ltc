'use client'

import { ArrowUpRight, ArrowDownLeft, Sparkles } from 'lucide-react'
import { formatFiat, type FiatCurrency } from '@/lib/fiat'

interface BalanceCardProps {
  balance: number
  currency?: string
  fiatValue?: number
  fiatCurrency?: FiatCurrency
}

export function BalanceCard({
  balance,
  currency = 'LTC',
  fiatValue,
  fiatCurrency = 'INR',
}: BalanceCardProps) {
  return (
    <div className="premium-card p-6 md:p-8 relative overflow-hidden">
      {/* Ambient glow orbs */}
      <div className="glow-orb w-40 h-40 bg-emerald-500/20 -top-12 -right-12" />
      <div className="glow-orb w-32 h-32 bg-sky-500/10 -bottom-16 -left-10" />

      {/* Sparkle accent */}
      <div className="absolute top-5 right-5 opacity-20">
        <Sparkles size={36} className="text-white" />
      </div>

      <div className="relative z-10 flex flex-col gap-3">
        <span className="text-white/50 text-xs sm:text-sm font-medium tracking-[0.2em] uppercase">
          Available Balance
        </span>

        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="gradient-text text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight break-all leading-tight">
            {balance.toFixed(8)}
          </span>
          <span className="text-white/60 text-lg sm:text-xl font-semibold tracking-tight">
            {currency}
          </span>
        </div>

        {fiatValue !== undefined && (
          <p className="text-white/50 text-sm">
            ≈ {formatFiat(fiatValue, fiatCurrency)}
          </p>
        )}

        <div className="mt-4 flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 border-t border-white/10 pt-4">
          <div className="flex items-center gap-2 text-emerald-400">
            <ArrowUpRight size={16} className="text-emerald-400" />
            <span className="text-xs font-medium text-emerald-300">Deposits enabled</span>
          </div>
          <div className="flex items-center gap-2 text-white/50">
            <ArrowDownLeft size={16} className="text-white/50" />
            <span className="text-xs font-medium text-white/60">Send {currency} anytime</span>
          </div>
        </div>
      </div>
    </div>
  )
}
