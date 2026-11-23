/**
 * Fee-tier definitions and estimation helpers.
 *
 * Kept in a separate module with NO heavy dependencies (no bitcore import)
 * so client components can import the fee-tier constants without pulling the
 * full blockchain library into the browser bundle (which would otherwise
 * trigger a "more than one instance of bitcore-lib" prerender error).
 */

export type FeeTier = 'economy' | 'normal' | 'fast'

/**
 * Fee priority tiers. The rate is litoshi-per-kb (bitcore's default
 * FEE_PER_KB = 10000). Lower rate = cheaper but slower confirmation; higher
 * rate = priority. The buffer is a safety margin on top of the estimate.
 * All tiers clear bitcore's security-margin minimum (ceil(estimate/15)).
 */
export const FEE_TIERS: Record<
  FeeTier,
  { rate: number; buffer: number; label: string; hint: string }
> = {
  economy: {
    rate: 4000,
    buffer: 1.0,
    label: 'Economy',
    hint: 'Lowest fee — confirms slower',
  },
  normal: {
    rate: 10000,
    buffer: 1.1,
    label: 'Normal',
    hint: 'Balanced fee — confirms in minutes',
  },
  fast: {
    rate: 18000,
    buffer: 1.1,
    label: 'Fast',
    hint: 'Higher fee — prioritized confirmation',
  },
}

/**
 * Estimate a tx fee in litoshi from the number of inputs (for display).
 * Tx size ~ inputs*148 + 2 outputs*34 + 10 bytes.
 */
export function estimateFeeLitoshi(
  utxoCount: number,
  tier: FeeTier = 'normal'
): number {
  const size = utxoCount * 148 + 2 * 34 + 10
  const t = FEE_TIERS[tier]
  return Math.ceil((size / 1000) * t.rate * t.buffer)
}

/**
 * Fixed Solana base network fee in SOL (5000 lamports).
 * Lives in fees.ts (no heavy client deps) so client components can display the
 * SOL fee without pulling @solana/web3.js into the browser bundle.
 */
export const SOL_FEE_LTC = 0.000005
