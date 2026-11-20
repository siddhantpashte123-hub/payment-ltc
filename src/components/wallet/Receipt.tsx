'use client'

import { CheckCircle2, Clock, ExternalLink, ArrowLeft, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ReceiptProps {
  type: 'deposit' | 'send'
  amount: number
  counterparty: string
  txHash?: string
  explorer?: string
  status: 'completed' | 'pending'
  /** Optional live status: when true, shows an animated "confirming" progress */
  live?: boolean
  onBack?: () => void
}

export function Receipt({
  type,
  amount,
  counterparty,
  txHash,
  explorer,
  status,
  live,
  onBack,
}: ReceiptProps) {
  const isDeposit = type === 'deposit'
  const isConfirming = status === 'pending' && live

  return (
    <div className="glass-panel p-8 md:p-10 max-w-xl mx-auto text-center relative overflow-hidden">
      {/* Top accent glow */}
      <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center gap-5">
        {/* Animated check / clock */}
        <div className="animate-pop">
          {status === 'completed' ? (
            <div className="w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
              <CheckCircle2 size={44} className="text-emerald-400" />
            </div>
          ) : isConfirming ? (
            <div className="w-20 h-20 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
              <Loader2 size={44} className="text-amber-400 animate-spin" />
            </div>
          ) : (
            <div className="w-20 h-20 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
              <Clock size={44} className="text-amber-400" />
            </div>
          )}
        </div>

        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            {status === 'completed'
              ? 'Payment Complete'
              : isConfirming
              ? 'Confirming…'
              : 'Payment Submitted'}
          </h2>
          <p className="text-white/50 text-sm mt-1">
            {isDeposit ? 'Deposit received' : 'LTC sent'} — your receipt
          </p>
        </div>

        {isConfirming && (
          <div className="w-full max-w-xs">
            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-amber-400 rounded-full animate-pulse w-2/3" />
            </div>
            <p className="text-xs text-amber-300/80 mt-2">
              Waiting for on-chain confirmation. This page updates automatically.
            </p>
          </div>
        )}

        {/* Amount */}
        <div className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-5">
          <p className="text-xs text-white/40 uppercase tracking-wider mb-1">
            Amount
          </p>
          <p className="text-3xl font-bold text-white tracking-tight">
            {amount.toFixed(8)} <span className="text-lg text-white/50">LTC</span>
          </p>
        </div>

        {/* Details */}
        <div className="w-full space-y-3 text-left">
          <DetailRow label="Counterparty" value={counterparty || '—'} />
          {txHash && <DetailRow label="Transaction ID" value={txHash} mono />}
          {explorer && (
            <div className="flex items-center justify-between gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-3">
              <span className="text-xs text-white/40 uppercase tracking-wider">
                Explorer
              </span>
              <a
                href={explorer}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-400 hover:text-emerald-300 transition-colors"
              >
                View on SoChain
                <ExternalLink size={12} />
              </a>
            </div>
          )}
        </div>

        {onBack && (
          <Button
            onClick={onBack}
            variant="outline"
            className="w-full mt-2"
          >
            <ArrowLeft size={16} className="mr-2" />
            Back to Dashboard
          </Button>
        )}
      </div>
    </div>
  )
}

function DetailRow({
  label,
  value,
  mono,
}: {
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-3">
      <span className="text-xs text-white/40 uppercase tracking-wider">
        {label}
      </span>
      <span
        className={`text-xs text-white truncate max-w-[60%] ${
          mono ? 'font-mono' : ''
        }`}
      >
        {value}
      </span>
    </div>
  )
}
