'use client'

import {
  DashboardHeader,
  DashboardError,
  DashboardLoading,
  DashboardPageShell,
} from '@/components/wallet/DashboardShell'
import { useWallet } from '@/components/wallet/DashboardShell'
import {
  HelpCircle,
  ChevronDown,
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
  Shield,
  Coins,
} from 'lucide-react'
import { useState } from 'react'

const FAQ = [
  {
    icon: ArrowDownLeft,
    q: 'How do I deposit LTC into my wallet?',
    a: 'Go to the Deposit page, copy your wallet address (or show the QR code), and send LTC to it from any exchange or wallet. The deposit is credited automatically once the on-chain transaction confirms — usually within a few minutes. You can use the "Check now" button on the deposit receipt to verify instantly.',
  },
  {
    icon: ArrowUpRight,
    q: 'How do I withdraw / send LTC?',
    a: 'Open the Withdraw page, enter the recipient address and amount, pick a fee priority (Economy, Normal, or Fast), and confirm. The transaction is broadcast on-chain and the recipient receives the full amount — the network fee is paid separately from your balance.',
  },
  {
    icon: RefreshCw,
    q: 'Why is my deposit still showing as pending (yellow)?',
    a: 'A deposit is only credited once the on-chain transaction has at least one block confirmation. Litecoin blocks take ~2.5 minutes, so it can take a few minutes. Use "Check now" to check immediately, or just leave the page — the deposit is credited automatically once confirmed.',
  },
  {
    icon: Shield,
    q: 'How is my wallet secured?',
    a: 'Private keys are encrypted at rest (AES-256-GCM) and never leave the server in plaintext. You can set withdrawal limits and an address whitelist in Security settings. For a full backup, use "Export Wallet Backup" — store the private key safely and never share it.',
  },
  {
    icon: Coins,
    q: 'What are the network fees?',
    a: 'Network fees are paid to the network to process your transaction. You can choose the fee priority on the Withdraw page: Economy is cheapest but confirms slower, Normal is balanced, and Fast prioritizes confirmation. The fee is shown before you confirm.',
  },
  {
    icon: HelpCircle,
    q: 'I lost access to my wallet — can I recover my funds?',
    a: 'If you have your exported private key (from Security → Export Wallet Backup), you can restore your funds in any Litecoin wallet. If you never exported it and no longer have the server secret key, the funds cannot be recovered — always back up your key.',
  },
]

export default function HelpPage() {
  const { loading, error } = useWallet()
  const [open, setOpen] = useState<number | null>(0)

  if (loading) return <DashboardLoading />

  return (
    <DashboardPageShell>
      <DashboardHeader
        title="Help & FAQ"
        subtitle="How to use your wallet and common questions"
        showBack
      />

      {error && <DashboardError error={error} />}

      <div className="max-w-2xl mx-auto space-y-3">
        {FAQ.map((item, i) => {
          const Icon = item.icon
          const isOpen = open === i
          return (
            <div
              key={i}
              className="glass-panel overflow-hidden"
            >
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : i)}
                className="w-full flex items-center justify-between gap-4 p-6 text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0 text-emerald-400">
                    <Icon size={18} />
                  </div>
                  <span className="text-sm font-semibold text-white">
                    {item.q}
                  </span>
                </div>
                <ChevronDown
                  size={18}
                  className={`text-white/40 transition-transform flex-shrink-0 ${
                    isOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {isOpen && (
                <div className="px-6 pb-6 pl-[72px]">
                  <p className="text-xs text-white/60 leading-relaxed">
                    {item.a}
                  </p>
                </div>
              )}
            </div>
          )
        })}

        <div className="glass-panel p-6 mt-6 flex items-start gap-3">
          <HelpCircle
            size={18}
            className="text-emerald-400 flex-shrink-0 mt-0.5"
          />
          <p className="text-xs text-white/50 leading-relaxed">
            Still need help? Your private keys are encrypted and stored on the
            server — for anything urgent, back up your key first using
            Security → Export Wallet Backup.
          </p>
        </div>
      </div>
    </DashboardPageShell>
  )
}
