import { NextResponse } from 'next/server'
import { adminClient, bearerToken, getUserFromToken } from '@/lib/api'
import { getUnspent } from '@/lib/blockchain'

const LITOSHI_PER_LTC = 100_000_000 // 1 LTC = 1e8 litoshis

/**
 * GET /api/wallet/fee — returns the estimated network fee and the maximum
 * sendable amount (on-chain balance minus fee) for the signed-in wallet.
 * Used by the withdraw page so the "Max" button sets a fee-adjusted amount
 * instead of the full balance.
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
    const { data: wallet, error: walletError } = await supabase
      .from('wallets')
      .select('ltc_address, balance_ltc')
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

    const utxos = await getUnspent(wallet.ltc_address)
    const totalInput = utxos.reduce((s, u) => s + u.satoshis, 0)
    const totalInputLtc = totalInput / LITOSHI_PER_LTC

    // Fee estimate: ~1 litoshi/byte (Litecoin fees are very low — keeps the
    // withdrawal fee minimal while still confirming in reasonable time).
    // Floor of 300 litoshi covers small transactions.
    const approxSize = utxos.length * 148 + 2 * 34 + 10
    const fee = Math.max(300, approxSize * 1)

    const balance = Number(wallet.balance_ltc ?? 0)
    const feeLtc = fee / LITOSHI_PER_LTC
    const maxSendable = Math.max(0, Math.min(balance, totalInputLtc - feeLtc))

    return NextResponse.json({
      fee: feeLtc,
      maxSendable,
      balance,
      utxoCount: utxos.length,
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
