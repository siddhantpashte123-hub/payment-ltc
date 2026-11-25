/**
 * Client-safe address FORMAT checks.
 *
 * These are lightweight format checks (regex only — no heavy crypto
 * dependencies) so they are safe to import in client components, unlike the
 * server-side `resolveLtcRecipient()` in blockchain.ts which pulls in
 * bitcore-lib-litecoin (importing that on the client triggers a "more than
 * one instance of bitcore-lib" prerender error).
 *
 * They give instant inline feedback on the withdraw page. The server still
 * performs FULL validation before any funds move — this is only a UX aid.
 */

/** Bech32 character set (excludes 0, 1, b, i, o). */
const BECH32_CHARSET = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l'
/** Base58 character set (excludes 0, O, I, l). */
const BASE58_CHARSET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'

/** Strip copy-paste contamination (invisible/whitespace/stray chars). */
function sanitize(addr: string): string {
  return addr.replace(/[^A-Za-z0-9]/g, '')
}

/** True if the input looks like a Litecoin address (base58 or Bech32). */
export function looksLikeLtcAddress(addr: string): boolean {
  const a = sanitize(addr)
  if (!a) return false

  // Bech32: "ltc1" + 38 bech32-charset chars (data + checksum), ~42 total.
  if (/^ltc1[qpzry9x8gf2tvdw0s3jn54khce6mua7l]{38}$/i.test(a)) return true

  // Base58: L (P2PKH), M/3 (P2SH), 34-40 chars.
  if (/^[L3M][1-9A-HJ-NP-Za-km-z]{33,39}$/.test(a)) return true

  return false
}

/** True if the input looks like a Solana address (base54, 32-44 chars). */
export function looksLikeSolAddress(addr: string): boolean {
  const a = sanitize(addr)
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(a)
}
