'use client'

import { useCallback, useEffect, useState } from 'react'

export type FiatCurrency = 'INR' | 'USD'

const STORAGE_KEY = 'bw_fiat_currency'

/**
 * Client-side fiat currency preference (INR / USD), persisted to
 * localStorage. Prices from /api/price carry both INR and USD values, so we
 * only need to remember which one the user prefers.
 */
export function useFiatCurrency() {
  const [currency, setCurrencyState] = useState<FiatCurrency>('INR')
  const [ready, setReady] = useState(false)

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY)
      if (stored === 'USD' || stored === 'INR') {
        setCurrencyState(stored)
      }
    } catch {
      // ignore
    }
    setReady(true)
  }, [])

  const setCurrency = useCallback((next: FiatCurrency) => {
    setCurrencyState(next)
    try {
      window.localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // ignore
    }
  }, [])

  const toggle = useCallback(() => {
    setCurrency(currency === 'INR' ? 'USD' : 'INR')
  }, [currency, setCurrency])

  return { currency, setCurrency, toggle, ready }
}

/** Format a fiat amount with the correct symbol + grouping. */
export function formatFiat(amount: number, currency: FiatCurrency): string {
  const symbol = currency === 'INR' ? '₹' : '$'
  return `${symbol}${amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}
