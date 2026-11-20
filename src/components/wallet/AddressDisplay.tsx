'use client'

import { Button } from '@/components/ui/button'
import { CopyButton } from '@/components/wallet/CopyButton'
import { ShieldCheck, Clock } from 'lucide-react'

interface AddressDisplayProps {
  address: string
  qrData?: string
}

export function AddressDisplay({ address, qrData }: AddressDisplayProps) {
  const short =
    address.slice(0, 6) + '...' + address.slice(address.length - 4)

  return (
    <div className="glass-panel p-6">
      <div className="flex items-center gap-2 mb-3">
        <ShieldCheck size={18} className="text-emerald-400" />
        <h3 className="text-sm font-semibold text-white uppercase tracking-wider">
          Your LTC Deposit Address
        </h3>
      </div>
      <div className="mb-4">
        <p className="text-xs font-medium text-white/40 uppercase tracking-wider mb-1">
          Send LTC to this address
        </p>
        <div className="flex items-center gap-3">
          <span className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-mono text-emerald-400 select-all break-all">
            {address}
          </span>
          <CopyButton value={address} size="sm" />
        </div>
      </div>
      <div className="flex items-center gap-2 text-xs text-white/40">
        <Clock size={14} />
        <span>Unique address generated for your account</span>
      </div>
    </div>
  )
}
