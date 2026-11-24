import { NextResponse } from 'next/server'
import { adminClient, bearerToken, getUserFromToken } from '@/lib/api'
import {
  decryptKey,
  sendLtc,
  explorerTxUrl,
  estimateConfirmationTime,
} from '@/lib/blockchain'
import { sendSol, solExplorerTxUrl, SOL_FEE_LITOSHI, SOL_FEE_LTC } from '@/lib/solana'

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

    let body: {
      to?: unknown
      amount?: unknown
      name?: unknown
      note?: unknown
      coin?: unknown
      feeTier?: unknown
    }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const coin: 'ltc' | 'sol' = body.coin === 'sol' ? 'sol' : 'ltc'
    const to = typeof body.to === 'string' ? body.to.trim() : ''
    const amount = Number(body.amount)
    const feeTier: 'economy' | 'normal' | 'fast' =
      body.feeTier === 'economy' || body.feeTier === 'fast'
        ? body.feeTier
        : 'normal'
    const name =
      typeof body.name === 'string' && body.name.trim().length <= 60
        ? body.name.trim()
        : null
    const note =
      typeof body.note === 'string' && body.note.trim().length <= 200
        ? body.note.trim()
        : null
    if (!to || !isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        { error: 'Invalid recipient address or amount' },
        { status: 400 }
      )
    }

    const supabase = adminClient()

    // Get wallet (both LTC and SOL fields).
    const { data: wallet, error: walletReadError } = await supabase
      .from('wallets')
      .select(
        'ltc_address, priv_key_encrypted, balance_ltc, sol_address, sol_priv_key_encrypted, sol_balance'
      )
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

    // Load security settings (withdrawal limit + whitelist).
    const { data: settingsData } = await supabase
      .from('app_settings')
      .select('key, value')
      .eq('user_id', user.id)
    const settings: Record<string, string> = {}
    for (const row of settingsData ?? []) settings[row.key] = row.value

    // Withdrawal limit per coin (empty = no limit).
    const limitKey = `withdrawal_limit:${coin}`
    if (settings[limitKey]) {
      const limit = Number(settings[limitKey])
      if (isFinite(limit) && limit > 0 && amount > limit) {
        return NextResponse.json(
          { error: `Withdrawal limit for ${coin.toUpperCase()} is ${limit} — this amount exceeds it` },
          { status: 400 }
        )
      }
    }

    // Whitelist-only mode: reject sends to non-saved addresses.
    if (settings['whitelist_only'] === 'true') {
      const { data: saved } = await supabase
        .from('saved_addresses')
        .select('address')
        .eq('user_id', user.id)
        .eq('address', to)
        .maybeSingle()
      if (!saved) {
        return NextResponse.json(
          {
            error:
              'Whitelist mode is on — add this recipient to your Contacts first',
          },
          { status: 400 }
        )
      }
    }

    const isSol = coin === 'sol'
    const balance = isSol
      ? Number(wallet.sol_balance ?? 0)
      : Number(wallet.balance_ltc ?? 0)
    const keyEnc = isSol
      ? wallet.sol_priv_key_encrypted
      : wallet.priv_key_encrypted
    const fromAddress = isSol ? wallet.sol_address : wallet.ltc_address

    // For SOL the network fee is paid by the sender's keypair from the same
    // balance, so the amount can never be the full balance (amount + fee must
    // fit). For LTC, sendLtc() auto-reduces the amount when amount + fee exceeds
    // the funds, so this is only a guard against clearly-over amounts.
    const solFee = SOL_FEE_LTC
    if (isSol ? amount + solFee > balance : amount > balance) {
      return NextResponse.json(
        { error: 'Insufficient balance for this transaction' },
        { status: 400 }
      )
    }

    if (!keyEnc) {
      return NextResponse.json(
        { error: 'Wallet private key missing — please sign in again.' },
        { status: 500 }
      )
    }

    const now = new Date().toISOString()
    let signature: string
    let sentAmount = amount
    let feeLitoshi = 0
    let feeLtc = 0

    let wif: string
    try {
      wif = decryptKey(keyEnc) // base64 secret key, encrypted same way
    } catch {
      return NextResponse.json(
        {
          error:
            'This wallet cannot be unlocked with the current server key — it was encrypted with a different secret. If you have your original recovery key, contact support to restore access to your funds.',
        },
        { status: 500 }
      )
    }

    if (isSol) {
      // Solana send.
      try {
        const result = await sendSol({
          to,
          amount,
          secretKeyB64: wif,
        })
        signature = result.signature
        feeLtc = result.fee
        feeLitoshi = SOL_FEE_LITOSHI
      } catch (sendErr) {
        const msg = sendErr instanceof Error ? sendErr.message : 'Send failed'
        return NextResponse.json(
          { error: `On-chain send failed: ${msg}` },
          { status: 400 }
        )
      }
    } else {
      // Litecoin send.
      try {
        const result = await sendLtc({
          to,
          amount,
          wif,
          changeAddress: wallet.ltc_address,
          feeTier,
        })
        signature = result.txid
        feeLitoshi = result.fee
        feeLtc = result.fee / 100_000_000
        if (result.amount !== amount) {
          sentAmount = result.amount
        }
      } catch (sendErr) {
        const msg = sendErr instanceof Error ? sendErr.message : 'Send failed'
        return NextResponse.json(
          { error: `On-chain send failed: ${msg}` },
          { status: 400 }
        )
      }
    }

    // The network fee is a real outflow from the wallet, so it must be deducted
    // along with the sent amount. (Previously only `sentAmount` was subtracted,
    // leaving the stored balance overstated by the fee until the next on-chain
    // sync — and showing a phantom `fee`-sized balance after a full send.)
    const newBalance = balance - sentAmount - feeLtc

    // Deduct balance.
    const balanceUpdate = isSol
      ? { sol_balance: newBalance, sol_last_checked_at: now }
      : { balance_ltc: newBalance, last_checked_at: now }
    const { error: updateError } = await supabase
      .from('wallets')
      .update(balanceUpdate)
      .eq('user_id', user.id)
    if (updateError) {
      return NextResponse.json(
        { error: `Balance update failed: ${updateError.message}` },
        { status: 500 }
      )
    }

    // Record the send transaction with its on-chain signature.
    const { error: insertError } = await supabase.from('transactions').insert({
      wallet_id: user.id,
      coin,
      type: 'send',
      amount_ltc: -sentAmount,
      status: 'completed',
      counterparty_address: to,
      counterparty_name: name,
      note,
      tx_hash: signature,
      confirmations: 0,
      fee_ltc: feeLtc,
      estimated_time: isSol
        ? '~1 min'
        : estimateConfirmationTime(0, feeLitoshi),
      created_at: now,
    })
    if (insertError) {
      return NextResponse.json(
        { error: `Could not record transaction: ${insertError.message}` },
        { status: 500 }
      )
    }

    const explorer = isSol ? solExplorerTxUrl(signature) : explorerTxUrl(signature)
    const unit = isSol ? 'SOL' : 'LTC'

    return NextResponse.json({
      success: true,
      newBalance,
      sentAmount,
      txid: signature,
      explorer,
      message: `Sent ${sentAmount} ${unit} to ${to}`,
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
