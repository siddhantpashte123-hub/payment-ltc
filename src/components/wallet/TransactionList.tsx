'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatFiat } from '@/lib/fiat'
import {
  ArrowUpRight,
  ArrowDownLeft,
  ExternalLink,
  User,
  Search,
  Download,
  Inbox,
  ChevronDown,
  StickyNote,
  Layers,
} from 'lucide-react'

interface Transaction {
  id: string
  type: 'deposit' | 'send'
  amount: number
  status: 'completed' | 'pending' | 'failed'
  address: string
  name?: string
  note?: string
  created_at: string
  tx_hash?: string
  explorer?: string
  confirmations?: number
}

interface TransactionListProps {
  transactions: Transaction[]
  pricePerCoin?: number
  fiatCurrency?: 'INR' | 'USD'
  unit?: string
}

type FilterType = 'all' | 'deposit' | 'send'
type SortType = 'newest' | 'oldest' | 'amount'
type PeriodType = 'all' | '7d' | '30d' | '90d'

// Guard against null/undefined amounts from the DB so .toFixed never throws.
const safeAmount = (a: number | null | undefined): number =>
  typeof a === 'number' && Number.isFinite(a) ? a : 0

export function TransactionList({
  transactions,
  pricePerCoin,
  fiatCurrency = 'INR',
  unit = 'LTC',
}: TransactionListProps) {
  const router = useRouter()
  const [filter, setFilter] = useState<FilterType>('all')
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<SortType>('newest')
  const [period, setPeriod] = useState<PeriodType>('all')
  const [visible, setVisible] = useState(10)

  const filtered = useMemo(() => {
    const cutoff =
      period === '7d'
        ? Date.now() - 7 * 86400000
        : period === '30d'
        ? Date.now() - 30 * 86400000
        : period === '90d'
        ? Date.now() - 90 * 86400000
        : 0

    let list = transactions.filter((tx) => {
      if (filter !== 'all' && tx.type !== filter) return false
      if (cutoff && new Date(tx.created_at).getTime() < cutoff) return false
      if (!query.trim()) return true
      const q = query.trim().toLowerCase()
      return (
        (tx.name || '').toLowerCase().includes(q) ||
        (tx.address || '').toLowerCase().includes(q) ||
        (tx.tx_hash || '').toLowerCase().includes(q) ||
        (tx.note || '').toLowerCase().includes(q)
      )
    })

    list = [...list].sort((a, b) => {
      if (sort === 'newest') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      }
      if (sort === 'oldest') {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      }
      // amount
      return b.amount - a.amount
    })

    return list
  }, [transactions, filter, query, sort, period])

  const shown = filtered.slice(0, visible)

  const exportCsv = () => {
    const header = [
      'Type',
      `Amount (${unit})`,
      `Amount (${fiatCurrency})`,
      'Counterparty',
      'Address',
      'Note',
      'Tx Hash',
      'Explorer',
      'Status',
      'Date',
    ]
    const rows = filtered.map((tx) => [
      tx.type,
      safeAmount(tx.amount).toFixed(8),
      pricePerCoin ? formatFiat(safeAmount(tx.amount) * pricePerCoin, fiatCurrency) : '',
      tx.name || '',
      tx.address,
      tx.note || '',
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
    <div className="premium-card p-6 md:p-8">
      {/* Header with export */}
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <h3 className="text-sm font-semibold gradient-text uppercase tracking-wider">
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

      {/* Filter + search + sort */}
      {transactions.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="flex gap-2">
            {(['all', 'deposit', 'send'] as FilterType[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={
                  'px-4 py-2 rounded-lg text-xs font-medium transition-all capitalize ' +
                  (filter === f
                    ? 'bg-white text-black'
                    : 'bg-white/5 text-white/50 border border-white/10 hover:bg-white/10')
                }
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
          <div className="relative">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortType)}
              className="h-10 rounded-lg bg-white/5 border border-white/10 pl-3 pr-8 text-xs text-white focus:outline-none focus:ring-1 focus:ring-white appearance-none"
            >
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="amount">Highest amount</option>
            </select>
            <ChevronDown
              size={14}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none"
            />
          </div>
          <div className="relative">
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as PeriodType)}
              className="h-10 rounded-lg bg-white/5 border border-white/10 pl-3 pr-8 text-xs text-white focus:outline-none focus:ring-1 focus:ring-white appearance-none"
            >
              <option value="all">All time</option>
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
            </select>
            <ChevronDown
              size={14}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none"
            />
          </div>
        </div>
      )}

      {shown.length === 0 ? (
        <div className="p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
            <Inbox size={28} className="text-white/30" />
          </div>
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
          {shown.map((tx) => {
            const isDeposit = tx.type === 'deposit'
            return (
              <button
                key={tx.id}
                onClick={() => router.push(`/dashboard/transactions/${tx.id}`)}
                className="w-full flex items-center gap-4 border-b border-white/5 pb-5 last:border-0 last:pb-0 text-left transition-colors hover:bg-white/5 -mx-2 px-2 rounded-lg"
              >
                <div
                  className={
                    'flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] ' +
                    (isDeposit
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-white/5 text-white/50 border border-white/10')
                  }
                >
                  {isDeposit ? <ArrowDownLeft size={20} /> : <ArrowUpRight size={20} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {isDeposit ? 'Deposit received' : `${unit} sent`}
                  </p>
                  <p className="text-xs text-white/40 truncate flex items-center gap-1">
                    <User size={11} className="flex-shrink-0" />
                    {tx.name || tx.address || '—'}
                  </p>
                  {tx.note && (
                    <p className="text-xs text-white/30 truncate flex items-center gap-1 mt-0.5">
                      <StickyNote size={10} className="flex-shrink-0" />
                      {tx.note}
                    </p>
                  )}
                  <p className="text-xs text-white/40 mt-1">
                    {new Date(tx.created_at).toLocaleString()}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <span
                    className={
                      'font-mono text-sm font-bold ' +
                      (isDeposit ? 'text-emerald-400' : 'text-white')
                    }
                  >
                    {isDeposit ? '+' : '−'}
                    {safeAmount(tx.amount).toFixed(8)} {unit}
                  </span>
                  {pricePerCoin !== undefined && (
                    <span className="text-[10px] text-white/40">
                      ≈ {formatFiat(safeAmount(tx.amount) * pricePerCoin, fiatCurrency)}
                    </span>
                  )}
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
                    {tx.confirmations != null && tx.confirmations > 0 && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400/80">
                        <Layers size={11} />
                        {tx.confirmations} conf
                      </span>
                    )}
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

      {/* Load more */}
      {visible < filtered.length && (
        <div className="mt-6 text-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setVisible((v) => v + 10)}
          >
            Load more ({filtered.length - visible} remaining)
          </Button>
        </div>
      )}
    </div>
  )
}
