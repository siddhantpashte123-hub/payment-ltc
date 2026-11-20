'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
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
import {
  ArrowDownLeft,
  AlertCircle,
  Loader2,
  Copy,
  Check,
  QrCode,
  Share2,
} from 'lucide-react'

interface ReceiptData {
  amount: number
  address: string
  explorer: string
}

export default function DepositPage() {
  const router = useRouter()
  const { data, loading, error, getAccessToken } = useWallet()
  const { toast } = useToast()

  const [amount, setAmount] = useState('')
  const [address, setAddress] = useState('')
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [receipt, setReceipt] = useState<ReceiptData | null>(null)
  const [confirmed, setConfirmed] = useState(false)
  const [copied, setCopied] = useState(false)

  // Poll the wallet for on-chain confirmation of the pending deposit.
  useEffect(() => {
    if (!receipt) return
    let mounted = true

    const check = async () => {
      const token = await getAccessToken()
      if (!token) return
      try {
        const res = await fetch('/api/wallet', {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        })
        if (!res.ok) return
        const wallet = await res.json()
        const txs = wallet.transactions || []
        // Look for a completed deposit matching amount + address.
        const found = txs.find(
          (t: {
            type: string
            amount: number
            address: string
            status: string
          }) =>
            t.type === 'deposit' &&
            Math.abs(t.amount - receipt.amount) < 1e-8 &&
            t.address === receipt.address &&
            t.status === 'completed'
        )
        if (found && mounted) setConfirmed(true)
      } catch {
        // ignore
      }
    }

    check()
    const id = setInterval(check, 15000)
    return () => {
      mounted = false
      clearInterval(id)
    }
  }, [receipt, getAccessToken])

  // Prefill the user's own deposit address once loaded.
  const effectiveAddress = address || data?.address || ''

  const copyAddress = () => {
    navigator.clipboard?.writeText(effectiveAddress)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast('Address copied')
  }

  const shareAddress = () => {
    const text = `Send Litecoin to my BlueWallet address: ${effectiveAddress}`
    if (navigator.share) {
      navigator.share({ title: 'BlueWallet', text }).catch(() => {})
    } else {
      navigator.clipboard?.writeText(text)
      toast('Share text copied')
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
        body: JSON.stringify({ amount: amt, address: addr }),
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
        title="Deposit LTC"
        subtitle="Send Litecoin to your wallet from any exchange or wallet"
        showBack
      />

      {error && <DashboardError error={error} />}

      {receipt ? (
        <Receipt
          type="deposit"
          amount={receipt.amount}
          counterparty={receipt.address}
          explorer={receipt.explorer}
          status={confirmed ? 'completed' : 'pending'}
          live={!confirmed}
          onBack={() => router.push('/dashboard')}
        />
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
                  Deposit Amount (LTC)
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
                  Your wallet LTC address
                </label>
                <textarea
                  value={effectiveAddress}
                  onChange={(e) => setAddress(e.target.value)}
                  rows={3}
                  placeholder="Enter the LTC address to deposit to..."
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/40 transition-all focus:outline-none focus:ring-1 focus:ring-white focus:border-transparent resize-none font-mono text-sm break-all"
                />
                <p className="text-xs text-white/40 mt-1.5">
                  This is your unique BlueWallet deposit address. Only send LTC
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
