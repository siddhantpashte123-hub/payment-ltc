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
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import { copyText } from '@/lib/clipboard'
import {
  ArrowDownLeft,
  AlertCircle,
  Loader2,
  Copy,
  Check,
  Share2,
  FileText,
  Plus,
} from 'lucide-react'

interface ReceiveRequest {
  id: string
  amount_ltc: number
  note?: string
  created_at: string
}

// Guard against null/undefined amounts from the DB so .toFixed never throws.
const safeAmount = (a: number | null | undefined): number =>
  typeof a === 'number' && Number.isFinite(a) ? a : 0

export default function ReceivePage() {
  return (
    <Suspense fallback={<DashboardLoading />}>
      <ReceivePageInner />
    </Suspense>
  )
}

function ReceivePageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data, loading, error, getAccessToken } = useWallet()
  const { toast } = useToast()

  const coin: 'ltc' | 'sol' = searchParams.get('coin') === 'sol' ? 'sol' : 'ltc'
  const unit = coin === 'sol' ? 'SOL' : 'LTC'
  const coinData = data?.[coin]

  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [formError, setFormError] = useState('')
  const [creating, setCreating] = useState(false)
  const [requests, setRequests] = useState<ReceiveRequest[]>([])
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // The deposit address the request points to.
  const address = coinData?.address || ''

  const loadRequests = async () => {
    const token = await getAccessToken()
    if (!token) return
    try {
      const res = await fetch(`/api/wallet/receive?coin=${coin}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      })
      if (res.ok) {
        const payload = await res.json()
        setRequests(payload.requests || [])
      }
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    loadRequests()
  }, [getAccessToken])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')
    const amt = parseFloat(amount)
    if (!amt || amt <= 0) {
      setFormError('Please enter a valid amount')
      return
    }

    setCreating(true)
    const token = await getAccessToken()
    if (!token) return

    try {
      const res = await fetch('/api/wallet/receive', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ amount: amt, note: note.trim() || undefined, coin }),
      })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) {
        setFormError(payload.error || 'Could not create request')
        setCreating(false)
        return
      }
      setRequests((prev) => [payload.request, ...prev])
      setAmount('')
      setNote('')
      toast('Receive request created')
    } catch {
      setFormError('Network error — could not create request')
    } finally {
      setCreating(false)
    }
  }

  const shareText = async (req: ReceiveRequest) => {
    const text = `Please send ${safeAmount(req.amount_ltc).toFixed(8)} ${unit} to my BlueWallet address: ${address}`
    if (navigator.share) {
      navigator
        .share({ title: 'BlueWallet Receive Request', text })
        .catch(() => {})
    } else {
      const ok = await copyText(text)
      toast(ok ? 'Request link copied' : 'Copy failed')
    }
  }

  const copyLink = async (req: ReceiveRequest) => {
    const link = `${window.location.origin}/dashboard/receive?amount=${req.amount_ltc}`
    const ok = await copyText(link)
    if (ok) {
      setCopiedId(req.id)
      setTimeout(() => setCopiedId(null), 2000)
      toast('Link copied')
    } else {
      toast('Copy failed')
    }
  }

  if (loading) return <DashboardLoading />

  return (
    <DashboardPageShell>
      <DashboardHeader
        title={`Receive ${unit}`}
        subtitle={`Create a request for a specific amount and share the QR`}
        showBack
      />

      {error && <DashboardError error={error} />}

      <div className="max-w-xl mx-auto">
        <form onSubmit={handleCreate} className="space-y-6">
          {/* Amount + note */}
          <div className="glass-panel p-6 md:p-7 space-y-4">
            <div className="flex items-center gap-2">
              <ArrowDownLeft size={18} className="text-emerald-400" />
              <h2 className="text-sm font-semibold text-white uppercase tracking-wider">
                New Receive Request
              </h2>
            </div>
            <div>
              <label className="block text-xs font-medium text-white/50 mb-1.5">
                Amount ({unit})
              </label>
              <Input
                type="number"
                step="0.00000001"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-white/50 mb-1.5">
                Note (optional)
              </label>
              <Input
                placeholder="e.g. Coffee, rent..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={200}
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
            disabled={creating || !amount}
          >
            {creating ? (
              <>
                <Loader2 size={18} className="animate-spin mr-2" />
                Creating…
              </>
            ) : (
              <>
                <Plus size={18} className="mr-2" />
                Create Request
              </>
            )}
          </Button>
        </form>

        {/* Existing requests */}
        {requests.length > 0 && (
          <div className="mt-10">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
              <FileText size={16} className="text-emerald-400" />
              Your Requests
            </h3>
            <div className="space-y-4">
              {requests.map((req) => (
                <div key={req.id} className="glass-panel p-6">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div>
                      <p className="text-2xl font-bold text-white">
                        {safeAmount(req.amount_ltc).toFixed(8)} <span className="text-sm text-white/50">{unit}</span>
                      </p>
                      {req.note && (
                        <p className="text-xs text-white/40 mt-1">{req.note}</p>
                      )}
                      <p className="text-xs text-white/30 mt-1">
                        {new Date(req.created_at).toLocaleString()}
                      </p>
                    </div>
                    <div className="bg-white rounded-xl p-3 flex-shrink-0">
                      <QRCodeSVG
                        value={
                          coin === 'sol'
                            ? `solana:${address}?amount=${req.amount_ltc}`
                            : `litecoin:${address}?amount=${req.amount_ltc}`
                        }
                        size={72}
                        level="M"
                        bgColor="#ffffff"
                        fgColor="#000000"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => shareText(req)}
                      className="flex-1"
                    >
                      <Share2 size={13} className="mr-1.5" />
                      Share
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyLink(req)}
                      className="flex-1"
                    >
                      {copiedId === req.id ? (
                        <>
                          <Check size={13} className="mr-1.5 text-emerald-400" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy size={13} className="mr-1.5" />
                          Copy link
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {requests.length === 0 && (
          <div className="mt-10 glass-panel p-10 text-center">
            <FileText size={32} className="mx-auto mb-4 text-white/20" />
            <h3 className="text-white font-medium">No requests yet</h3>
            <p className="text-white/50 text-sm mt-1">
              Create a request above to get a QR for a specific amount.
            </p>
          </div>
        )}
      </div>
    </DashboardPageShell>
  )
}
