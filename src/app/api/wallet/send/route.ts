import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

async function getUserFromToken(accessToken: string) {
  const res = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })
  if (!res.ok) return null
  return res.json()
}

export async function POST(request: Request) {
  try {
    const headers = await request.headers
    const authHeader = headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing token' }, { status: 401 })
    }

    const accessToken = authHeader.split(' ')[1]
    const user = await getUserFromToken(accessToken)
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const { to, amount } = await request.json()
    if (!to || !amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Invalid recipient or amount' },
        { status: 400 }
      )
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey)

    // Get wallet
    const { data: wallet } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (!wallet) {
      return NextResponse.json({ error: 'Wallet not found' }, { status: 404 })
    }

    const balance = Number(wallet.balance_ltc) || 0
    if (amount > balance) {
      return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 })
    }

    const newBalance = balance - amount
    const now = new Date().toISOString()

    // Deduct balance
    await supabase
      .from('wallets')
      .update({ balance_ltc: newBalance })
      .eq('user_id', user.id)

    // Record send transaction
    await supabase.from('transactions').insert({
      wallet_id: user.id,
      type: 'send',
      amount_ltc: -amount,
      status: 'completed',
      counterparty_address: to,
      created_at: now,
    })

    return NextResponse.json({
      success: true,
      newBalance,
      message: `Sent ${amount} LTC to ${to}`,
    })
  } catch (error) {
    console.error('Send API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
