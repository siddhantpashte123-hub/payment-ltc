import { NextResponse } from 'next/server'
import { adminClient, bearerToken, getUserFromToken } from '@/lib/api'
import {
  getTxOnChainDetail,
  estimateConfirmationTime,
  explorerTxUrl,
} from '@/lib/blockchain'

/**
 * Single transaction with fresh on-chain detail (confirmations, block height,
 * fee, estimated confirmation time). Used by the transaction detail page so it
 * always shows accurate, up-to-date on-chain info without loading the whole
 * wallet.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const supabase = adminClient()
    const { id: txId } = await params

    // Load the transaction row for this user's wallet.
    const { data: tx, error: txError } = await supabase
      .from('transactions')
      .select(
        'id, type, amount_ltc, status, counterparty_address, counterparty_name, note, tx_hash, confirmations, block_height, fee_ltc, estimated_time, created_at'
      )
      .eq('wallet_id', user.id)
      .eq('id', txId)
      .maybeSingle()

    if (txError) {
      return NextResponse.json(
        { error: `Transaction lookup failed: ${txError.message}` },
        { status: 500 }
      )
    }

    if (!tx) {
      return NextResponse.json(
        { error: 'Transaction not found in your history.' },
        { status: 404 }
      )
    }

    // Fetch live on-chain detail for accurate confirmations / fee / block.
    let onchain: Awaited<ReturnType<typeof getTxOnChainDetail>> | null = null
    if (tx.tx_hash) {
      try {
        onchain = await getTxOnChainDetail(tx.tx_hash)
      } catch (e) {
        // Non-fatal — fall back to stored values below.
        console.error('On-chain detail fetch failed:', e)
      }
    }

    const confirmations = onchain?.confirmations ?? tx.confirmations ?? 0
    const blockHeight = onchain?.blockHeight ?? tx.block_height ?? null
    const feeLtc =
      onchain?.feeLtc != null
        ? onchain.feeLtc
        : tx.fee_ltc != null
        ? Number(tx.fee_ltc)
        : 0
    const feeLitoshi = Math.round(feeLtc * 100_000_000)
    const estimatedTime = estimateConfirmationTime(
      confirmations,
      feeLitoshi
    )

    // Persist refreshed confirmations/block/fee so the dashboard list stays
    // accurate between loads (best-effort).
    if (onchain) {
      await supabase
        .from('transactions')
        .update({
          confirmations: onchain.confirmations,
          block_height: onchain.blockHeight,
          fee_ltc: onchain.feeLtc,
          estimated_time: estimatedTime,
        })
        .eq('id', tx.id)
    }

    return NextResponse.json({
      id: tx.id,
      type: tx.type,
      amount: Math.abs(Number(tx.amount_ltc)),
      status: tx.status,
      address: tx.counterparty_address ?? '',
      name: tx.counterparty_name ?? undefined,
      note: tx.note ?? undefined,
      created_at: tx.created_at,
      tx_hash: tx.tx_hash ?? undefined,
      explorer: tx.tx_hash ? explorerTxUrl(tx.tx_hash) : undefined,
      confirmations,
      block_height: blockHeight,
      fee_ltc: feeLtc,
      fee_litoshi: feeLitoshi,
      estimated_time: estimatedTime,
      onchain_status: onchain?.status ?? null,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Transaction API error:', error)
    return NextResponse.json(
      { error: `Server error: ${message}` },
      { status: 500 }
    )
  }
}
