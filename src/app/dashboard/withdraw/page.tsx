'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
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
import { User, AlertCircle, Loader2, ArrowUpRight } from 'lucide-react'

interface ReceiptData {
  amount: number
  address: string
  txHash: string
  explorer: string
}

export default function WithdrawPage() {
  const router = useRouter()
  const { data, loading, error, getAccessToken } = useWallet()

  const [to, setTo] = useState('')
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [receipt, setReceipt] = useState<ReceiptData | null>(null)

  const balance = data?.balance ?? 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')

    const amt = parseFloat(amount)
    const addr = to.trim()

    if (!addr) {
      setFormError('Please enter a recipient LTC address')
      return
    }
    if (!amt || amt <= 0) {
      setFormError('Please enter a valid amount')
      return
    }
    if (amt > balance) {
      setFormError('Insufficient balance for this withdrawal')
      return
    }

    setSubmitting(true)
    const token = await getAccessToken()
    if (!token) return

    try {
      const res = await fetch('/api/wallet/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          to: addr,
          amount: amt,
          name: name.trim() || undefined,
        }),
      })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) {
        setFormError(payload.error || 'Withdrawal failed')
        setSubmitting(false)
        return
      }
      setReceipt({
        amount: amt,
        address: addr,
        txHash: payload.txid || '',
        explorer: payload.explorer || '',
      })
    } catch {
      setFormError('Network error — withdrawal could not be submitted')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <DashboardLoading />

  return (
    <DashboardPageShell>
      <DashboardHeader
        title="Withdraw LTC"
        subtitle="Send Litecoin to any LTC address — broadcast instantly"
        showBack
      />

      {error && <DashboardError error={error} />}

      {receipt ? (
        <Receipt
          type="send"
          amount={receipt.amount}
          counterparty={receipt.address}
          txHash={receipt.txHash}
          explorer={receipt.explorer}
          status="completed"
          onBack={() => router.push('/dashboard')}
        />
      ) : (
        <div className="max-w-xl mx-auto">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Recipient address */}
            <div className="glass-panel p-6 md:p-7 space-y-4">
              <div className="flex items-center gap-2">
                <ArrowUpRight size={18} className="text-white/70" />
                <h2 className="text-sm font-semibold text-white uppercase tracking-wider">
                  Recipient
                </h2>
              </div>
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1.5">
                  Recipient LTC Address
                </label>
                <Input
                  placeholder="LTC address..."
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1.5">
                  Recipient Name (optional)
                </label>
                <div className="relative">
                  <User
                    size={16}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40"
                  />
                  <Input
                    placeholder="e.g. Alex, Exchange..."
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="pl-10"
                    maxLength={60}
                  />
                </div>
              </div>
            </div>

            {/* Amount */}
            <div className="glass-panel p-6 md:p-7 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ArrowUpRight size={18} className="text-emerald-400" />
                  <h2 className="text-sm font-semibold text-white uppercase tracking-wider">
                    Amount
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-white/40 text-xs pb-2">
                    Balance: {balance.toFixed(8)} LTC
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setAmount(balance.toFixed(8))}
                    className="mb-0.5"
                  >
                    Max
                  </Button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1.5">
                  Amount to withdraw (LTC)
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
              disabled={submitting || !to || !amount}
            >
              {submitting ? (
                <>
                  <Loader2 size={18} className="animate-spin mr-2" />
                  Withdrawing…
                </>
              ) : (
                <>
                  <ArrowUpRight size={18} className="mr-2" />
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
