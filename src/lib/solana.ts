import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
  type TransactionResponse,
} from '@solana/web3.js'

/**
 * Solana (SOL) blockchain engine.
 * - Real Solana mainnet keypair per user (Ed25519), private key encrypted at
 *   rest with WALLET_SECRET_KEY (same AES-256-GCM as LTC).
 * - Balance + transaction history + real sends via the public RPC endpoint.
 * - Solana has near-instant finality (~400ms) and a fixed base network fee of
 *   5000 lamports (0.000005 SOL) per transaction.
 *
 * NOTE: @solana/web3.js v3 — Keypair.generate() and Transaction.sign() are
 * async and must be awaited.
 */

const SOLANA_RPC_URL =
  process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com'

const SYSTEM_PROGRAM_ID = '11111111111111111111111111111111'

/** Fixed base network fee in SOL (5000 lamports). */
export const SOL_FEE_LTC = 0.000005
export const SOL_FEE_LITOSHI = 5000 // == SOL_FEE_LTC * 1e8

function getConnection(): Connection {
  return new Connection(SOLANA_RPC_URL, 'confirmed')
}

// ---------------- Wallet generation ----------------

export interface SolWallet {
  address: string
  /** secretKey as base64 (will be encrypted before storage). */
  secretKeyB64: string
}

/** Generate a new Solana mainnet keypair. */
export async function generateSolWallet(): Promise<SolWallet> {
  const kp = await Keypair.generate()
  return {
    address: kp.publicKey.toBase58(),
    secretKeyB64: Buffer.from(kp.secretKey).toString('base64'),
  }
}

/** Restore a keypair from its base64 secret key. */
export async function restoreSolKeypair(secretKeyB64: string): Promise<Keypair> {
  return await Keypair.fromSecretKey(Buffer.from(secretKeyB64, 'base64'))
}

// ---------------- Balance ----------------

/** Confirmed SOL balance for an address. */
export async function getSolBalance(address: string): Promise<number> {
  const conn = getConnection()
  const lamports = await conn.getBalance(new PublicKey(address))
  return Number(lamports) / LAMPORTS_PER_SOL
}

// ---------------- Transactions ----------------

export interface SolTx {
  signature: string
  type: 'deposit' | 'send'
  amount: number // absolute SOL
  status: 'completed' | 'pending' | 'failed'
  counterparty: string
  time: number // unix seconds
  confirmations: number
  blockHeight: number | null
  fee: number // SOL
}

/**
 * Decode SystemProgram.transfer instructions from a jsonParsed transaction
 * message to determine direction + amount for the given address.
 */
function parseTransfers(
  accountKeys: Array<{ pubkey?: string }>,
  instructions: Array<{
    programId?: string
    accounts?: number[]
    data?: string | { data?: string }
  }>,
  address: string
): { receivedLamports: number; sentLamports: number; counterparty: string } {
  let received = 0
  let sent = 0
  let counterparty = ''

  for (const ins of instructions) {
    // Only SystemProgram transfers carry the simple value we care about.
    const pidRaw = ins.programId
    let pid = ''
    if (typeof pidRaw === 'string') {
      pid = pidRaw
    } else if (pidRaw != null) {
      const asPk = pidRaw as unknown as { toBase58?: () => string }
      pid = typeof asPk.toBase58 === 'function' ? asPk.toBase58() : ''
    }
    if (pid !== SYSTEM_PROGRAM_ID) continue

    const fromIdx = ins.accounts?.[0]
    const toIdx = ins.accounts?.[1]
    if (fromIdx == null || toIdx == null) continue

    const fromAddr = accountKeys[fromIdx]?.pubkey
    const toAddr = accountKeys[toIdx]?.pubkey

    // Decode the 8-byte little-endian lamports amount from the instruction data.
    let lamports = 0
    const dataHex =
      typeof ins.data === 'string' ? ins.data : ins.data?.data
    if (typeof dataHex === 'string' && dataHex.length >= 16) {
      const buf = Buffer.from(dataHex.slice(0, 16), 'hex')
      lamports = Number(buf.readBigUInt64LE(0))
    }

    const toIsMe = toAddr === address
    const fromIsMe = fromAddr === address
    if (toIsMe) {
      received += lamports
      if (!counterparty) counterparty = fromAddr || ''
    }
    if (fromIsMe) {
      sent += lamports
      if (!counterparty) counterparty = toAddr || ''
    }
  }
  return { receivedLamports: received, sentLamports: sent, counterparty }
}

/** Recent SOL transactions for an address. */
export async function getSolTransactions(address: string): Promise<SolTx[]> {
  const conn = getConnection()
  const pub = new PublicKey(address)

  const sigs = await conn.getSignaturesForAddress(pub, { limit: 25 })
  const results: SolTx[] = []

  for (const s of sigs) {
    try {
      const txRes = (await conn.getTransaction(s.signature, {
        commitment: 'confirmed',
      })) as TransactionResponse
      if (!txRes) continue

      const msg = txRes.transaction?.message as
        | {
            accountKeys?: Array<{ pubkey?: string }>
            instructions?: Array<{
              programId?: string
              accounts?: number[]
              data?: string | { data?: string }
            }>
          }
        | undefined
      const accountKeys = msg?.accountKeys ?? []
      const instructions = msg?.instructions ?? []
      const { receivedLamports, sentLamports, counterparty } = parseTransfers(
        accountKeys,
        instructions,
        address
      )

      const received = receivedLamports / LAMPORTS_PER_SOL
      const sent = sentLamports / LAMPORTS_PER_SOL
      const net = received - sent

      // Determine status: a failed tx has an error in the signature list.
      const status: SolTx['status'] = s.err
        ? 'failed'
        : txRes.meta?.err
        ? 'failed'
        : 'completed'

      results.push({
        signature: s.signature,
        type: net >= 0 ? 'deposit' : 'send',
        amount: Math.max(received, sent),
        status,
        counterparty: counterparty || '',
        time:
          typeof s.blockTime === 'number'
            ? s.blockTime
            : Math.floor(Date.now() / 1000),
        confirmations: 1, // Solana confirms within ~400ms
        blockHeight: txRes.slot != null ? Number(txRes.slot) : null,
        fee: SOL_FEE_LTC,
      })
    } catch {
      // Non-fatal — skip txs we can't parse.
    }
  }

  return results
}

/** On-chain detail for a SOL tx signature. */
export async function getSolOnChainDetail(signature: string): Promise<{
  confirmations: number
  blockHeight: number | null
  feeLtc: number
  feeLitoshi: number
  status: 'confirmed' | 'pending' | 'failed'
}> {
  const conn = getConnection()
  const statuses = await conn.getSignatureStatuses([signature])
  const v = statuses?.value?.[0]

  let blockHeight: number | null = null
  try {
    const txRes = await conn.getTransaction(signature, {
      commitment: 'confirmed',
    })
    blockHeight = txRes?.slot != null ? Number(txRes.slot) : null
  } catch {
    // ignore
  }

  const confirmations = v?.confirmations != null ? Number(v.confirmations) : 0
  const status: 'confirmed' | 'pending' | 'failed' = v?.err
    ? 'failed'
    : confirmations > 0
    ? 'confirmed'
    : 'pending'

  return {
    confirmations,
    blockHeight,
    feeLtc: SOL_FEE_LTC,
    feeLitoshi: SOL_FEE_LITOSHI,
    status,
  }
}

// ---------------- Send ----------------

export interface SolSendResult {
  signature: string
  fee: number // SOL
}

/** Build, sign and broadcast a real SOL transfer. */
export async function sendSol(params: {
  to: string
  amount: number
  secretKeyB64: string
}): Promise<SolSendResult> {
  const { to, amount, secretKeyB64 } = params
  const conn = getConnection()
  const kp = await restoreSolKeypair(secretKeyB64)

  const lamports = Math.floor(amount * LAMPORTS_PER_SOL)
  const { blockhash } = await conn.getLatestBlockhash()

  const tx = new Transaction()
  tx.add(
    SystemProgram.transfer({
      fromPubkey: kp.publicKey,
      toPubkey: new PublicKey(to),
      lamports,
    })
  )
  tx.recentBlockhash = blockhash
  tx.feePayer = kp.publicKey
  await tx.sign(kp)

  const raw = await tx.serialize()
  const signature = await conn.sendRawTransaction(raw, {
    skipPreflight: false,
  })

  return { signature, fee: SOL_FEE_LTC }
}

// ---------------- Explorer URLs ----------------

export const solExplorerTxUrl = (sig: string) =>
  `https://solscan.io/tx/${sig}`

export const solExplorerAddressUrl = (addr: string) =>
  `https://solscan.io/address/${addr}`
