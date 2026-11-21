'use client'

import { useEffect, useState } from 'react'
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
import { useToast } from '@/components/ui/toast'
import {
  User,
  AlertCircle,
  Loader2,
  ArrowUpRight,
  Save,
  X,
  BookUser,
  Check,
  StickyNote,
} from 'lucide-react'

interface SavedAddress {
  id: string
  label: string
  address: string
}

interface ReceiptData {
  amount: number
  address: string
  txHash: string
  explorer: string
}

export default function WithdrawPage() {
  const router = useRouter()
  const { data, loading, error, getAccessToken } = useWallet()
  const { toast } = useToast()

  const [to, setTo] = useState('')
  const [name, setName] = useState('')
  const [note, setNote] = useState('')
  const [amount, setAmount] = useState('')
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [receipt, setReceipt] = useState<ReceiptData | null>(null)

  // Saved addresses
  const [saved, setSaved] = useState<SavedAddress[]>([])
  const [showSaveForm, setShowSaveForm] = useState(false)
  const [saveLabel, setSaveLabel] = useState('')

  // Confirmation modal
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmSending, setConfirmSending] = useState(false)

  // Fee estimate + max sendable amount (balance minus fee) from the API.
  const [fee, setFee] = useState(0)
  const [maxSendable, setMaxSendable] = useState(0)

  const balance = data?.balance ?? 0

  useEffect(() => {
    let mounted = true
    const loadFee = async () => {
      const token = await getAccessToken()
      if (!token) return
      try {
        const res = await fetch('/api/wallet/fee', {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        })
        if (res.ok) {
          const payload = await res.json()
          if (mounted) {
            setFee(Number(payload.fee) || 0)
            setMaxSendable(Number(payload.maxSendable) || 0)
          }
        }
      } catch {
        // ignore — fall back to balance-based max
      }
    }
    loadFee()
    return () => {
      mounted = false
    }
  }, [getAccessToken, balance])

  useEffect(() => {
    const loadSaved = async () => {
      const token = await getAccessToken()
      if (!token) return
      try {
        const res = await fetch('/api/wallet/saved-addresses', {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        })
        if (res.ok) {
          const payload = await res.json()
          setSaved(payload.addresses || [])
        }
      } catch {
        // ignore
      }
    }
    loadSaved()
  }, [getAccessToken])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    const token = await getAccessToken()
    if (!token) return
    const label = saveLabel.trim()
    if (!label || !to.trim()) return
    try {
      const res = await fetch('/api/wallet/saved-addresses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ label, address: to.trim() }),
      })
      if (res.ok) {
        const payload = await res.json()
        setSaved((prev) => [payload.address, ...prev])
        setSaveLabel('')
        setShowSaveForm(false)
      }
    } catch {
      // ignore
    }
  }

  const handleRemove = async (id: string) => {
    const token = await getAccessToken()
    if (!token) return
    try {
      const res = await fetch(`/api/wallet/saved-addresses/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) setSaved((prev) => prev.filter((a) => a.id !== id))
    } catch {
      // ignore
    }
  }

  const validate = () => {
    setFormError('')
    const amt = parseFloat(amount)
    const addr = to.trim()
    if (!addr) {
      setFormError('Please enter a recipient LTC address')
      return false
    }
    if (!amt || amt <= 0) {
      setFormError('Please enter a valid amount')
      return false
    }
    // Max sendable is balance minus fee (fee is paid from the same UTXOs).
    if (amt > (maxSendable > 0 ? maxSendable : balance)) {
      setFormError(
        'Insufficient balance — amount exceeds what can be sent after the network fee'
      )
      return false
    }
    return true
  }

  const handleContinue = (e: React.FormEvent) => {
    e.preventDefault()
    if (validate()) setConfirmOpen(true)
  }

  const confirmSend = async () => {
    setConfirmSending(true)
    setFormError('')
    const amt = parseFloat(amount)
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
          to: to.trim(),
          amount: amt,
          name: name.trim() || undefined,
          note: note.trim() || undefined,
        }),
      })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) {
        setFormError(payload.error || 'Withdrawal failed')
        setConfirmOpen(false)
        setConfirmSending(false)
        return
      }
      setConfirmOpen(false)
      const sent = Number(payload.sentAmount ?? amt)
      setReceipt({
        amount: sent,
        address: to.trim(),
        txHash: payload.txid || '',
        explorer: payload.explorer || '',
      })
      toast(`${sent.toFixed(8)} LTC sent successfully`)
    } catch {
      setFormError('Network error — withdrawal could not be submitted')
      setConfirmOpen(false)
    } finally {
      setConfirmSending(false)
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
          {/* Saved addresses */}
          {saved.length > 0 && (
            <div className="glass-panel p-6 md:p-7 space-y-3 mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BookUser size={16} className="text-emerald-400" />
                  <h2 className="text-sm font-semibold text-white uppercase tracking-wider">
                    Saved Addresses
                  </h2>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSaveForm((s) => !s)}
                >
                  {showSaveForm ? (
                    <>
                      <X size={13} /> Cancel
                    </>
                  ) : (
                    <>
                      <Save size={13} /> Save current
                    </>
                  )}
                </Button>
              </div>

              {showSaveForm && (
                <form onSubmit={handleSave} className="flex gap-2">
                  <Input
                    placeholder="Label (e.g. Alex)"
                    value={saveLabel}
                    onChange={(e) => setSaveLabel(e.target.value)}
                    maxLength={60}
                  />
                  <Button type="submit" variant="secondary" size="sm">
                    <Save size={14} /> Save
                  </Button>
                </form>
              )}

              <div className="flex flex-wrap gap-2">
                {saved.map((a) => (
                  <div
                    key={a.id}
                    className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg pl-3 pr-2 py-1.5 hover:bg-white/10 transition-colors group"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setTo(a.address)
                        setName(a.label)
                      }}
                      className="text-xs text-white hover:text-emerald-400 transition-colors truncate max-w-[180px]"
                    >
                      {a.label}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemove(a.id)}
                      className="text-white/30 hover:text-rose-400 transition-colors p-0.5"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <form onSubmit={handleContinue} className="space-y-6">
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
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1.5">
                  Note (optional)
                </label>
                <div className="relative">
                  <StickyNote
                    size={16}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40"
                  />
                  <Input
                    placeholder="e.g. Payment for services..."
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="pl-10"
                    maxLength={200}
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
                    onClick={() =>
                      setAmount(
                        (maxSendable > 0 ? maxSendable : balance).toFixed(8)
                      )
                    }
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

      {/* Confirmation modal */}
      {confirmOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={() => !confirmSending && setConfirmOpen(false)}
        >
          <div
            className="glass-panel p-8 max-w-md w-full relative overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-48 h-48 rounded-full bg-white/5 blur-3xl pointer-events-none" />
            <div className="relative z-10 space-y-5">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                  <ArrowUpRight size={20} className="text-white/70" />
                </div>
                <h2 className="text-lg font-bold text-white">Confirm Withdrawal</h2>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
                <ModalRow label="Recipient">
                  <span className="font-mono text-xs text-white/70 break-all">
                    {to}
                  </span>
                </ModalRow>
                {name.trim() && <ModalRow label="Name">{name.trim()}</ModalRow>}
                <ModalRow label="Amount">
                  <span className="font-bold text-white">
                    {parseFloat(amount).toFixed(8)} LTC
                  </span>
                </ModalRow>
                {fee > 0 && (
                  <ModalRow label="Network fee">
                    <span className="text-white/70">{fee.toFixed(8)} LTC</span>
                  </ModalRow>
                )}
                <ModalRow label="Balance after">
                  <span className="text-white/70">
                    {(balance - parseFloat(amount)).toFixed(8)} LTC
                  </span>
                </ModalRow>
              </div>

              <p className="text-xs text-white/40 leading-relaxed">
                This broadcasts a real on-chain Litecoin transaction. Please
                double-check the recipient address before confirming.
              </p>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setConfirmOpen(false)}
                  disabled={confirmSending}
                >
                  Cancel
                </Button>
                <Button
                  onClick={confirmSend}
                  className="w-full"
                  disabled={confirmSending}
                >
                  {confirmSending ? (
                    <>
                      <Loader2 size={16} className="animate-spin mr-2" />
                      Broadcasting…
                    </>
                  ) : (
                    <>
                      <Check size={16} className="mr-2" />
                      Confirm & Send
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardPageShell>
  )
}

function ModalRow({
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
