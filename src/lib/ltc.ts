export const DATABASE = {
  // Litecoin network configuration
  LTC_NETWORK: 'litecoin', // mainnet
  LTC_TESTNET: 'litecoin/testnet',

  // API endpoints (public, no key required for basic reads)
  SOCHAIN_BASE: 'https://sochain.com/api/v2',

  // Address prefix for Litecoin mainnet P2PKH addresses start with 'L' or 'M'
  // We will generate unique deposit addresses per user
} as const
