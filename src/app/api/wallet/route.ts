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
  getTxDetail,
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

    // 3. Deposit detection + balance reconciliation. The on-chain confirmed
    //    balance is the SINGLE source of truth. We record any confirmed
    //    deposits that aren't in the transaction history yet, then set the
    //    stored balance to the on-chain balance — this reconciles BOTH
    //    directions (missed deposits push it up; sends / double-credits that
    //    left the stored balance stale push it back down to the real value).
    //
    //    SPEED: SoChain calls are slow, so we only sync on-chain when the
    //    wallet hasn't been checked in the last ~2 minutes. This keeps the
    //    dashboard fast — most loads serve the stored balance + transactions
    //    instantly and skip the external calls.
    const lastChecked = wallet?.last_checked_at
      ? new Date(wallet.last_checked_at).getTime()
      : 0
    const isStale = Date.now() - lastChecked > 2 * 60 * 1000

    if (isStale) {
      try {
        const onchainBalance = await getAddressBalance(address)
        const txs = await getRecentTxs(address)

        // Record confirmed deposits that aren't in the history yet (match on
        // tx_hash). SoChain v3 lists transactions with value_received: a tx
        // with value_received > 0 paid into our address. We only INSERT rows
        // here — the balance itself is taken from on-chain below, so we never
        // double-count a deposit.
        for (const tx of txs) {
          if (tx.value_received <= 0 || tx.confirmations <= 0) continue

          // Skip if already recorded.
          const { data: existing } = await supabase
            .from('transactions')
            .select('id')
            .eq('tx_hash', tx.txid)
            .maybeSingle()
          if (existing) continue

          const amount = tx.value_received
          if (amount <= 0) continue

          // Best-effort counterparty (sender address) from tx detail.
          let counterparty: string | null = null
          try {
            const detail = await getTxDetail(tx.txid)
            counterparty = detail?.inputs?.[0]?.address ?? null
          } catch {
            // Non-fatal — counterparty is informational only.
          }

          await supabase.from('transactions').insert({
            wallet_id: user.id,
            type: 'deposit',
            amount_ltc: amount,
            status: 'completed',
            counterparty_address: counterparty,
            tx_hash: tx.txid,
            confirmations: tx.confirmations,
            block_height: tx.block ?? null,
          })
        }

        // Cleanup: an older safety-net path inserted phantom deposit rows with
        // tx_hash = NULL (the difference-based credit). Real on-chain deposits
        // always carry a tx_hash, so NULL rows are duplicates that inflate the
        // transaction history / totals. Remove them — the per-tx loop above
        // re-records any real deposit that was missed, and the balance is taken
        // from on-chain below, so no funds are affected.
        await supabase
          .from('transactions')
          .delete()
          .eq('wallet_id', user.id)
          .eq('type', 'deposit')
          .is('tx_hash', null)

        // Reconcile balance to the real on-chain confirmed balance. This is
        // the source of truth: it corrects upward (missed deposits) and
        // downward (sends / stale double-credits) in one step.
        balance = onchainBalance

        // Update balance + last checked.
        await supabase
          .from('wallets')
          .update({ balance_ltc: balance, last_checked_at: new Date().toISOString() })
          .eq('user_id', user.id)
      } catch (syncErr) {
        // Deposit sync is best-effort; don't fail the whole request.
        console.error('Deposit sync error:', syncErr)
      }
    } else {
      // Fresh cached balance — no on-chain calls needed.
      balance = Number(wallet?.balance_ltc ?? 0)
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
      lastCheckedAt: wallet?.last_checked_at ?? null,
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
          confirmations: tx.confirmations ?? undefined,
          block_height: tx.block_height ?? undefined,
          fee_ltc: tx.fee_ltc != null ? Number(tx.fee_ltc) : undefined,
          estimated_time: tx.estimated_time ?? undefined,
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
