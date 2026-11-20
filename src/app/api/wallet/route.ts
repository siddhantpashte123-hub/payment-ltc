import { NextResponse } from 'next/server'
import {
  adminClient,
  bearerToken,
  generateDepositAddress,
  getUserFromToken,
} from '@/lib/api'


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

    // 1. Ensure profile
    const { data: existingProfile, error: profileReadError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .maybeSingle()

    if (profileReadError) {
      return NextResponse.json(
        {
          error: `Database not ready: ${profileReadError.message}. Did you run supabase/schema.sql?`,
        },
        { status: 500 }
      )
    }

    if (!existingProfile) {
      const { error: profileInsertError } = await supabase
        .from('profiles')
        .upsert(
          {
            id: user.id,
            email: user.email ?? null,
            full_name:
              (user.user_metadata?.full_name as string) ??
              (user.user_metadata?.name as string) ??
              user.email ??
              null,
            avatar_url:
              (user.user_metadata?.avatar_url as string) ??
              (user.user_metadata?.picture as string) ??
              null,
          },
          { onConflict: 'id' }
        )
      if (profileInsertError) {
        return NextResponse.json(
          { error: `Could not create profile: ${profileInsertError.message}` },
          { status: 500 }
        )
      }
    }

    // 2. Ensure wallet with unique LTC address
    const { data: wallet, error: walletReadError } = await supabase
      .from('wallets')
      .select('id, ltc_address, balance_ltc')
      .eq('user_id', user.id)
      .maybeSingle()

    if (walletReadError) {
      return NextResponse.json(
        { error: `Wallet lookup failed: ${walletReadError.message}` },
        { status: 500 }
      )
    }

    let address = wallet?.ltc_address ?? ''
    let balance = Number(wallet?.balance_ltc ?? 0)

    if (!wallet) {
      address = generateDepositAddress(user.id)
      const { data: created, error: walletInsertError } = await supabase
        .from('wallets')
        .insert({
          user_id: user.id,
          ltc_address: address,
          balance_ltc: 0,
        })
        .select('ltc_address, balance_ltc')
        .single()

      if (walletInsertError) {
        return NextResponse.json(
          { error: `Could not create wallet: ${walletInsertError.message}` },
          { status: 500 }
        )
      }
      address = created.ltc_address
      balance = Number(created.balance_ltc ?? 0)
    }

    // 3. Transactions
    const { data: transactions, error: txError } = await supabase
      .from('transactions')
      .select('*')
      .eq('wallet_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)

    if (txError) {
      return NextResponse.json(
        { error: `Transaction lookup failed: ${txError.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      address,
      balance,
      transactions:
        transactions?.map((tx) => ({
          id: tx.id,
          type: tx.type,
          amount: Math.abs(Number(tx.amount_ltc)),
          status: tx.status,
          address: tx.counterparty_address ?? '',
          created_at: tx.created_at,
          tx_hash: tx.tx_hash ?? undefined,
        })) ?? [],
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Wallet API error:', error)
    return NextResponse.json(
      { error: `Server error: ${message}` },
      { status: 500 }
    )
  }
}
