import { NextResponse } from 'next/server'
import {
  adminClient,
  bearerToken,
  getUserFromToken,
} from '@/lib/api'
import {
  generateWallet,
  encryptKey,
  getAddressBalance,
  getRecentTxs,
  explorerTxUrl,
  explorerAddressUrl,
} from '@/lib/blockchain'

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

    // 2. Ensure wallet with a REAL LTC address + encrypted private key
    const { data: wallet, error: walletReadError } = await supabase
      .from('wallets')
      .select('id, ltc_address, priv_key_encrypted, balance_ltc, last_checked_at')
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
    let privKeyEnc = wallet?.priv_key_encrypted ?? null

    // If wallet exists but has no encrypted private key, it was created by an
    // older placeholder build — regenerate a real address + key.
    const needsRegenerate = !!wallet && !privKeyEnc

    if (!wallet || needsRegenerate) {
      // Generate a real Litecoin wallet (address + private key).
      const { address: newAddr, wif } = generateWallet()
      address = newAddr
      privKeyEnc = encryptKey(wif)

      const { data: created, error: walletInsertError } = await supabase
        .from('wallets')
        .upsert(
          {
            user_id: user.id,
            ltc_address: address,
            priv_key_encrypted: privKeyEnc,
            balance_ltc: balance,
          },
          { onConflict: 'user_id' }
        )
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

    // 3. Deposit detection: sync from SoChain. On-chain confirmed balance is
    //    the source of truth — if it exceeds the stored balance, the difference
    //    is a deposit that was missed (rate-limited sync, failed detection,
    //    etc.). Credit it so no confirmed incoming payment is ever lost.
    try {
      const onchainBalance = await getAddressBalance(address)
      const txs = await getRecentTxs(address)

      // Credit deposits that are not yet recorded (match on tx_hash).
      for (const tx of txs) {
        // Determine if this tx is an incoming payment to our address.
        const isIncoming = tx.outputs?.some(
          (o) => o.address === address && parseFloat(o.value || '0') > 0
        )
        if (!isIncoming || tx.confirmations <= 0) continue

        // Skip if already recorded.
        const { data: existing } = await supabase
          .from('transactions')
          .select('id')
          .eq('tx_hash', tx.txid)
          .maybeSingle()
        if (existing) continue

        const amount = tx.outputs
          .filter((o) => o.address === address)
          .reduce((s, o) => s + (parseFloat(o.value || '0') || 0), 0)
        if (amount <= 0) continue

        await supabase.from('transactions').insert({
          wallet_id: user.id,
          type: 'deposit',
          amount_ltc: amount,
          status: 'completed',
          counterparty_address: tx.inputs?.[0]?.address ?? null,
          tx_hash: tx.txid,
        })
        balance += amount
      }

      // Safety net: if the on-chain confirmed balance is higher than the
      // stored balance, credit the difference. This catches deposits whose
      // individual tx rows were never recorded (API failures, missed syncs).
      if (onchainBalance > balance + 1e-12) {
        const missed = onchainBalance - balance
        await supabase.from('transactions').insert({
          wallet_id: user.id,
          type: 'deposit',
          amount_ltc: missed,
          status: 'completed',
          counterparty_address: address,
          tx_hash: null,
        })
        // Mark any pending deposit rows matching the credited amount as
        // completed so the UI reflects the confirmed deposit.
        const { data: pendingTxs } = await supabase
          .from('transactions')
          .select('id, amount_ltc')
          .eq('wallet_id', user.id)
          .eq('type', 'deposit')
          .eq('status', 'pending')
        for (const p of pendingTxs || []) {
          if (Math.abs(Number(p.amount_ltc) - missed) < 1e-8) {
            await supabase
              .from('transactions')
              .update({ status: 'completed' })
              .eq('id', p.id)
          }
        }
        balance = onchainBalance
      }

      // Update balance + last checked.
      await supabase
        .from('wallets')
        .update({ balance_ltc: balance, last_checked_at: new Date().toISOString() })
        .eq('user_id', user.id)
    } catch (syncErr) {
      // Deposit sync is best-effort; don't fail the whole request.
      console.error('Deposit sync error:', syncErr)
    }

    // 4. Transactions (with explorer URLs)
    const url = new URL(request.url)
    const limit = Math.min(
      Math.max(parseInt(url.searchParams.get('limit') || '50', 10), 1),
      200
    )
    const offset = Math.max(parseInt(url.searchParams.get('offset') || '0', 10), 0)

    const { data: transactions, error: txError } = await supabase
      .from('transactions')
      .select('*')
      .eq('wallet_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (txError) {
      return NextResponse.json(
        { error: `Transaction lookup failed: ${txError.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      address,
      balance,
      explorerAddress: explorerAddressUrl(address),
      transactions:
        transactions?.map((tx) => ({
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
