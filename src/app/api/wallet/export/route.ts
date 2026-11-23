import { NextResponse } from 'next/server'
import { adminClient, bearerToken, getUserFromToken } from '@/lib/api'
import { decryptKey } from '@/lib/blockchain'

/**
 * GET /api/wallet/export
 * Returns the wallet's private key (WIF for LTC, base64 secret for SOL) so
 * the user can back up / recover their funds. The key is decrypted on the
 * server using WALLET_SECRET_KEY and returned only to the authenticated
 * owner. This is intentionally an explicit user action (export backup).
 */
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
    const { data: wallet, error: walletError } = await supabase
      .from('wallets')
      .select('ltc_address, priv_key_encrypted, sol_address, sol_priv_key_encrypted')
      .eq('user_id', user.id)
      .maybeSingle()

    if (walletError) {
      return NextResponse.json(
        { error: `Wallet lookup failed: ${walletError.message}` },
        { status: 500 }
      )
    }
    if (!wallet) {
      return NextResponse.json({ error: 'Wallet not found' }, { status: 404 })
    }

    const result: {
      ltcAddress: string
      ltcWif: string | null
      solAddress: string | null
      solSecret: string | null
    } = {
      ltcAddress: wallet.ltc_address ?? '',
      ltcWif: null,
      solAddress: wallet.sol_address ?? null,
      solSecret: null,
    }

    if (wallet.priv_key_encrypted) {
      try {
        result.ltcWif = decryptKey(wallet.priv_key_encrypted)
      } catch {
        // Key can't be decrypted with the current server secret.
      }
    }
    if (wallet.sol_priv_key_encrypted) {
      try {
        result.solSecret = decryptKey(wallet.sol_priv_key_encrypted)
      } catch {
        // Non-fatal
      }
    }

    return NextResponse.json({ wallet: result })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Export API error:', error)
    return NextResponse.json(
      { error: `Server error: ${message}` },
      { status: 500 }
    )
  }
}
