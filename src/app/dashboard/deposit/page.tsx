'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { QRCodeSVG } from 'qrcode.react'
import {
  useWallet,
  DashboardHeader,
  DashboardError,
  DashboardLoading,
  DashboardPageShell,
} from '@/components/wallet/DashboardShell'
import { Receipt } from '@/components/wallet/Receipt'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import { useNotifications } from '@/lib/notifications'
import { copyText } from '@/lib/clipboard'
import {
  ArrowDownLeft,
  AlertCircle,
  Loader2,
  Copy,
  Check,
  QrCode,
  Share2,
  RefreshCw,
} from 'lucide-react'

interface ReceiptData {
  amount: number
  address: string
  explorer: string
}

export default function DepositPage() {
  return (
    <Suspense fallback={<DashboardLoading />}>
      <DepositPageInner />
    </Suspense>
  )
}

function DepositPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data, loading, error, getAccessToken } = useWallet()
  const { toast } = useToast()
  const { push: pushNotification } = useNotifications()

  const coin: 'ltc' | 'sol' = searchParams.get('coin') === 'sol' ? 'sol' : 'ltc'
  const unit = coin === 'sol' ? 'SOL' : 'LTC'
  const coinData = data?.[coin]

  const [amount, setAmount] = useState('')
  const [address, setAddress] = useState('')
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [receipt, setReceipt] = useState<ReceiptData | null>(null)
  const [confirmed, setConfirmed] = useState(false)
  const [copied, setCopied] = useState(false)

  // Poll for on-chain confirmation of the pending deposit. Uses the
  // direct /api/wallet/deposit/check endpoint (on-chain check, no 2-min
  // staleness gate) so the deposit confirms as soon as the on-chain tx
  // has a confirmation — not delayed by the wallet sync gate.
  const checkDeposit = async () => {
    const token = await getAccessToken()
    if (!token || !receipt) return
    try {
      const res = await fetch('/api/wallet/deposit/check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ amount: receipt.amount, coin }),
      })
      if (!res.ok) return
      const payload = await res.json()
      if (payload.confirmed && receipt) {
        setConfirmed(true)
        pushNotification({
          type: 'deposit',
          title: `${unit} deposit received`,
          message: `${receipt.amount.toFixed(8)} ${unit} credited to your wallet`,
        })
      }
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    if (!receipt) return
    let mounted = true
    checkDeposit()
    const id = setInterval(() => {
      if (mounted) checkDeposit()
    }, 10000)
    return () => {
      mounted = false
      clearInterval(id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [receipt, getAccessToken])

  // Prefill the user's own deposit address once loaded.
  const effectiveAddress = address || coinData?.address || ''

  const copyAddress = async () => {
    const ok = await copyText(effectiveAddress)
    if (ok) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      toast('Address copied')
    } else {
      toast('Copy failed')
    }
  }

  const shareAddress = async () => {
    const text = `Send ${unit} to my BlueWallet address: ${effectiveAddress}`
    if (navigator.share) {
      navigator.share({ title: 'BlueWallet', text }).catch(() => {})
    } else {
      const ok = await copyText(text)
      toast(ok ? 'Share text copied' : 'Copy failed')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')

    const amt = parseFloat(amount)
    const addr = effectiveAddress.trim()

    if (!amt || amt <= 0) {
      setFormError('Please enter a valid amount')
      return
    }
    if (!addr) {
      setFormError('Please enter a deposit address')
      return
    }

    setSubmitting(true)
    const token = await getAccessToken()
    if (!token) return

    try {
      const res = await fetch('/api/wallet/deposit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ amount: amt, address: addr, coin }),
      })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) {
        setFormError(payload.error || 'Deposit failed')
        setSubmitting(false)
        return
      }
      setReceipt({
        amount: amt,
        address: addr,
        explorer: payload.explorer || '',
      })
      toast('Deposit submitted — waiting for confirmation')
    } catch {
      setFormError('Network error — deposit could not be submitted')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <DashboardLoading />

  return (
    <DashboardPageShell>
      <DashboardHeader
        title={`Deposit ${unit}`}
        subtitle={`Send ${unit} to your wallet from any exchange or wallet`}
        showBack
      />

      {error && <DashboardError error={error} />}

      {receipt ? (
        <div className="max-w-xl mx-auto space-y-4">
          {!confirmed && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={checkDeposit}
              className="w-full"
            >
              <RefreshCw size={14} className="mr-1.5" />
              Check now for on-chain confirmation
            </Button>
          )}
          <Receipt
            type="deposit"
            amount={receipt.amount}
            counterparty={receipt.address}
            explorer={receipt.explorer}
            status={confirmed ? 'completed' : 'pending'}
            live={!confirmed}
            unit={unit}
            explorerLabel={coin === 'sol' ? 'Solscan' : 'SoChain'}
            onBack={() => router.push('/dashboard')}
          />
          {!confirmed && (
            <p className="text-xs text-white/40 text-center">
              Deposit is broadcast and waiting for an on-chain confirmation
              (usually 2–5 minutes). You can leave this page — the deposit will
              be credited automatically once confirmed.
            </p>
          )}
        </div>
      ) : (
        <div className="max-w-xl mx-auto">
          {/* QR code card */}
          {effectiveAddress && (
            <div className="glass-panel p-6 md:p-8 mb-6 text-center relative overflow-hidden">
              <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-56 h-56 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
              <div className="relative z-10">
                <div className="inline-flex items-center gap-2 mb-4">
                  <QrCode size={18} className="text-emerald-400" />
                  <h2 className="text-sm font-semibold text-white uppercase tracking-wider">
                    Scan to Deposit
                  </h2>
                </div>
                <div className="inline-block bg-white rounded-2xl p-6 shadow-lg">
                  <QRCodeSVG
                    value={effectiveAddress}
                    size={180}
                    level="M"
                    bgColor="#ffffff"
                    fgColor="#000000"
                  />
                </div>
                <div className="flex items-center justify-center gap-4 mt-4">
                  <button
                    onClick={copyAddress}
                    className="inline-flex items-center gap-2 text-xs text-white/50 hover:text-white transition-colors"
                  >
                    {copied ? (
                      <>
                        <Check size={13} className="text-emerald-400" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy size={13} />
                        Copy address
                      </>
                    )}
                  </button>
                  <button
                    onClick={shareAddress}
                    className="inline-flex items-center gap-2 text-xs text-white/50 hover:text-white transition-colors"
                  >
                    <Share2 size={13} />
                    Share
                  </button>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Amount */}
            <div className="glass-panel p-6 md:p-7 space-y-4">
              <div className="flex items-center gap-2">
                <ArrowDownLeft size={18} className="text-emerald-400" />
                <h2 className="text-sm font-semibold text-white uppercase tracking-wider">
                  Amount
                </h2>
              </div>
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1.5">
                  Deposit Amount ({unit})
                </label>
                <Input
                  type="number"
                  step="0.00000001"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  autoFocus
                />
              </div>
            </div>

            {/* Address */}
            <div className="glass-panel p-6 md:p-7 space-y-4">
              <div className="flex items-center gap-2">
                <ArrowDownLeft size={18} className="text-white/70" />
                <h2 className="text-sm font-semibold text-white uppercase tracking-wider">
                  Deposit Address
                </h2>
              </div>
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1.5">
                  Your wallet {unit} address
                </label>
                <textarea
                  value={effectiveAddress}
                  onChange={(e) => setAddress(e.target.value)}
                  rows={3}
                  placeholder={`Enter the ${unit} address to deposit to...`}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/40 transition-all focus:outline-none focus:ring-1 focus:ring-white focus:border-transparent resize-none font-mono text-sm break-all"
                />
                <p className="text-xs text-white/40 mt-1.5">
                  This is your unique BlueWallet deposit address. Only send {unit}
                  to this address.
                </p>
              </div>
            </div>

            {formError && (
              <div className="flex items-center gap-2 rounded-xl bg-rose-500/10 border border-rose-500/20 px-4 py-3">
                <AlertCircle size={16} className="text-rose-400 flex-shrink-0" />
                <span className="text-xs text-rose-300">{formError}</span>
              </div>
            )}

            <Button
              type="submit"
              size="lg"
              className="w-full h-14 text-base"
              disabled={submitting || !amount || !effectiveAddress}
            >
              {submitting ? (
                <>
                  <Loader2 size={18} className="animate-spin mr-2" />
                  Submitting…
                </>
              ) : (
                <>
                  <ArrowDownLeft size={18} className="mr-2" />
                  Continue
                </>
              )}
            </Button>
          </form>
        </div>
      )}
    </DashboardPageShell>
  )
}
