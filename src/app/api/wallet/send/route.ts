import { NextResponse } from 'next/server'
import { adminClient, bearerToken, getUserFromToken } from '@/lib/api'


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

    let body: { to?: unknown; amount?: unknown }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const to = typeof body.to === 'string' ? body.to.trim() : ''
    const amount = Number(body.amount)
    if (!to || !isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        { error: 'Invalid recipient address or amount' },
        { status: 400 }
      )
    }

    const supabase = adminClient()

    const { data: wallet, error: walletReadError } = await supabase
      .from('wallets')
      .select('balance_ltc')
      .eq('user_id', user.id)
      .maybeSingle()

    if (walletReadError) {
      return NextResponse.json(
        { error: `Wallet lookup failed: ${walletReadError.message}` },
        { status: 500 }
      )
    }

    if (!wallet) {
      return NextResponse.json({ error: 'Wallet not found' }, { status: 404 })
    }

    const balance = Number(wallet.balance_ltc ?? 0)
    if (amount > balance) {
      return NextResponse.json(
        { error: 'Insufficient balance for this transaction' },
        { status: 400 }
      )
    }

    const newBalance = balance - amount
    const now = new Date().toISOString()

    // Deduct balance
    const { error: updateError } = await supabase
      .from('wallets')
      .update({ balance_ltc: newBalance })
      .eq('user_id', user.id)
    if (updateError) {
      return NextResponse.json(
        { error: `Balance update failed: ${updateError.message}` },
        { status: 500 }
      )
    }

    // Record the send transaction
    const { error: insertError } = await supabase.from('transactions').insert({
      wallet_id: user.id,
      type: 'send',
      amount_ltc: -amount,
      status: 'completed',
      counterparty_address: to,
      created_at: now,
    })
    if (insertError) {
      return NextResponse.json(
        { error: `Could not record transaction: ${insertError.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      newBalance,
      message: `Sent ${amount} LTC to ${to}`,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Send API error:', error)
    return NextResponse.json(
      { error: `Server error: ${message}` },
      { status: 500 }
    )
  }
}
