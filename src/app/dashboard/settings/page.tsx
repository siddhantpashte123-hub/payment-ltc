'use client'

import { Suspense, useEffect, useState } from 'react'
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
  Shield,
  AlertCircle,
  Loader2,
  Check,
  KeyRound,
  Lock,
} from 'lucide-react'

interface SettingsState {
  withdrawalLimitLtc: string
  withdrawalLimitSol: string
  whitelistOnly: boolean
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<DashboardLoading />}>
      <SettingsPageInner />
    </Suspense>
  )
}

function SettingsPageInner() {
  const { data, loading, error, getAccessToken } = useWallet()
  const { toast } = useToast()

  const [limits, setLimits] = useState<SettingsState>({
    withdrawalLimitLtc: '',
    withdrawalLimitSol: '',
    whitelistOnly: false,
  })
  const [saving, setSaving] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let mounted = true
    const load = async () => {
      const token = await getAccessToken()
      if (!token) return
      try {
        const res = await fetch('/api/wallet/settings', {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        })
        if (res.ok) {
          const { settings } = await res.json()
          if (mounted) {
            setLimits({
              withdrawalLimitLtc: settings['withdrawal_limit:ltc'] ?? '',
              withdrawalLimitSol: settings['withdrawal_limit:sol'] ?? '',
              whitelistOnly: settings['whitelist_only'] === 'true',
            })
            setLoaded(true)
          }
        }
      } catch {
        // ignore
      }
    }
    load()
    return () => {
      mounted = false
    }
  }, [getAccessToken])

  const save = async (patch: Partial<SettingsState>) => {
    setSaving(true)
    const token = await getAccessToken()
    if (!token) return
    const next = { ...limits, ...patch }
    try {
      const entries: Array<{ key: string; value: string }> = [
        { key: 'withdrawal_limit:ltc', value: next.withdrawalLimitLtc },
        { key: 'withdrawal_limit:sol', value: next.withdrawalLimitSol },
        { key: 'whitelist_only', value: next.whitelistOnly ? 'true' : 'false' },
      ]
      for (const entry of entries) {
        await fetch('/api/wallet/settings', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(entry),
        })
      }
      setLimits(next)
      toast('Settings saved')
    } catch {
      toast('Could not save settings')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <DashboardLoading />

  return (
    <DashboardPageShell>
      <DashboardHeader
        title="Security"
        subtitle="Control how much and where you can withdraw"
        showBack
      />

      <div className="flex items-center justify-end mb-6">
        <FiatToggle />
      </div>

      {error && <DashboardError error={error} />}

      <div className="max-w-xl mx-auto space-y-6">
        {/* Withdrawal limits */}
        <div className="glass-panel p-6 md:p-7 space-y-5">
          <div className="flex items-center gap-2">
            <KeyRound size={18} className="text-emerald-400" />
            <h2 className="text-sm font-semibold text-white uppercase tracking-wider">
              Withdrawal Limits
            </h2>
          </div>
          <p className="text-xs text-white/40">
            Set a maximum amount per single withdrawal. Leave empty for no limit.
          </p>

          <div>
            <label className="block text-xs font-medium text-white/50 mb-1.5">
              Maximum LTC withdrawal
            </label>
            <Input
              type="number"
              step="0.00000001"
              placeholder="No limit"
              value={limits.withdrawalLimitLtc}
              onChange={(e) =>
                setLimits((l) => ({ ...l, withdrawalLimitLtc: e.target.value }))
              }
              disabled={!loaded}
              className="font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-white/50 mb-1.5">
              Maximum SOL withdrawal
            </label>
            <Input
              type="number"
              step="0.00000001"
              placeholder="No limit"
              value={limits.withdrawalLimitSol}
              onChange={(e) =>
                setLimits((l) => ({ ...l, withdrawalLimitSol: e.target.value }))
              }
              disabled={!loaded}
              className="font-mono"
            />
          </div>
        </div>

        {/* Whitelist */}
        <div className="glass-panel p-6 md:p-7 space-y-5">
          <div className="flex items-center gap-2">
            <Lock size={18} className="text-emerald-400" />
            <h2 className="text-sm font-semibold text-white uppercase tracking-wider">
              Address Whitelist
            </h2>
          </div>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm text-white font-medium">
                Only send to saved contacts
              </p>
              <p className="text-xs text-white/40 mt-1">
                When enabled, withdrawals are rejected unless the recipient is in
                your Contacts.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={limits.whitelistOnly}
              onClick={() => save({ whitelistOnly: !limits.whitelistOnly })}
              disabled={!loaded || saving}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors ${
                limits.whitelistOnly
                  ? 'bg-emerald-500'
                  : 'bg-white/15'
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                  limits.whitelistOnly ? 'translate-x-5' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Security note */}
        <div className="glass-panel p-6 flex items-start gap-3">
          <Shield size={18} className="text-emerald-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-white/50 leading-relaxed">
            Private keys stay encrypted at rest and never leave the server.
            Limits and whitelist are enforced server-side before any transaction
            is broadcast.
          </p>
        </div>

        {(limits.withdrawalLimitLtc || limits.withdrawalLimitSol) && (
          <Button
            onClick={() =>
              save({ withdrawalLimitLtc: '', withdrawalLimitSol: '' })
            }
            disabled={saving || !loaded}
            variant="outline"
            className="w-full"
          >
            <Check size={16} className="mr-2" />
            Clear all limits
          </Button>
        )}
      </div>
    </DashboardPageShell>
  )
}
