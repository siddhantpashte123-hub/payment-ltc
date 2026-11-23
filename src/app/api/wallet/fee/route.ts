import { NextResponse } from 'next/server'
import { adminClient, bearerToken, getUserFromToken } from '@/lib/api'
import { getUnspent } from '@/lib/blockchain'
import { estimateFeeLitoshi, FEE_TIERS } from '@/lib/fees'
import { SOL_FEE_LTC } from '@/lib/solana'

const LITOSHI_PER_LTC = 100_000_000 // 1 LTC = 1e8 litoshis

/**
 * GET /api/wallet/fee?coin=ltc|sol — returns the estimated network fee and the
 * maximum sendable amount (on-chain balance minus fee) for the signed-in
 * wallet. Used by the withdraw page so the "Max" button sets a fee-adjusted
 * amount instead of the full balance.
 */
export async function GET(request: Request) {
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
    const url = new URL(request.url)
    const coin = url.searchParams.get('coin') === 'sol' ? 'sol' : 'ltc'

    const walletCols =
      coin === 'sol'
        ? 'sol_address, sol_balance'
        : 'ltc_address, balance_ltc'
    const { data: wallet, error: walletError } = await supabase
      .from('wallets')
      .select(walletCols)
      .eq('user_id', user.id)
      .maybeSingle()

    if (walletError) {
      return NextResponse.json(
        { error: `Wallet lookup failed: ${walletError.message}` },
        { status: 500 }
      )
    }
    if (!wallet) {
      return NextResponse.json({ error: 'Wallet not found' }, { status: 404 })
    }

    // Solana has a fixed base network fee.
    if (coin === 'sol') {
      const balance = Number((wallet as { sol_balance?: number }).sol_balance ?? 0)
      const maxSendable = Math.max(0, balance - SOL_FEE_LTC)
      return NextResponse.json({
        fee: SOL_FEE_LTC,
        maxSendable,
        balance,
        utxoCount: 0,
        coin,
      })
    }

    // Litecoin: estimate from UTXOs, with fee-tier options.
    const utxos = await getUnspent((wallet as { ltc_address: string }).ltc_address)
    const totalInput = utxos.reduce((s, u) => s + u.satoshis, 0)
    const totalInputLtc = totalInput / LITOSHI_PER_LTC

    const balance = Number((wallet as { balance_ltc?: number }).balance_ltc ?? 0)

    // Build fee options for each tier (litoshi -> LTC).
    const tiers: Record<string, { fee: number; maxSendable: number }> = {}
    for (const [tier, def] of Object.entries(FEE_TIERS)) {
      const feeLitoshi = estimateFeeLitoshi(utxos.length, tier as never)
      const feeLtc = feeLitoshi / LITOSHI_PER_LTC
      tiers[tier] = {
        fee: feeLtc,
        maxSendable: Math.max(0, Math.min(balance, totalInputLtc - feeLtc)),
      }
    }
    const defaultFee = tiers.normal.fee

    return NextResponse.json({
      fee: defaultFee,
      maxSendable: tiers.normal.maxSendable,
      balance,
      utxoCount: utxos.length,
      coin,
      tiers,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Fee estimate error:', error)
    return NextResponse.json(
      { error: `Server error: ${message}` },
      { status: 500 }
    )
  }
}
