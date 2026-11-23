'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
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
import { FiatToggle } from '@/components/wallet/FiatToggle'
import {
  UserPlus,
  UserMinus,
  User,
  AlertCircle,
  Loader2,
  Copy,
  Check,
  Coins,
} from 'lucide-react'

interface Contact {
  id: string
  label: string
  address: string
  coin: 'ltc' | 'sol'
  created_at: string
}

export default function ContactsPage() {
  return (
    <Suspense fallback={<DashboardLoading />}>
      <ContactsPageInner />
    </Suspense>
  )
}

function ContactsPageInner() {
  const searchParams = useSearchParams()
  const { data, loading, error, getAccessToken } = useWallet()
  const { toast } = useToast()

  const [contacts, setContacts] = useState<Contact[]>([])
  const [label, setLabel] = useState('')
  const [address, setAddress] = useState('')
  const [coin, setCoin] = useState<'ltc' | 'sol'>('ltc')
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const load = async () => {
    const token = await getAccessToken()
    if (!token) return
    try {
      const res = await fetch('/api/wallet/saved-addresses', {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      })
      if (res.ok) {
        const payload = await res.json()
        setContacts(payload.addresses || [])
      }
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getAccessToken])

  // Optional ?coin= filter from URL (used by withdraw "Saved Addresses").
  const filterCoin = searchParams.get('coin')

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')
    const addr = address.trim()
    const lab = label.trim()
    if (!lab) {
      setFormError('Please enter a label')
      return
    }
    if (!addr) {
      setFormError('Please enter an address')
      return
    }

    setSaving(true)
    const token = await getAccessToken()
    if (!token) return
    try {
      const res = await fetch('/api/wallet/saved-addresses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ label: lab, address: addr, coin }),
      })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) {
        setFormError(payload.error || 'Could not save contact')
        setSaving(false)
        return
      }
      setContacts((prev) => [
        { ...(payload.address as Contact) },
        ...prev,
      ])
      setLabel('')
      setAddress('')
      toast('Contact saved')
    } catch {
      setFormError('Network error — could not save contact')
    } finally {
      setSaving(false)
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
      if (res.ok) {
        setContacts((prev) => prev.filter((c) => c.id !== id))
        toast('Contact removed')
      }
    } catch {
      // ignore
    }
  }

  const copy = (addr: string, id: string) => {
    navigator.clipboard?.writeText(addr)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 1500)
  }

  const shown = filterCoin ? contacts.filter((c) => c.coin === filterCoin) : contacts

  if (loading) return <DashboardLoading />

  return (
    <DashboardPageShell>
      <DashboardHeader
        title="Contacts"
        subtitle="Save recipient addresses for quick withdrawals"
        showBack
      />

      <div className="flex items-center justify-end mb-6">
        <FiatToggle />
      </div>

      {error && <DashboardError error={error} />}

      <div className="max-w-2xl mx-auto">
        {/* Add form */}
        <form onSubmit={handleAdd} className="glass-panel p-6 md:p-7 space-y-4 mb-8">
          <div className="flex items-center gap-2">
            <UserPlus size={18} className="text-emerald-400" />
            <h2 className="text-sm font-semibold text-white uppercase tracking-wider">
              Add Contact
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-white/50 mb-1.5">
                Label
              </label>
              <Input
                placeholder="e.g. Alex, Exchange..."
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                maxLength={60}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-white/50 mb-1.5">
                Coin
              </label>
              <div className="flex gap-2">
                {(['ltc', 'sol'] as const).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCoin(c)}
                    className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
                      coin === c
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-white/5 text-white/50 border border-white/10'
                    }`}
                  >
                    {c === 'ltc' ? 'LTC' : 'SOL'}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-white/50 mb-1.5">
              {coin === 'sol' ? 'SOL Address' : 'LTC Address'}
            </label>
            <Input
              placeholder={`${coin.toUpperCase()} address...`}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="font-mono text-sm"
            />
          </div>

          {formError && (
            <div className="flex items-center gap-2 rounded-xl bg-rose-500/10 border border-rose-500/20 px-4 py-3">
              <AlertCircle size={16} className="text-rose-400 flex-shrink-0" />
              <span className="text-xs text-rose-300">{formError}</span>
            </div>
          )}

          <Button type="submit" size="lg" className="w-full h-12" disabled={saving}>
            {saving ? (
              <>
                <Loader2 size={18} className="animate-spin mr-2" />
                Saving…
              </>
            ) : (
              <>
                <UserPlus size={18} className="mr-2" />
                Save Contact
              </>
            )}
          </Button>
        </form>

        {/* List */}
        {shown.length === 0 ? (
          <div className="glass-panel p-10 text-center">
            <User size={32} className="mx-auto mb-4 text-white/20" />
            <h3 className="text-white font-medium">No contacts yet</h3>
            <p className="text-white/50 text-sm mt-1">
              Save recipient addresses above to quickly send {coin === 'sol' ? 'SOL' : 'LTC'}.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {shown.map((c) => (
              <div
                key={c.id}
                className="glass-panel p-5 flex items-center gap-4"
              >
                <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/60">
                  <User size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-white truncate">{c.label}</p>
                    <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400/80 bg-emerald-500/10 rounded-md px-1.5 py-0.5">
                      <Coins size={10} />
                      {(c.coin || '').toUpperCase()}
                    </span>
                  </div>
                  <p className="text-xs text-white/40 font-mono truncate mt-0.5">
                    {c.address}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => copy(c.address, c.id)}
                    className="text-white/40 hover:text-white p-1.5"
                    title="Copy address"
                  >
                    {copiedId === c.id ? (
                      <Check size={15} className="text-emerald-400" />
                    ) : (
                      <Copy size={15} />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemove(c.id)}
                    className="text-white/30 hover:text-rose-400 p-1.5"
                    title="Remove"
                  >
                    <UserMinus size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardPageShell>
  )
}
