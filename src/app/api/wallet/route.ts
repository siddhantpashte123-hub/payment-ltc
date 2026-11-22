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
import {
  generateSolWallet,
  getSolBalance,
  getSolTransactions,
  solExplorerTxUrl,
  solExplorerAddressUrl,
} from '@/lib/solana'

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

    // 2. Ensure wallet row (LTC + SOL addresses + encrypted keys).
    const { data: wallet, error: walletReadError } = await supabase
      .from('wallets')
      .select(
        'id, ltc_address, priv_key_encrypted, balance_ltc, last_checked_at, sol_address, sol_priv_key_encrypted, sol_balance, sol_last_checked_at'
      )
      .eq('user_id', user.id)
      .maybeSingle()

    if (walletReadError) {
      return NextResponse.json(
        { error: `Wallet lookup failed: ${walletReadError.message}` },
        { status: 500 }
      )
    }

    // --- LTC wallet ---
    let ltcAddress = wallet?.ltc_address ?? ''
    let ltcBalance = Number(wallet?.balance_ltc ?? 0)
    let ltcPrivKeyEnc = wallet?.priv_key_encrypted ?? null

    const ltcNeedsRegenerate = !!wallet && !ltcPrivKeyEnc
    if (!wallet || ltcNeedsRegenerate) {
      const { address: newAddr, wif } = generateWallet()
      ltcAddress = newAddr
      ltcPrivKeyEnc = encryptKey(wif)

      const { data: created, error: walletInsertError } = await supabase
        .from('wallets')
        .upsert(
          {
            user_id: user.id,
            ltc_address: ltcAddress,
            priv_key_encrypted: ltcPrivKeyEnc,
            balance_ltc: ltcBalance,
            sol_address: wallet?.sol_address ?? null,
            sol_priv_key_encrypted: wallet?.sol_priv_key_encrypted ?? null,
            sol_balance: wallet?.sol_balance ?? 0,
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
      ltcAddress = created.ltc_address
      ltcBalance = Number(created.balance_ltc ?? 0)
    }

    // --- SOL wallet ---
    let solAddress = wallet?.sol_address ?? ''
    let solBalance = Number(wallet?.sol_balance ?? 0)
    let solPrivKeyEnc = wallet?.sol_priv_key_encrypted ?? null

    const solNeedsGenerate = !!wallet && !solAddress
    if (solNeedsGenerate) {
      const solWallet = await generateSolWallet()
      solAddress = solWallet.address
      solPrivKeyEnc = encryptKey(solWallet.secretKeyB64)

      const { error: solInsertError } = await supabase
        .from('wallets')
        .update({
          sol_address: solAddress,
          sol_priv_key_encrypted: solPrivKeyEnc,
        })
        .eq('user_id', user.id)
      if (solInsertError) {
        return NextResponse.json(
          { error: `Could not create Solana wallet: ${solInsertError.message}` },
          { status: 500 }
        )
      }
    }

    // 3. LTC deposit detection + balance reconciliation (on-chain = source of
    //    truth; reconciles both directions). SPEED: only sync if stale >2 min.
    const ltcLastChecked = wallet?.last_checked_at
      ? new Date(wallet.last_checked_at).getTime()
      : 0
    const ltcStale = Date.now() - ltcLastChecked > 2 * 60 * 1000

    if (ltcStale) {
      try {
        const onchainBalance = await getAddressBalance(ltcAddress)
        const txs = await getRecentTxs(ltcAddress)

        for (const tx of txs) {
          if (tx.value_received <= 0 || tx.confirmations <= 0) continue
          const { data: existing } = await supabase
            .from('transactions')
            .select('id')
            .eq('tx_hash', tx.txid)
            .maybeSingle()
          if (existing) continue
          const amount = tx.value_received
          if (amount <= 0) continue

          let counterparty: string | null = null
          try {
            const detail = await getTxDetail(tx.txid)
            counterparty = detail?.inputs?.[0]?.address ?? null
          } catch {
            // Non-fatal
          }

          await supabase.from('transactions').insert({
            wallet_id: user.id,
            coin: 'ltc',
            type: 'deposit',
            amount_ltc: amount,
            status: 'completed',
            counterparty_address: counterparty,
            tx_hash: tx.txid,
            confirmations: tx.confirmations,
            block_height: tx.block ?? null,
          })
        }

        // Cleanup phantom NULL tx_hash deposit rows (old safety-net artifacts).
        await supabase
          .from('transactions')
          .delete()
          .eq('wallet_id', user.id)
          .eq('coin', 'ltc')
          .eq('type', 'deposit')
          .is('tx_hash', null)

        ltcBalance = onchainBalance
        await supabase
          .from('wallets')
          .update({
            balance_ltc: ltcBalance,
            last_checked_at: new Date().toISOString(),
          })
          .eq('user_id', user.id)
      } catch (syncErr) {
        console.error('LTC sync error:', syncErr)
      }
    } else {
      ltcBalance = Number(wallet?.balance_ltc ?? 0)
    }

    // 4. SOL balance sync (on-chain = source of truth). SPEED: only if stale.
    const solLastChecked = wallet?.sol_last_checked_at
      ? new Date(wallet.sol_last_checked_at).getTime()
      : 0
    const solStale = Date.now() - solLastChecked > 2 * 60 * 1000

    if (solStale && solAddress) {
      try {
        const solOnchain = await getSolBalance(solAddress)
        solBalance = solOnchain

        // Record confirmed SOL deposits not yet in history.
        const solTxs = await getSolTransactions(solAddress)
        for (const tx of solTxs) {
          if (tx.type !== 'deposit' || tx.amount <= 0) continue
          const { data: existing } = await supabase
            .from('transactions')
            .select('id')
            .eq('tx_hash', tx.signature)
            .maybeSingle()
          if (existing) continue

          await supabase.from('transactions').insert({
            wallet_id: user.id,
            coin: 'sol',
            type: 'deposit',
            amount_ltc: tx.amount,
            status: tx.status,
            counterparty_address: tx.counterparty || null,
            tx_hash: tx.signature,
            confirmations: tx.confirmations,
            block_height: tx.blockHeight ?? null,
            fee_ltc: tx.fee,
          })
        }

        await supabase
          .from('wallets')
          .update({
            sol_balance: solBalance,
            sol_last_checked_at: new Date().toISOString(),
          })
          .eq('user_id', user.id)
      } catch (solSyncErr) {
        console.error('SOL sync error:', solSyncErr)
      }
    } else if (solAddress) {
      solBalance = Number(wallet?.sol_balance ?? 0)
    }

    // 5. Transactions (both coins) with explorer URLs.
    const url = new URL(request.url)
    const coin = url.searchParams.get('coin') // 'ltc' | 'sol' | null
    const limit = Math.min(
      Math.max(parseInt(url.searchParams.get('limit') || '50', 10), 1),
      200
    )
    const offset = Math.max(parseInt(url.searchParams.get('offset') || '0', 10), 0)

    const txQuery = supabase
      .from('transactions')
      .select('*')
      .eq('wallet_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    const { data: transactions, error: txError } =
      coin === 'ltc' || coin === 'sol'
        ? await txQuery.eq('coin', coin)
        : await txQuery

    if (txError) {
      return NextResponse.json(
        { error: `Transaction lookup failed: ${txError.message}` },
        { status: 500 }
      )
    }

    const mapTx = (tx: any, chain: 'ltc' | 'sol') => ({
      id: tx.id,
      coin: chain,
      type: tx.type,
      amount: Math.abs(Number(tx.amount_ltc)),
      status: tx.status,
      address: tx.counterparty_address ?? '',
      name: tx.counterparty_name ?? undefined,
      note: tx.note ?? undefined,
      created_at: tx.created_at,
      tx_hash: tx.tx_hash ?? undefined,
      explorer: tx.tx_hash
        ? chain === 'ltc'
          ? explorerTxUrl(tx.tx_hash)
          : solExplorerTxUrl(tx.tx_hash)
        : undefined,
      confirmations: tx.confirmations ?? undefined,
      block_height: tx.block_height ?? undefined,
      fee_ltc: tx.fee_ltc != null ? Number(tx.fee_ltc) : undefined,
      estimated_time: tx.estimated_time ?? undefined,
    })

    return NextResponse.json({
      ltc: {
        address: ltcAddress,
        balance: ltcBalance,
        explorerAddress: explorerAddressUrl(ltcAddress),
        lastCheckedAt: wallet?.last_checked_at ?? null,
      },
      sol: {
        address: solAddress,
        balance: solBalance,
        explorerAddress: solExplorerAddressUrl(solAddress),
        lastCheckedAt: wallet?.sol_last_checked_at ?? null,
      },
      transactions:
        (transactions?.map((tx) =>
          mapTx(tx, (tx.coin as 'ltc' | 'sol') ?? 'ltc')
        ) ?? []),
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
