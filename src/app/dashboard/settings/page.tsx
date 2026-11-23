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
import { useNotifications } from '@/lib/notifications'
import { copyText } from '@/lib/clipboard'
import { FiatToggle } from '@/components/wallet/FiatToggle'
import {
  Shield,
  AlertCircle,
  Loader2,
  Check,
  KeyRound,
  Lock,
  Download,
  Copy,
  Eye,
  EyeOff,
  Bell,
  TrendingUp,
} from 'lucide-react'

interface ExportedWallet {
  ltcAddress: string
  ltcWif: string | null
  solAddress: string | null
  solSecret: string | null
}

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
  const { prefs, updatePrefs } = useNotifications()

  const [limits, setLimits] = useState<SettingsState>({
    withdrawalLimitLtc: '',
    withdrawalLimitSol: '',
    whitelistOnly: false,
  })
  const [saving, setSaving] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [exportData, setExportData] = useState<ExportedWallet | null>(null)
  const [exporting, setExporting] = useState(false)
  const [showKey, setShowKey] = useState(false)
  const [priceAlertInput, setPriceAlertInput] = useState('')
  const [priceAlertSaved, setPriceAlertSaved] = useState<number | null>(null)

  // Price alert stored in localStorage (checked by the dashboard price loader).
  const PRICE_ALERT_KEY = 'bw_price_alert_inr'
  const savePriceAlert = (v: number) => {
    try {
      window.localStorage.setItem(PRICE_ALERT_KEY, String(v))
    } catch {
      // ignore
    }
  }
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(PRICE_ALERT_KEY)
      const v = raw ? Number(raw) : null
      if (v != null && isFinite(v)) {
        setPriceAlertSaved(v)
        setPriceAlertInput(String(v))
      }
    } catch {
      // ignore
    }
  }, [])

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

  const exportWallet = async () => {
    setExporting(true)
    const token = await getAccessToken()
    if (!token) {
      setExporting(false)
      return
    }
    try {
      const res = await fetch('/api/wallet/export', {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast(payload.error || 'Could not export wallet')
        setExporting(false)
        return
      }
      setExportData(payload.wallet as ExportedWallet)
      setShowKey(false)
    } catch {
      toast('Could not export wallet')
    } finally {
      setExporting(false)
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

        {/* Notification preferences */}
        <div className="glass-panel p-6 md:p-7 space-y-5">
          <div className="flex items-center gap-2">
            <Bell size={18} className="text-emerald-400" />
            <h2 className="text-sm font-semibold text-white uppercase tracking-wider">
              Notifications
            </h2>
          </div>
          <div className="space-y-3">
            <PrefRow
              label="Low balance alerts"
              desc="Warn when your balance drops below a threshold"
              on={prefs.lowBalance}
              onToggle={() => updatePrefs({ lowBalance: !prefs.lowBalance })}
            />
            <PrefRow
              label="Deposit received"
              desc="Notify when a deposit is confirmed"
              on={prefs.depositReceived}
              onToggle={() => updatePrefs({ depositReceived: !prefs.depositReceived })}
            />
            <PrefRow
              label="Withdrawal sent"
              desc="Notify when a withdrawal is broadcast"
              on={prefs.withdrawalSent}
              onToggle={() => updatePrefs({ withdrawalSent: !prefs.withdrawalSent })}
            />
            <PrefRow
              label="Price alerts"
              desc="Notify when a price alert target is crossed"
              on={prefs.priceAlert}
              onToggle={() => updatePrefs({ priceAlert: !prefs.priceAlert })}
            />
          </div>
        </div>

        {/* Price alert */}
        <div className="glass-panel p-6 md:p-7 space-y-5">
          <div className="flex items-center gap-2">
            <TrendingUp size={18} className="text-emerald-400" />
            <h2 className="text-sm font-semibold text-white uppercase tracking-wider">
              Price Alert
            </h2>
          </div>
          <p className="text-xs text-white/40">
            Set a target LTC price in INR. You'll be notified when the price
            reaches it (checked when you open the dashboard).
          </p>
          <div>
            <label className="block text-xs font-medium text-white/50 mb-1.5">
              Notify me when LTC reaches (₹)
            </label>
            <Input
              type="number"
              step="0.01"
              placeholder="e.g. 4000"
              value={priceAlertInput}
              onChange={(e) => setPriceAlertInput(e.target.value)}
              className="font-mono"
            />
          </div>
          {priceAlertSaved != null && (
            <p className="text-xs text-emerald-400/80">
              Alert set at ₹{priceAlertSaved.toFixed(2)} — you'll be notified
              when LTC reaches it.
            </p>
          )}
          <Button
            onClick={() => {
              const v = parseFloat(priceAlertInput)
              if (!isFinite(v) || v <= 0) {
                toast('Enter a valid price')
                return
              }
              setPriceAlertSaved(v)
              savePriceAlert(v)
              toast('Price alert saved')
            }}
            variant="outline"
            className="w-full"
          >
            Save price alert
          </Button>
        </div>

        {/* Export / backup wallet */}
        <div className="glass-panel p-6 md:p-7 space-y-5">
          <div className="flex items-center gap-2">
            <Download size={18} className="text-emerald-400" />
            <h2 className="text-sm font-semibold text-white uppercase tracking-wider">
              Export Wallet Backup
            </h2>
          </div>
          <p className="text-xs text-white/40 leading-relaxed">
            Download your private key to back up or recover your funds. Keep it
            safe — anyone with this key controls your wallet. Never share it or
            commit it anywhere.
          </p>
          <Button
            onClick={exportWallet}
            disabled={exporting}
            variant="outline"
            className="w-full"
          >
            {exporting ? (
              <>
                <Loader2 size={16} className="mr-2 animate-spin" />
                Fetching key…
              </>
            ) : (
              <>
                <Download size={16} className="mr-2" />
                Export private key
              </>
            )}
          </Button>
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

      {/* Export modal */}
      {exportData && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={() => setExportData(null)}
        >
          <div
            className="glass-panel p-8 max-w-lg w-full relative overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-48 h-48 rounded-full bg-white/5 blur-3xl pointer-events-none" />
            <div className="relative z-10 space-y-5">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                  <Download size={20} className="text-emerald-400" />
                </div>
                <h2 className="text-lg font-bold text-white">Wallet Backup</h2>
              </div>

              <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3">
                <p className="text-xs text-rose-300 leading-relaxed flex items-start gap-1.5">
                  <AlertCircle size={13} className="flex-shrink-0 mt-0.5" />
                  This is your private key. Anyone with it controls your funds.
                  Store it safely and never share it.
                </p>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-4">
                <div>
                  <label className="block text-[10px] text-white/40 uppercase tracking-wider mb-1">
                    LTC Address
                  </label>
                  <div className="flex items-center gap-2">
                    <Input value={exportData.ltcAddress} readOnly className="font-mono text-xs" />
                    <button
                      type="button"
                      onClick={async () => {
                        const ok = await copyText(exportData.ltcAddress)
                        toast(ok ? 'Address copied' : 'Copy failed')
                      }}
                      className="flex-shrink-0 text-white/40 hover:text-white"
                    >
                      <Copy size={14} />
                    </button>
                  </div>
                </div>

                {exportData.ltcWif && (
                  <div>
                    <label className="block text-[10px] text-white/40 uppercase tracking-wider mb-1">
                      LTC Private Key (WIF)
                    </label>
                    <div className="flex items-center gap-2">
                      <Input
                        value={showKey ? exportData.ltcWif : '••••••••••••••••••••'}
                        readOnly
                        className="font-mono text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => setShowKey((s) => !s)}
                        className="flex-shrink-0 text-white/40 hover:text-white"
                      >
                        {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          if (exportData.ltcWif) {
                            const ok = await copyText(exportData.ltcWif)
                            toast(ok ? 'WIF copied' : 'Copy failed')
                          }
                        }}
                        className="flex-shrink-0 text-white/40 hover:text-white"
                      >
                        <Copy size={14} />
                      </button>
                    </div>
                  </div>
                )}

                {exportData.solSecret && (
                  <div>
                    <label className="block text-[10px] text-white/40 uppercase tracking-wider mb-1">
                      SOL Secret Key (base64)
                    </label>
                    <div className="flex items-center gap-2">
                      <Input
                        value={showKey ? exportData.solSecret : '••••••••••••••••••••'}
                        readOnly
                        className="font-mono text-xs"
                      />
                      <button
                        type="button"
                        onClick={async () => {
                          if (exportData.solSecret) {
                            await copyText(exportData.solSecret)
                          }
                        }}
                        className="flex-shrink-0 text-white/40 hover:text-white"
                      >
                        <Copy size={14} />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setExportData(null)}
                >
                  Close
                </Button>
                <Button
                  className="w-full"
                  onClick={() => {
                    const text = [
                      '# BlueWallet Backup',
                      `LTC Address: ${exportData.ltcAddress}`,
                      `LTC WIF: ${exportData.ltcWif ?? '(none)'}`,
                      `SOL Address: ${exportData.solAddress ?? '(none)'}`,
                      `SOL Secret: ${exportData.solSecret ?? '(none)'}`,
                    ].join('\n')
                    const blob = new Blob([text], { type: 'text/plain' })
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = `bluewallet-backup-${Date.now()}.txt`
                    a.click()
                    URL.revokeObjectURL(url)
                  }}
                >
                  <Download size={16} className="mr-2" />
                  Download backup
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardPageShell>
  )
}

function PrefRow({
  label,
  desc,
  on,
  onToggle,
}: {
  label: string
  desc: string
  on: boolean
  onToggle: () => void
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm text-white font-medium">{label}</p>
        <p className="text-xs text-white/40 mt-0.5">{desc}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        onClick={onToggle}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors ${
          on ? 'bg-emerald-500' : 'bg-white/15'
        }`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
            on ? 'translate-x-5' : 'translate-x-0.5'
          }`}
        />
      </button>
    </div>
  )
}
