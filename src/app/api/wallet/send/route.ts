import { NextResponse } from 'next/server'
import { adminClient, bearerToken, getUserFromToken } from '@/lib/api'
import {
  decryptKey,
  sendLtc,
  explorerTxUrl,
  estimateConfirmationTime,
} from '@/lib/blockchain'
import { sendSol, solExplorerTxUrl, SOL_FEE_LITOSHI } from '@/lib/solana'

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
    }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const coin: 'ltc' | 'sol' = body.coin === 'sol' ? 'sol' : 'ltc'
    const to = typeof body.to === 'string' ? body.to.trim() : ''
    const amount = Number(body.amount)
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

    const isSol = coin === 'sol'
    const balance = isSol
      ? Number(wallet.sol_balance ?? 0)
      : Number(wallet.balance_ltc ?? 0)
    const keyEnc = isSol
      ? wallet.sol_priv_key_encrypted
      : wallet.priv_key_encrypted
    const fromAddress = isSol ? wallet.sol_address : wallet.ltc_address

    if (amount > balance) {
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

    if (isSol) {
      // Solana send.
      const wif = decryptKey(keyEnc) // base64 secret key, encrypted same way
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
      const wif = decryptKey(keyEnc)
      try {
        const result = await sendLtc({
          to,
          amount,
          wif,
          changeAddress: wallet.ltc_address,
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

    const newBalance = balance - sentAmount

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
