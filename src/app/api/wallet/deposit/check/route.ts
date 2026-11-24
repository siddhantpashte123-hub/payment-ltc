import { NextResponse } from 'next/server'
import { adminClient, bearerToken, getUserFromToken } from '@/lib/api'
import {
  getRecentTxs,
  getTxDetail,
  getAddressBalance,
} from '@/lib/blockchain'
import { getSolTransactions, getSolBalance } from '@/lib/solana'

/**
 * POST /api/wallet/deposit/check
 * Directly checks the on-chain state for a pending deposit so the deposit
 * page can confirm quickly WITHOUT waiting for the 2-minute staleness gate
 * in /api/wallet. Records the deposit (and credits the balance) the moment
 * a matching confirmed incoming transaction is found on-chain.
 *
 * Supports both LTC and SOL (the previous version only ever checked the LTC
 * address, so SOL deposits never confirmed on the deposit page).
 *
 * Body: { amount: number, coin: 'ltc' | 'sol' }
 */
export async function POST(request: Request) {
  try {
    const token = bearerToken(request)
    if (!token) {
      return NextResponse.json(
        { error: 'Missing access token. Please sign in again.' },
        { status: 401 }
      )
    }

    const user = await getUserFromToken(token)
    if (!user) {
      return NextResponse.json(
        { error: 'Session expired. Please sign in again.' },
        { status: 401 }
      )
    }

    let body: { amount?: unknown; coin?: unknown }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const coin: 'ltc' | 'sol' = body.coin === 'sol' ? 'sol' : 'ltc'
    const amount = Number(body.amount)
    if (!isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        { error: 'Invalid deposit amount' },
        { status: 400 }
      )
    }

    const supabase = adminClient()
    const { data: wallet } = await supabase
      .from('wallets')
      .select('ltc_address, balance_ltc, sol_address, sol_balance')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!wallet) {
      return NextResponse.json({ error: 'Wallet not found' }, { status: 404 })
    }

    let confirmed = false
    let balance = 0

    if (coin === 'ltc') {
      const ltcAddress = (wallet as { ltc_address: string }).ltc_address
      balance = Number((wallet as { balance_ltc?: number }).balance_ltc ?? 0)

      // Direct on-chain check (no staleness gate).
      const txs = await getRecentTxs(ltcAddress)
      for (const tx of txs) {
        if (tx.value_received <= 0 || tx.confirmations <= 0) continue
        if (Math.abs(tx.value_received - amount) > 1e-8) continue

        // Already recorded? If so, it's confirmed.
        const { data: existing } = await supabase
          .from('transactions')
          .select('id')
          .eq('tx_hash', tx.txid)
          .maybeSingle()

        if (!existing) {
          // Record the confirmed deposit + credit balance.
          let counterparty: string | null = null
          try {
            const detail = await getTxDetail(tx.txid)
            counterparty = detail?.inputs?.[0]?.address ?? null
          } catch {
            // Non-fatal
          }
          const { error: insertError } = await supabase
            .from('transactions')
            .insert({
              wallet_id: user.id,
              coin: 'ltc',
              type: 'deposit',
              amount_ltc: tx.value_received,
              status: 'completed',
              counterparty_address: counterparty,
              tx_hash: tx.txid,
              confirmations: tx.confirmations,
              block_height: tx.block ?? null,
            })
          if (!insertError) confirmed = true
        } else {
          confirmed = true
        }
      }

      if (confirmed) {
        // Reconcile balance from on-chain truth.
        try {
          balance = await getAddressBalance(ltcAddress)
          await supabase
            .from('wallets')
            .update({
              balance_ltc: balance,
              last_checked_at: new Date().toISOString(),
            })
            .eq('user_id', user.id)
        } catch {
          // Non-fatal
        }
      }
    } else {
      // SOL deposit check.
      const solAddress = (wallet as { sol_address: string | null }).sol_address
      if (!solAddress) {
        return NextResponse.json({ confirmed, balance }, { status: 200 })
      }
      balance = Number((wallet as { sol_balance?: number }).sol_balance ?? 0)

      const txs = await getSolTransactions(solAddress)
      for (const tx of txs) {
        if (tx.type !== 'deposit' || tx.amount <= 0) continue
        if (Math.abs(tx.amount - amount) > 1e-8) continue

        const { data: existing } = await supabase
          .from('transactions')
          .select('id')
          .eq('tx_hash', tx.signature)
          .maybeSingle()

        if (!existing) {
          const { error: insertError } = await supabase
            .from('transactions')
            .insert({
              wallet_id: user.id,
              coin: 'sol',
              type: 'deposit',
              amount_ltc: tx.amount,
              status: tx.status,
              counterparty_address: tx.counterparty || null,
              tx_hash: tx.signature,
              confirmations: tx.confirmations,
              block_height: tx.blockHeight ?? null,
              fee_ltc: tx.fee,
            })
          if (!insertError) confirmed = true
        } else {
          confirmed = true
        }
      }

      if (confirmed) {
        try {
          balance = await getSolBalance(solAddress)
          await supabase
            .from('wallets')
            .update({
              sol_balance: balance,
              sol_last_checked_at: new Date().toISOString(),
            })
            .eq('user_id', user.id)
        } catch {
          // Non-fatal
        }
      }
    }

    return NextResponse.json({ confirmed, balance })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Deposit check error:', error)
    return NextResponse.json(
      { error: `Server error: ${message}` },
      { status: 500 }
    )
  }
}
