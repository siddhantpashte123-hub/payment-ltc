import { PrivateKey, Transaction } from 'bitcore-lib-litecoin'
import crypto from 'crypto'

/**
 * Blockchain engine for the LTC wallet.
 * - Real Litecoin mainnet addresses generated per user (with private keys,
 *   encrypted at rest with WALLET_SECRET_KEY).
 * - Deposit detection via SoChain API (confirmed balance + incoming txs).
 * - Real send broadcasting via SoChain (UTXO selection, signing, broadcast).
 * - Explorer URLs for transactions and addresses.
 *
 * NOTE: private keys are encrypted with AES-256-GCM using a secret derived from
 * WALLET_SECRET_KEY. In production, keep WALLET_SECRET_KEY strong and never
 * expose it to the client.
 */

const SOCHAIN_BASE = 'https://sochain.com/api/v2'
const NETWORK = 'LTC' // Litecoin mainnet
const LITOSHI_PER_LTC = 100_000_000 // 1 LTC = 1e8 litoshis

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
  return Buffer.concat([decipher.update(data), decipher.final()]).toString(
    'utf8'
  )
}

// ---------------- Address generation ----------------

export function generateWallet(): { address: string; wif: string } {
  const priv = new PrivateKey()
  return {
    address: priv.toAddress().toString(),
    wif: priv.toWIF(),
  }
}

// ---------------- SoChain API ----------------

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

/** Confirmed on-chain balance (LTC) for an address. */
export async function getAddressBalance(address: string): Promise<number> {
  try {
    const data = await sochainGet<{ confirmed: string }>(
      `get_balance/${NETWORK}/${address}`
    )
    return parseFloat(data.confirmed) || 0
  } catch (e) {
    // If the address has no activity, SoChain may error — treat as 0.
    console.error('getAddressBalance error:', e)
    return 0
  }
}

/** Unspent outputs for building a send transaction. */
export async function getUnspent(address: string) {
  const data = await sochainGet<{
    txs?: Array<{
      txid: string
      output_no: number
      script_hex: string
      value: string
      confirmations: number
    }>
  }>(`get_tx_unspent/${NETWORK}/${address}`)

  return (data.txs || []).map((t) => ({
    txId: t.txid,
    outputNo: t.output_no,
    script: Buffer.from(t.script_hex, 'hex'),
    satoshis: Math.floor(parseFloat(t.value) * LITOSHI_PER_LTC),
    address,
  }))
}

/** Recent transactions for an address (for deposit detection + tx ids). */
export async function getRecentTxs(address: string) {
  const data = await sochainGet<{
    txs?: Array<{
      txid: string
      confirmations: number
      time: number
      value: string
      inputs: Array<{ address?: string; value?: string }>
      outputs: Array<{ address?: string; value?: string }>
    }>
  }>(`get_tx/${NETWORK}/${address}`)
  return data.txs || []
}

/** Broadcast a signed raw transaction; returns the txid. */
export async function broadcastTx(txHex: string): Promise<string> {
  const res = await fetch(`${SOCHAIN_BASE}/send_tx/${NETWORK}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ tx_hex: txHex }),
  })
  const json = await res.json()
  if (json.status !== 'success') {
    throw new Error(`Broadcast failed: ${JSON.stringify(json).slice(0, 300)}`)
  }
  return json.data.txid
}

// ---------------- Send ----------------

export interface SendResult {
  txid: string
  fee: number
}

/**
 * Build, sign, and broadcast a real Litecoin transaction.
 * Selects UTXOs, pays a modest fee, returns change to the sender address.
 */
export async function sendLtc(params: {
  to: string
  amount: number
  wif: string
  changeAddress: string
}): Promise<SendResult> {
  const { to, amount, wif, changeAddress } = params
  const satoshis = Math.floor(amount * LITOSHI_PER_LTC)

  const utxos = await getUnspent(changeAddress)
  const totalInput = utxos.reduce((s, u) => s + u.satoshis, 0)

  // Estimate fee: ~5 litoshi/byte, tx ~ inputs*148 + outputs*34 + 10 bytes.
  const approxSize = utxos.length * 148 + 2 * 34 + 10
  const fee = Math.max(1000, approxSize * 5)

  if (totalInput < satoshis + fee) {
    throw new Error(
      'Insufficient confirmed on-chain balance to cover amount + fee'
    )
  }

  const priv = new PrivateKey(wif)
  const tx = new Transaction()
  tx.from(utxos)
  tx.to(to, satoshis)

  // Only add a change output if there's a remainder.
  if (totalInput - satoshis - fee > 0) {
    tx.change(changeAddress)
  }
  tx.fee(fee)
  tx.sign(priv)

  const txHex = tx.serialize()
  const txid = await broadcastTx(txHex)
  return { txid, fee }
}

// ---------------- Explorer URLs ----------------

export const explorerTxUrl = (txid: string) =>
  `https://sochain.com/tx/LTC/${txid}`

export const explorerAddressUrl = (addr: string) =>
  `https://sochain.com/address/LTC/${addr}`

export const LITOSHI_TO_LTC = (n: number) => n / LITOSHI_PER_LTC
