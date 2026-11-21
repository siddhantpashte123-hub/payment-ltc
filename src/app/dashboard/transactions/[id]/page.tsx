'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  DashboardHeader,
  DashboardLoading,
  DashboardPageShell,
} from '@/components/wallet/DashboardShell'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  ArrowUpRight,
  ArrowDownLeft,
  ExternalLink,
  User,
  ArrowLeft,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  StickyNote,
  Layers,
  Hash,
  Gauge,
  Zap,
} from 'lucide-react'

interface TxDetail {
  id: string
  type: 'deposit' | 'send'
  amount: number
  status: 'completed' | 'pending' | 'failed'
  address: string
  name?: string
  note?: string
  created_at: string
  tx_hash?: string
  explorer?: string
  confirmations?: number
  block_height?: number | null
  fee_ltc?: number
  fee_litoshi?: number
  estimated_time?: string
  onchain_status?: 'confirmed' | 'pending' | null
}

export default function TransactionDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const txId = params.id

  const [tx, setTx] = useState<TxDetail | null>(null)
  const [priceInr, setPriceInr] = useState<number | undefined>(undefined)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true
    const load = async () => {
      const {
        data: { session },
      } = await createClient().auth.getSession()
      const token = session?.access_token
      if (!token) {
        router.push('/login')
        return
      }
      try {
        // Dedicated endpoint returns the tx with live on-chain detail.
        const res = await fetch(`/api/wallet/transaction/${txId}`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          throw new Error(err.error || 'Transaction load failed')
        }
        const found: TxDetail = await res.json()
        if (mounted) setTx(found)
      } catch (e) {
        if (mounted) {
          setError(
            e instanceof Error ? e.message : 'Could not load transaction details.'
          )
        }
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    // Fetch price for the INR value of this transaction.
    fetch('/api/price', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((p) => {
        if (mounted && p?.priceInr) setPriceInr(p.priceInr)
      })
      .catch(() => {})
    return () => {
      mounted = false
    }
  }, [txId, router])

  if (loading) return <DashboardLoading />

  return (
    <DashboardPageShell>
      <DashboardHeader title="Transaction Detail" showBack />

      {error && (
        <div className="glass-panel border-rose-500/30 bg-rose-500/5 rounded-2xl px-6 py-5 max-w-xl">
          <p className="text-rose-500 font-medium text-sm">{error}</p>
        </div>
      )}

      {tx && (
        <div className="max-w-2xl mx-auto">
          {/* Type + amount hero */}
          <div className="glass-panel p-8 md:p-10 text-center mb-6 relative overflow-hidden">
            <div
              className={`absolute -top-20 left-1/2 -translate-x-1/2 w-56 h-56 rounded-full blur-3xl pointer-events-none ${
                tx.type === 'deposit'
                  ? 'bg-emerald-500/10'
                  : 'bg-white/5'
              }`}
            />
            <div className="relative z-10">
              <div
                className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl border mb-5 ${{
                  deposit: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
                  send: 'bg-white/5 border-white/10 text-white/60',
                }[tx.type]}`}
              >
                {tx.type === 'deposit' ? (
                  <ArrowUpRight size={30} />
                ) : (
                  <ArrowDownLeft size={30} />
                )}
              </div>
              <p className="text-white/50 text-sm uppercase tracking-wider mb-2">
                {tx.type === 'deposit' ? 'Deposit Received' : 'LTC Sent'}
              </p>
              <p
                className={`text-4xl font-bold tracking-tight ${
                  tx.type === 'deposit' ? 'text-emerald-400' : 'text-white'
                }`}
              >
                {tx.type === 'deposit' ? '+' : '−'}
                {tx.amount.toFixed(8)} <span className="text-xl text-white/50">LTC</span>
              </p>

              <div className="flex items-center justify-center gap-2 mt-4">
                <Badge
                  variant={
                    tx.status === 'completed'
                      ? 'success'
                      : tx.status === 'pending'
                      ? 'pending'
                      : 'failed'
                  }
                >
                  {tx.status}
                </Badge>
                {tx.confirmations != null && (
                  <Badge
                    variant={tx.confirmations > 0 ? 'success' : 'pending'}
                    className="capitalize"
                  >
                    {tx.confirmations} confirmation
                    {tx.confirmations === 1 ? '' : 's'}
                  </Badge>
                )}
                <span className="text-xs text-white/40 flex items-center gap-1">
                  <Clock size={12} />
                  {new Date(tx.created_at).toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* On-chain status hero */}
          {tx.estimated_time && (
            <div
              className={`mb-6 rounded-2xl border px-5 py-4 flex items-center gap-3 ${
                tx.confirmations && tx.confirmations > 0
                  ? 'bg-emerald-500/10 border-emerald-500/20'
                  : 'bg-amber-500/10 border-amber-500/20'
              }`}
            >
              {tx.confirmations && tx.confirmations > 0 ? (
                <CheckCircle2 size={20} className="text-emerald-400 flex-shrink-0" />
              ) : (
                <Loader2
                  size={20}
                  className="text-amber-400 flex-shrink-0 animate-spin"
                />
              )}
              <div>
                <p
                  className={`text-sm font-medium ${
                    tx.confirmations && tx.confirmations > 0
                      ? 'text-emerald-300'
                      : 'text-amber-300'
                  }`}
                >
                  {tx.confirmations && tx.confirmations > 0
                    ? 'Confirmed on-chain'
                    : 'Waiting for confirmations'}
                </p>
                <p className="text-xs text-white/50 mt-0.5">
                  {tx.confirmations != null
                    ? `${tx.confirmations} confirmation${tx.confirmations === 1 ? '' : 's'} · ${tx.estimated_time}`
                    : tx.estimated_time}
                </p>
              </div>
            </div>
          )}

          {/* Details */}
          <div className="glass-panel p-6 md:p-8 space-y-4">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-2">
              Details
            </h3>
            <DetailRow label="Counterparty">
              <span className="inline-flex items-center gap-1.5 text-sm text-white">
                <User size={14} className="text-white/40" />
                {tx.name || tx.address || '—'}
              </span>
            </DetailRow>
            <DetailRow label="Address">
              <span className="font-mono text-xs text-white/70 break-all">
                {tx.address || '—'}
              </span>
            </DetailRow>
            {tx.note && (
              <DetailRow label="Note">
                <span className="inline-flex items-center gap-1.5 text-sm text-white/70">
                  <StickyNote size={14} className="text-white/40 flex-shrink-0" />
                  {tx.note}
                </span>
              </DetailRow>
            )}
            {tx.tx_hash && (
              <DetailRow label="Transaction ID">
                <span className="font-mono text-xs text-white/70 break-all">
                  {tx.tx_hash}
                </span>
              </DetailRow>
            )}

            {/* On-chain detail rows */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 pt-1">
              <DetailRow label="Confirmations">
                <span className="inline-flex items-center gap-1.5 text-sm text-white font-medium">
                  <Layers size={14} className="text-emerald-400" />
                  {tx.confirmations != null ? tx.confirmations : '—'}
                </span>
              </DetailRow>
              <DetailRow label="Block Height">
                <span className="inline-flex items-center gap-1.5 text-sm text-white/70 font-mono">
                  <Hash size={14} className="text-white/40" />
                  {tx.block_height != null ? tx.block_height : '—'}
                </span>
              </DetailRow>
              <DetailRow label="Network Fee">
                <span className="inline-flex items-center gap-1.5 text-sm text-white/70">
                  <Zap size={14} className="text-amber-400" />
                  {tx.fee_ltc != null
                    ? `${tx.fee_ltc} LTC (${tx.fee_litoshi ?? Math.round(tx.fee_ltc * 1e8)} litoshi)`
                    : '—'}
                </span>
              </DetailRow>
              <DetailRow label="Est. Confirmation">
                <span className="inline-flex items-center gap-1.5 text-sm text-white/70">
                  <Gauge size={14} className="text-sky-400" />
                  {tx.estimated_time ?? '—'}
                </span>
              </DetailRow>
            </div>

            {priceInr !== undefined && (
              <DetailRow label="Value (INR)">
                <span className="font-semibold text-white">
                  ≈ ₹{(tx.amount * priceInr).toLocaleString(undefined, {
                    maximumFractionDigits: 2,
                  })}
                </span>
              </DetailRow>
            )}

            {tx.explorer && (
              <div className="flex items-center justify-between gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-3">
                <span className="text-xs text-white/40 uppercase tracking-wider">
                  Explorer
                </span>
                <a
                  href={tx.explorer}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-400 hover:text-emerald-300 transition-colors"
                >
                  View on SoChain
                  <ExternalLink size={12} />
                </a>
              </div>
            )}

            {tx.status === 'pending' && (
              <div className="flex items-start gap-3 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3">
                <Loader2 size={16} className="text-amber-400 flex-shrink-0 mt-0.5 animate-spin" />
                <p className="text-xs text-amber-300">
                  This transaction is pending. Deposits are credited automatically
                  once the on-chain transaction confirms.
                </p>
              </div>
            )}
            {tx.status === 'completed' && tx.confirmations && tx.confirmations > 0 && (
              <div className="flex items-center gap-2 text-xs text-emerald-400">
                <CheckCircle2 size={14} />
                Transaction confirmed on-chain
              </div>
            )}
            {tx.status === 'failed' && (
              <div className="flex items-center gap-2 text-xs text-rose-400">
                <AlertCircle size={14} />
                This transaction failed
              </div>
            )}
          </div>

          <Button
            variant="outline"
            className="w-full mt-6"
            onClick={() => router.push('/dashboard')}
          >
            <ArrowLeft size={16} className="mr-2" />
            Back to Dashboard
          </Button>
        </div>
      )}
    </DashboardPageShell>
  )
}

function DetailRow({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-xs text-white/40 uppercase tracking-wider flex-shrink-0">
        {label}
      </span>
      <div className="text-right min-w-0">{children}</div>
    </div>
  )
}
