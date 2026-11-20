'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  ArrowUpRight,
  ArrowDownLeft,
  Clock,
  ExternalLink,
  User,
  Search,
  Download,
  Inbox,
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

type FilterType = 'all' | 'deposit' | 'send'

export function TransactionList({ transactions }: TransactionListProps) {
  const router = useRouter()
  const [filter, setFilter] = useState<FilterType>('all')
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    return transactions.filter((tx) => {
      if (filter !== 'all' && tx.type !== filter) return false
      if (!query.trim()) return true
      const q = query.trim().toLowerCase()
      return (
        tx.name?.toLowerCase().includes(q) ||
        tx.address.toLowerCase().includes(q) ||
        (tx.tx_hash || '').toLowerCase().includes(q)
      )
    })
  }, [transactions, filter, query])

  const exportCsv = () => {
    const header = [
      'Type',
      'Amount (LTC)',
      'Counterparty',
      'Address',
      'Tx Hash',
      'Explorer',
      'Status',
      'Date',
    ]
    const rows = transactions.map((tx) => [
      tx.type,
      tx.amount.toFixed(8),
      tx.name || '',
      tx.address,
      tx.tx_hash || '',
      tx.explorer || '',
      tx.status,
      new Date(tx.created_at).toISOString(),
    ])
    const csv = [header, ...rows]
      .map((row) =>
        row
          .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
          .join(',')
      )
      .join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `bluewallet-transactions-${Date.now()}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="glass-panel p-6 md:p-8">
      {/* Header with export */}
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <h3 className="text-sm font-semibold text-white uppercase tracking-wider">
          Transaction History
        </h3>
        {transactions.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={exportCsv}
            className="h-9 px-3"
          >
            <Download size={14} className="mr-1.5" />
            Export CSV
          </Button>
        )}
      </div>

      {/* Filter + search */}
      {transactions.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="flex gap-2">
            {(['all', 'deposit', 'send'] as FilterType[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-lg text-xs font-medium transition-all capitalize ${
                  filter === f
                    ? 'bg-white text-black'
                    : 'bg-white/5 text-white/50 border border-white/10 hover:bg-white/10'
                }`}
              >
                {f === 'all' ? 'All' : f === 'deposit' ? 'Deposits' : 'Withdrawals'}
              </button>
            ))}
          </div>
          <div className="relative sm:max-w-xs flex-1">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40"
            />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name, address, tx hash…"
              className="w-full h-10 rounded-lg bg-white/5 border border-white/10 pl-9 pr-3 text-xs text-white placeholder-white/40 focus:outline-none focus:ring-1 focus:ring-white"
            />
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="p-12 text-center">
          <Inbox size={32} className="mx-auto mb-4 text-white/20" />
          <h3 className="text-white font-medium">
            {transactions.length === 0
              ? 'No transactions yet'
              : 'No transactions match your filter'}
          </h3>
          <p className="text-white/50 text-sm mt-1">
            {transactions.length === 0
              ? 'Your deposit and withdrawal history will appear here.'
              : 'Try a different filter or search term.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((tx) => {
            const isDeposit = tx.type === 'deposit'
            return (
            <button
              key={tx.id}
              onClick={() => router.push(`/dashboard/transactions/${tx.id}`)}
              className="w-full flex items-center gap-4 border-b border-white/5 pb-5 last:border-0 last:pb-0 text-left transition-colors hover:bg-white/5 -mx-2 px-2 rounded-lg"
            >
              <div
                className={
                  'flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center ' +
                  (isDeposit
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-white/5 text-white/40 border border-white/10')
                }
              >
                {isDeposit ? <ArrowUpRight size={20} /> : <ArrowDownLeft size={20} />}
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
                  className={
                    'font-mono text-sm font-bold ' +
                    (tx.type === 'deposit' ? 'text-emerald-400' : 'text-white')
                  }
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
                    <span className="inline-flex items-center gap-1 text-[10px] text-white/40">
                      <ExternalLink size={11} />
                      View
                    </span>
                  )}
                </div>
              </div>
            </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
