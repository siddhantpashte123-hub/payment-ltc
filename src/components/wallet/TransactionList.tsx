'use client'

import { Badge } from '@/components/ui/badge'
import {
  ArrowUpRight,
  ArrowDownLeft,
  Clock,
  ExternalLink,
  User,
} from 'lucide-react'

interface Transaction {
  id: string
  type: 'deposit' | 'send'
  amount: number
  status: 'completed' | 'pending' | 'failed'
  address: string
  name?: string
  created_at: string
  tx_hash?: string
  explorer?: string
}

interface TransactionListProps {
  transactions: Transaction[]
}

export function TransactionList({ transactions }: TransactionListProps) {
  if (transactions.length === 0) {
    return (
      <div className="glass-panel p-12 text-center">
        <Clock size={32} className="mx-auto mb-4 text-white/20" />
        <h3 className="text-white font-medium">No transactions yet</h3>
        <p className="text-white/50 text-sm mt-1">
          Your deposit and send history will appear here.
        </p>
      </div>
    )
  }

  return (
    <div className="glass-panel p-6 md:p-8">
      <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-6">
        Transaction History
      </h3>
      <div className="space-y-4">
        {transactions.map((tx) => (
          <div
            key={tx.id}
            className="flex items-center gap-4 border-b border-white/5 pb-5 last:border-0 last:pb-0"
          >
            <div
              className={`flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center ${
                tx.type === 'deposit'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-white/5 text-white/40 border border-white/10'
              }`}
            >
              {tx.type === 'deposit' ? (
                <ArrowUpRight size={20} />
              ) : (
                <ArrowDownLeft size={20} />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {tx.type === 'deposit' ? 'Deposit received' : 'LTC sent'}
              </p>
              {/* Counterparty: name if present, else address */}
              <p className="text-xs text-white/40 truncate flex items-center gap-1">
                <User size={11} className="flex-shrink-0" />
                {tx.name || tx.address || '—'}
              </p>
              <p className="text-xs text-white/40 mt-1">
                {new Date(tx.created_at).toLocaleString()}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1.5">
              <span
                className={`font-mono text-sm font-bold ${
                  tx.type === 'deposit' ? 'text-emerald-400' : 'text-white'
                }`}
              >
                {tx.type === 'deposit' ? '+' : '−'}
                {tx.amount.toFixed(8)} LTC
              </span>
              <div className="flex items-center gap-2">
                <Badge
                  variant={
                    tx.status === 'completed'
                      ? 'success'
                      : tx.status === 'pending'
                      ? 'pending'
                      : 'failed'
                  }
                >
                  {tx.status}
                </Badge>
                {tx.explorer && (
                  <a
                    href={tx.explorer}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[10px] text-white/40 hover:text-white/70 transition-colors"
                  >
                    <ExternalLink size={11} />
                    View
                  </a>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
