import { PrivateKey, Transaction, Address } from 'bitcore-lib-litecoin'
import { bech32 } from 'bech32'
import crypto from 'crypto'

/**
 * Blockchain engine for the LTC wallet.
 * - Real Litecoin mainnet addresses generated per user (with private keys,
 *   encrypted at rest with WALLET_SECRET_KEY).
 * - Deposit detection via SoChain API v3 (confirmed balance + incoming txs).
 * - Real send broadcasting via Blockchair (SoChain v3 no longer broadcasts).
 * - Explorer URLs for transactions and addresses.
 *
 * NOTE: private keys are encrypted with AES-256-GCM using a secret derived from
 * WALLET_SECRET_KEY. In production, keep WALLET_SECRET_KEY strong and never
 * expose it to the client.
 *
 * IMPORTANT: SoChain retired API v2 — all calls now use API v3. SoChain v3
 * does NOT broadcast transactions, so sends are broadcast via Blockchair.
 */

const SOCHAIN_BASE = 'https://sochain.com/api/v3'
const BLOCKCHAIR_BASE = 'https://api.blockchair.com/litecoin'
const NETWORK = 'LTC' // Litecoin mainnet
const LITOSHI_PER_LTC = 100_000_000 // 1 LTC = 1e8 litoshis
const UNSPENT_PAGE_SIZE = 10 // SoChain v3 returns up to 10 unspent outputs per page

function getSecret(): string {
  return process.env.WALLET_SECRET_KEY || 'ltc-wallet-dev-secret-change-me'
}

// ---------------- Key encryption ----------------

export function encryptKey(wif: string): string {
  const key = crypto.createHash('sha256').update(getSecret()).digest()
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  const enc = Buffer.concat([cipher.update(wif, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return Buffer.concat([iv, tag, enc]).toString('base64')
}

export function decryptKey(enc: string): string {
  const key = crypto.createHash('sha256').update(getSecret()).digest()
  const buf = Buffer.from(enc, 'base64')
  const iv = buf.subarray(0, 12)
  const tag = buf.subarray(12, 28)
  const data = buf.subarray(28)
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(tag)
  try {
    return Buffer.concat([decipher.update(data), decipher.final()]).toString(
      'utf8'
    )
  } catch {
    // AES-256-GCM auth-tag mismatch: the blob was encrypted with a different
    // WALLET_SECRET_KEY than the one currently configured. Surface a clear,
    // honest error instead of the raw "Unsupported state or unable to
    // authenticate data" message.
    throw new Error(
      'Wallet key mismatch: this wallet was encrypted with a different secret key and cannot be unlocked.'
    )
  }
}

// ---------------- Address generation ----------------

export function generateWallet(): { address: string; wif: string } {
  const priv = new PrivateKey()
  return {
    address: priv.toAddress().toString(),
    wif: priv.toWIF(),
  }
}

/**
 * Normalize a Litecoin address to the base58 form bitcore can build a
 * broadcastable transaction for, OR return null if it is not a valid sendable
 * LTC address.
 *
 * bitcore-lib-litecoin only understands base58 addresses (L/M/3) — it throws
 * "Non-base58 character" on Bech32 (ltc1...) addresses for BOTH parsing and
 * tx construction. Bech32 P2WPKH addresses are valid, modern LTC addresses,
 * so we decode them and convert to the base58 P2PKH equivalent of the SAME
 * 20-byte hash160. Because P2PKH and P2WPKH of the same hash160 are controlled
 * by the same key, the recipient can still spend the funds — the send succeeds
 * and the funds are not lost.
 *
 * Returns the base58 address to broadcast to, or null when the input is not a
 * valid sendable LTC address (malformed, wrong network, or a non-convertible
 * segwit type such as P2WSH/multisig).
 */
export function toBase58LtcAddress(address: string): string | null {
  const addr = address.trim()

  // Bech32 (ltc1...) P2WPKH — decode + convert to base58 P2PKH.
  if (addr.toLowerCase().startsWith('ltc1')) {
    try {
      const { prefix, words } = bech32.decode(addr)
      // Must be a Litecoin bech32 address (not another chain's prefix).
      if (prefix !== 'ltc') return null
      const program = Buffer.from(bech32.fromWords(words))
      // P2WPKH witness program is exactly 20 bytes. P2WSH (32 bytes) and
      // segwit multisig cannot be converted to a base58 single-sig output.
      if (program.length !== 20) return null
      return new Address(program).toString()
    } catch {
      return null
    }
  }

  // Base58 — validate via bitcore's Address parser (throws on non-base58,
  // too-short, or wrong-network input such as BTC legacy '1' addresses).
  try {
    return Address.fromString(addr).toString()
  } catch {
    return null
  }
}

/** True if the address is a valid, sendable Litecoin address (base58 or Bech32). */
export function isValidLtcAddress(address: string): boolean {
  return toBase58LtcAddress(address) !== null
}

// ---------------- SoChain API v3 ----------------

async function sochainGet<T = any>(path: string): Promise<T> {
  const res = await fetch(`${SOCHAIN_BASE}/${path}`, {
    headers: { accept: 'application/json' },
  })
  if (!res.ok) throw new Error(`SoChain GET ${path} failed: ${res.status}`)
  const json = await res.json()
  if (json.status !== 'success') {
    throw new Error(`SoChain error: ${JSON.stringify(json).slice(0, 300)}`)
  }
  return json.data as T
}

/** Retry a SoChain GET with backoff (handles rate limits / transient errors). */
async function sochainGetWithRetry<T = any>(
  path: string,
  attempts = 3
): Promise<T> {
  let lastErr: unknown
  for (let i = 0; i < attempts; i++) {
    try {
      return await sochainGet<T>(path)
    } catch (e) {
      lastErr = e
      if (i < attempts - 1) {
        await new Promise((r) => setTimeout(r, 600 * (i + 1)))
      }
    }
  }
  throw lastErr
}

/** Current block height for the network (used to compute confirmations). */
async function getBlockCount(): Promise<number> {
  const data = await sochainGetWithRetry<{ block_count: number }>(
    `network_info/${NETWORK}`
  )
  return data.block_count
}

/** Confirmed + unconfirmed on-chain balance (LTC) for an address. */
export async function getAddressBalance(address: string): Promise<number> {
  const data = await sochainGetWithRetry<{ confirmed: string }>(
    `balance/${NETWORK}/${address}`
  )
  return parseFloat(data.confirmed) || 0
}

/**
 * Unspent outputs for building a send transaction.
 * SoChain v3 paginates unspent_outputs (10 per page) — follows pages until a
 * short page is returned. Only confirmed outputs (block != null) are returned.
 *
 * NOTE: bitcore-lib-litecoin's runtime UnspentOutput constructor reads
 * `outputIndex` (or `vout`); `outputNo` throws
 * "Invalid outputIndex, received undefined". The library's TS types, however,
 * declare `outputNo` — so both fields are provided to satisfy runtime + types.
 */
export async function getUnspent(address: string) {
  const blockCount = await getBlockCount()
  const utxos: Array<{
    txId: string
    outputIndex: number
    outputNo: number
    script: Buffer
    satoshis: number
    address: string
    confirmations: number
  }> = []

  for (let page = 1; page <= 20; page++) {
    const data = await sochainGetWithRetry<{
      outputs?: Array<{
        hash: string
        index: number
        script: string
        address: string
        value: string
        block: number | null
      }>
    }>(`unspent_outputs/${NETWORK}/${address}/${page}`)

    const outputs = data.outputs || []
    for (const o of outputs) {
      // Only use confirmed outputs for spending.
      if (o.block == null) continue
      utxos.push({
        txId: o.hash,
        outputIndex: o.index,
        outputNo: o.index,
        script: Buffer.from(o.script, 'hex'),
        satoshis: Math.floor(parseFloat(o.value) * LITOSHI_PER_LTC),
        address: o.address,
        confirmations: blockCount - o.block,
      })
    }

    if (outputs.length < UNSPENT_PAGE_SIZE) break
  }

  return utxos
}

export interface RecentTx {
  txid: string
  confirmations: number
  time: number
  value_received: number
  value_sent: number
  balance_change: number
  block: number | null
}

/**
 * Recent transactions for an address (for deposit detection + tx ids).
 * SoChain v3 lists transactions (not outputs) — each entry has the amount the
 * address received/sent. Confirmations are computed from the network block
 * count and the tx's block height.
 */
export async function getRecentTxs(address: string): Promise<RecentTx[]> {
  const blockCount = await getBlockCount()
  const data = await sochainGetWithRetry<{
    transactions?: Array<{
      hash: string
      value_sent: string
      value_received: string
      balance_change: string
      time: number
      block: number | null
    }>
  }>(`transactions/${NETWORK}/${address}/1`)

  return (data.transactions || []).map((t) => ({
    txid: t.hash,
    confirmations:
      t.block != null ? Math.max(0, blockCount - t.block) : 0,
    time: t.time,
    value_received: parseFloat(t.value_received) || 0,
    value_sent: parseFloat(t.value_sent) || 0,
    balance_change: parseFloat(t.balance_change) || 0,
    block: t.block,
  }))
}

/**
 * Full transaction detail (inputs/outputs + block + fee) for a tx hash.
 * Used to find the sender (counterparty) address for a deposit and to read
 * on-chain confirmation details.
 *
 * SoChain v3 fields (verified): `confirmations` (count), `block_height`
 * (block number), `fee` (in LTC, not litoshi).
 */
export async function getTxDetail(txid: string) {
  const data = await sochainGetWithRetry<{
    inputs?: Array<{ address?: string; value?: string }>
    outputs?: Array<{ address?: string; value?: string }>
    confirmations?: number
    block_height?: number | null
    fee?: string
  }>(`transaction/${NETWORK}/${txid}`)
  return data
}

export interface TxOnChainDetail {
  confirmations: number
  blockHeight: number | null
  feeLitoshi: number
  feeLtc: number
  status: 'confirmed' | 'pending'
}

/**
 * On-chain detail for a tx hash: confirmations, block height, and the fee.
 * SoChain v3 returns `confirmations` directly, `block_height`, and `fee` in
 * LTC. We use the directly-returned confirmations (falling back to computing
 * from block height if absent). If the tx has not been included in a block yet,
 * confirmations is 0 and status is 'pending'.
 */
export async function getTxOnChainDetail(txid: string): Promise<TxOnChainDetail> {
  const detail = await getTxDetail(txid)
  const blockHeight =
    detail?.block_height != null ? Number(detail.block_height) : null

  // Prefer the confirmations SoChain returns directly; fall back to computing
  // it from the network block count vs the tx's block height.
  let confirmations = detail?.confirmations
  if (confirmations == null || !isFinite(confirmations)) {
    if (blockHeight != null) {
      const blockCount = await getBlockCount()
      confirmations = Math.max(0, blockCount - blockHeight)
    } else {
      confirmations = 0
    }
  }
  confirmations = Math.max(0, confirmations)

  // SoChain returns the fee in LTC — convert to litoshi for display.
  const feeLtc = Math.max(0, Number(detail?.fee ?? 0))
  const feeLitoshi = Math.round(feeLtc * LITOSHI_PER_LTC)

  return {
    confirmations,
    blockHeight,
    feeLitoshi,
    feeLtc,
    status: confirmations > 0 ? 'confirmed' : 'pending',
  }
}

/**
 * Estimated confirmation time (human readable) for a transaction.
 * Litecoin's average block time is ~2.5 minutes. With the app's very low
 * default fee (~1 litoshi/byte) a typical tx confirms in roughly 30-60
 * minutes; higher-fee txs are faster.
 */
export function estimateConfirmationTime(
  confirmations: number,
  feeLitoshi: number,
  txSize = 380
): string {
  if (confirmations > 0) {
    // Already confirmed — estimate how long it took (blocks * ~2.5 min).
    const mins = Math.round(confirmations * 2.5)
    if (mins < 60) return `Confirmed in ~${mins} min`
    return `Confirmed in ~${Math.round(mins / 60)} hr`
  }
  // Pending: estimate blocks to wait based on fee rate (litoshi/byte).
  const feeRate = txSize > 0 ? feeLitoshi / txSize : 1
  let blocks: number
  if (feeRate >= 10) blocks = 2 // high fee
  else if (feeRate >= 5) blocks = 4
  else if (feeRate >= 3) blocks = 8
  else blocks = 16 // low fee (our default ~1 litoshi/byte)
  const mins = Math.round(blocks * 2.5)
  if (mins < 60) return `~${mins} min`
  return `~${Math.round((mins / 60) * 10) / 10} hr`
}

/**
 * Broadcast a signed raw transaction via Blockchair (SoChain v3 no longer
 * broadcasts). Returns the txid.
 */
export async function broadcastTx(txHex: string): Promise<string> {
  const res = await fetch(`${BLOCKCHAIR_BASE}/push/transaction`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ data: txHex }),
  })
  const json = await res.json().catch(() => ({}))
  const txHash =
    json?.data?.transaction_hash ?? json?.data?.hash ?? null
  if (!res.ok || !txHash) {
    throw new Error(`Broadcast failed: ${JSON.stringify(json).slice(0, 300)}`)
  }
  return txHash as string
}

// ---------------- Send ----------------

export interface SendResult {
  txid: string
  fee: number
  /** Actual amount sent (auto-reduced by fee when sending the full balance). */
  amount: number
}

// Fee-tier definitions live in fees.ts (no bitcore dependency) so client
// components can import them without pulling bitcore into the browser bundle.
import { FEE_TIERS, estimateFeeLitoshi, type FeeTier } from './fees'
export { FEE_TIERS, type FeeTier }

/**
 * Build, sign, and broadcast a real Litecoin transaction.
 * Selects UTXOs, pays a modest fee, returns change to the sender address.
 * Broadcast is done via Blockchair (SoChain v3 does not broadcast).
 *
 * If the requested amount leaves no room for the fee (e.g. the user sent the
 * entire balance), the amount is automatically reduced by the fee so the
 * transaction can still be broadcast — "send all" works out of the box.
 */
export async function sendLtc(params: {
  to: string
  amount: number
  wif: string
  changeAddress: string
  feeTier?: FeeTier
}): Promise<SendResult> {
  const { to, amount, wif, changeAddress, feeTier = 'normal' } = params
  let satoshis = Math.floor(amount * LITOSHI_PER_LTC)

  const utxos = await getUnspent(changeAddress)
  const totalInput = utxos.reduce((s, u) => s + u.satoshis, 0)

  const priv = new PrivateKey(wif)

  // Fee estimate from the UTXO count + selected tier. Computed BEFORE building
  // the tx so we know the exact fee up front. (We must NOT rely on mutating
  // tx.outputs[0].satoshis after tx.to() — bitcore serializes the original
  // amount, which breaks the fee==unspent check in the no-change case.)
  const tier = FEE_TIERS[feeTier]
  const fee = estimateFeeLitoshi(utxos.length, feeTier)

  // Auto-reduce the amount if the requested amount + fee exceeds the funds.
  // This makes "send the full balance" work: fee is deducted from the amount.
  let actualSatoshis = satoshis
  if (satoshis + fee > totalInput) {
    if (totalInput <= fee) {
      throw new Error(
        'Insufficient confirmed on-chain balance to cover the fee'
      )
    }
    actualSatoshis = totalInput - fee
  }

  if (totalInput < actualSatoshis + fee) {
    throw new Error(
      'Insufficient confirmed on-chain balance to cover amount + fee'
    )
  }

  // Build the transaction with the FINAL output amount (not the requested one).
  const tx = new Transaction()
  tx.from(utxos)
  tx.to(to, actualSatoshis)

  // _feePerKb makes bitcore's internal _estimateFee() (used by the
  // security-margin minimum AND the "fee too large" check) use this tier's
  // rate, so the explicit fee clears both checks.
  tx._feePerKb = tier.rate
  tx.fee(fee)

  // Only add a change output if there's a remainder. When change is added,
  // bitcore sets change = available - fee, so unspent == fee automatically.
  // When there's no change (full-balance send), actualSatoshis = totalInput - fee,
  // so unspent = totalInput - actualSatoshis = fee — also consistent.
  if (totalInput - actualSatoshis - fee > 0) {
    tx.change(changeAddress)
  }
  tx.sign(priv)

  const txHex = tx.serialize()
  const txid = await broadcastTx(txHex)
  return { txid, fee, amount: actualSatoshis / LITOSHI_PER_LTC }
}

// ---------------- Explorer URLs ----------------

export const explorerTxUrl = (txid: string) =>
  `https://sochain.com/tx/LTC/${txid}`

export const explorerAddressUrl = (addr: string) =>
  `https://sochain.com/address/LTC/${addr}`

export const LITOSHI_TO_LTC = (n: number) => n / LITOSHI_PER_LTC
