'use client'

import { ArrowUpRight, ArrowDownLeft, Sparkles } from 'lucide-react'

interface BalanceCardProps {
  balance: number
  currency?: string
  fiatValue?: number
}

export function BalanceCard({ balance, currency = 'LTC', fiatValue }: BalanceCardProps) {
  return (
    <div className="glass-panel p-6 relative overflow-hidden">
      <div className="absolute top-0 right-0 p-4 opacity-10">
        <Sparkles size={48} className="text-white" />
      </div>
      <div className="relative z-10 flex flex-col gap-2">
        <div className="flex items-baseline gap-2">
          <span className="text-white/50 text-sm font-medium tracking-wider uppercase">
            Available Balance
          </span>
          <span className="text-3xl font-bold text-white tracking-tight">
            {balance.toFixed(8)} {currency}
          </span>
        </div>
        {fiatValue !== undefined && (
          <p className="text-white/40 text-sm">
            ≈ ${fiatValue.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </p>
        )}
        <div className="mt-4 flex items-center gap-4 border-t border-white/10 pt-4">
          <div className="flex items-center gap-2 text-emerald-400">
            <ArrowUpRight size={16} className="text-emerald-400" />
            <span className="text-xs font-medium text-emerald-300">Deposits enabled</span>
          </div>
          <div className="flex items-center gap-2 text-white/50">
            <ArrowDownLeft size={16} className="text-white/50" />
            <span className="text-xs font-medium text-white/60">Send LTC anytime</span>
          </div>
        </div>
      </div>
    </div>
  )
}
