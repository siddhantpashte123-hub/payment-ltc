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
const BASE58_CHARSET =
  '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'

/** A valid `ltc1` P2WPKH address is exactly "ltc1" + 38 chars = 42 total. */
export const LTC_BECH32_TOTAL = 42
/** A valid base58 LTC address (P2PKH/P2SH) is 34-40 chars. */
export const LTC_BASE58_MIN = 34
export const LTC_BASE58_MAX = 40

/** Strip copy-paste contamination (invisible/whitespace/stray chars). */
function sanitize(addr: string): string {
  return addr.replace(/[^A-Za-z0-9]/g, '')
}

/**
 * Diagnose a Litecoin address: return a human-readable reason when it is
 * NOT a valid-looking address, or null when it passes the format check.
 * This turns a generic "invalid address" into an actionable hint (e.g. the
 * exact wrong length for a near-miss `ltc1` address).
 */
export function diagnoseLtcAddress(addr: string): string | null {
  const a = sanitize(addr)
  if (!a) return 'Please enter a Litecoin address.'

  // --- Bech32 (ltc1) ---
  if (/^ltc1/i.test(a)) {
    const suffix = a.slice(4)
    if (suffix.length !== 38) {
      return `This looks like an "ltc1" address, but it has ${a.length} characters — a valid "ltc1" address is exactly ${LTC_BECH32_TOTAL}. Re-copy the address from the sender and paste it again (don't retype it), and double-check the length before sending.`
    }
    if (!/^[qpzry9x8gf2tvdw0s3jn54khce6mua7l]+$/.test(suffix)) {
      return `This "ltc1" address contains invalid characters — "ltc1" addresses use only: ${BECH32_CHARSET}.`
    }
    return null
  }

  // --- Base58 (L / M / 3) ---
  if (/^[L3M]/.test(a)) {
    if (a.length < LTC_BASE58_MIN || a.length > LTC_BASE58_MAX) {
      return `This address starts with "${a[0]}", but has ${a.length} characters — a valid Litecoin address has ${LTC_BASE58_MIN}–${LTC_BASE58_MAX}. Re-copy the address from the sender and paste it again (don't retype it), and double-check the length before sending.`
    }
    if (!/^[L3M][1-9A-HJ-NP-Za-km-z]+$/.test(a)) {
      return 'This address contains invalid characters (Litecoin base58 excludes 0, O, I, and l).'
    }
    return null
  }

  return 'Litecoin addresses start with "L", "M", "3", or "ltc1". Please check for typos.'
}

/** True if the input looks like a Litecoin address (base58 or Bech32). */
export function looksLikeLtcAddress(addr: string): boolean {
  return diagnoseLtcAddress(addr) === null
}

/** True if the input looks like a Solana address (base54, 32-44 chars). */
export function looksLikeSolAddress(addr: string): boolean {
  const a = sanitize(addr)
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(a)
}
