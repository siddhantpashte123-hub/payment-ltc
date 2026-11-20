import { NextResponse } from 'next/server'
import { adminClient, bearerToken, getUserFromToken } from '@/lib/api'
import { explorerAddressUrl } from '@/lib/blockchain'

/**
 * POST /api/wallet/deposit
 * Records a deposit intent (pending) for the amount + address the user
 * entered. Real on-chain crediting happens automatically via the SoChain
 * sync in /api/wallet GET when the actual incoming transaction confirms.
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

    let body: { amount?: unknown; address?: unknown; name?: unknown }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const amount = Number(body.amount)
    const address =
      typeof body.address === 'string' ? body.address.trim() : ''
    const name =
      typeof body.name === 'string' && body.name.trim().length <= 60
        ? body.name.trim()
        : null

    if (!isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        { error: 'Please enter a valid deposit amount' },
        { status: 400 }
      )
    }
    if (!address) {
      return NextResponse.json(
        { error: 'Please enter the deposit address' },
        { status: 400 }
      )
    }

    const supabase = adminClient()

    // Ensure wallet exists (same as GET /api/wallet).
    const { data: wallet, error: walletError } = await supabase
      .from('wallets')
      .select('ltc_address')
      .eq('user_id', user.id)
      .maybeSingle()

    if (walletError) {
      return NextResponse.json(
        { error: `Wallet lookup failed: ${walletError.message}` },
        { status: 500 }
      )
    }
    if (!wallet) {
      return NextResponse.json(
        { error: 'Wallet not found — sign in again to create it.' },
        { status: 404 }
      )
    }

    const now = new Date().toISOString()

    // Record the deposit as pending. The SoChain sync in /api/wallet GET
    // will credit the balance and add the confirmed tx once the real
    // on-chain payment arrives.
    const { error: insertError } = await supabase.from('transactions').insert({
      wallet_id: user.id,
      type: 'deposit',
      amount_ltc: amount,
      status: 'pending',
      counterparty_address: address,
      counterparty_name: name,
      created_at: now,
    })
    if (insertError) {
      return NextResponse.json(
        { error: `Could not record deposit: ${insertError.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      amount,
      address,
      explorer: explorerAddressUrl(address),
      message: `Deposit of ${amount} LTC submitted. It will be credited once the on-chain transaction confirms.`,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Deposit API error:', error)
    return NextResponse.json(
      { error: `Server error: ${message}` },
      { status: 500 }
    )
  }
}
