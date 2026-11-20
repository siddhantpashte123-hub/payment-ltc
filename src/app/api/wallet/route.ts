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

export async function GET(request: Request) {
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

    const supabase = createClient(supabaseUrl, serviceRoleKey)

    // Ensure profile exists
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (!profile) {
      await supabase.from('profiles').insert({
        id: user.id,
        email: user.email,
        full_name: user.user_metadata?.full_name || user.email,
        avatar_url: user.user_metadata?.avatar_url,
      })
    }

    // Ensure wallet exists with a unique LTC address
    const { data: wallet } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', user.id)
      .single()

    let ltcAddress: string
    let balance = 0

    if (!wallet) {
      ltcAddress = generateDepositAddress(user.id)
      const { data: newWallet } = await supabase
        .from('wallets')
        .insert({
          user_id: user.id,
          ltc_address: ltcAddress,
          balance_ltc: 0,
        })
        .select()
        .single()
      balance = newWallet?.balance_ltc ?? 0
    } else {
      ltcAddress = wallet.ltc_address
      balance = wallet.balance_ltc ?? 0
    }

    // Fetch transactions
    const { data: transactions } = await supabase
      .from('transactions')
      .select('*')
      .eq('wallet_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)

    return NextResponse.json({
      address: ltcAddress,
      balance: Number(balance) || 0,
      transactions: transactions?.map((tx) => ({
        id: tx.id,
        type: tx.type,
        amount: Number(tx.amount_ltc),
        status: tx.status,
        address: tx.counterparty_address,
        created_at: tx.created_at,
        tx_hash: tx.tx_hash,
      })) || [],
    })
  } catch (error) {
    console.error('Wallet API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Deterministic deposit address generator (LTC mainnet format: starts with L or M)
// NOTE: In production, back these addresses with real private keys via an HD wallet
// or a third-party address generation service.
function generateDepositAddress(userId: string): string {
  const chars =
    'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ123456789'
  let hash = 0
  for (let i = 0; i < userId.length; i++) {
    hash = (hash << 5) - hash + userId.charCodeAt(i)
    hash |= 0
  }
  let addr = (hash < 0 ? 'L' : 'M')
  for (let i = 0; i < 32; i++) {
    hash = (hash << 5) - hash + userId.charCodeAt(i % userId.length) + i
    hash |= 0
    addr += chars[Math.abs(hash) % chars.length]
  }
  return addr
}
