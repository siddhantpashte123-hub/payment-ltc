'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Send, AlertCircle } from 'lucide-react'
import { useState } from 'react'

interface SendFormProps {
  onSend: (data: { to: string; amount: number }) => void
  balance: number
}

export function SendForm({ onSend, balance }: SendFormProps) {
  const [to, setTo] = useState('')
  const [amount, setAmount] = useState('')
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const addr = to.trim()
    const amt = parseFloat(amount)

    if (!addr) {
      setError('Please enter a recipient LTC address')
      return
    }
    if (!amt || amt <= 0) {
      setError('Please enter a valid amount')
      return
    }
    if (amt > balance) {
      setError('Insufficient balance')
      return
    }

    setSending(true)
    onSend({ to: addr, amount: amt })
  }

  return (
    <form onSubmit={handleSubmit} className="glass-panel p-6 space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-3">
          Send LTC
        </h3>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-white/50 mb-1.5">
              Recipient Address
            </label>
            <Input
              placeholder="LTC address..."
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-white/50 mb-1.5">
                Amount ({'LTC'})
              </label>
              <Input
                type="number"
                step="0.00000001"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="flex items-end gap-2">
              <span className="text-white/40">Max: {balance.toFixed(8)}</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setAmount(balance.toFixed(8))}
              >
                Max
              </Button>
            </div>
          </div>
          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-rose-500/10 border border-rose-500/20 px-3 py-2">
              <AlertCircle size={16} className="text-rose-400" />
              <span className="text-xs text-rose-300">{error}</span>
            </div>
          )}
        </div>
      </div>
      <Button
        type="submit"
        className="w-full"
        disabled={sending || !to || !amount}
      >
        {sending ? (
          <>
            <Send size={18} className="animate-spin" /> Sending...
          </>
        ) : (
          <>
            <Send size={18} /> Send LTC
          </>
        )}
      </Button>
    </form>
  )
}
