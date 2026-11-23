'use client'

import { Button } from '@/components/ui/button'
import { CopyButton } from '@/components/wallet/CopyButton'
import { ShieldCheck, Clock, ExternalLink, Wallet } from 'lucide-react'

interface AddressDisplayProps {
  address: string
  explorerAddress?: string
  /** Coin unit label (e.g. 'LTC' or 'SOL'). */
  unit?: string
}

export function AddressDisplay({
  address,
  explorerAddress,
  unit = 'LTC',
}: AddressDisplayProps) {
  const addr = address || ''
  const short = addr.slice(0, 8) + '...' + addr.slice(addr.length - 6)

  return (
    <div className="premium-card p-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <ShieldCheck size={18} className="text-emerald-400" />
          <h3 className="text-sm font-semibold gradient-text uppercase tracking-wider">
            Your {unit} Deposit Address
          </h3>
        </div>
        {explorerAddress && (
          <a
            href={explorerAddress}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-white/40 hover:text-white/70 transition-colors"
          >
            <ExternalLink size={12} />
            Explorer
          </a>
        )}
      </div>

      <div className="mb-4">
        <p className="text-xs font-medium text-white/40 uppercase tracking-wider mb-1.5">
          Send {unit} to this address to deposit
        </p>
        <div className="flex items-center gap-3">
          <span className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-mono text-emerald-400 select-all break-all">
            {address}
          </span>
          <CopyButton value={address} size="sm" />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-white/40">
        <span className="inline-flex items-center gap-1.5">
          <Wallet size={13} />
          Unique address per user
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Clock size={13} />
          Deposits auto-detected
        </span>
        <span className="inline-flex items-center gap-1.5">
          <ShieldCheck size={13} />
          On-chain confirmed
        </span>
      </div>
    </div>
  )
}
