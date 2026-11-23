import { NextResponse } from 'next/server'

// Server-side proxy to CoinGecko for LTC price (INR + USD) and 7-day history.
const COINGECKO = 'https://api.coingecko.com/api/v3'

export async function GET() {
  try {
    // Current price + 24h change for both LTC and SOL.
    const priceRes = await fetch(
      `${COINGECKO}/simple/price?ids=litecoin,solana&vs_currencies=inr,usd&include_24hr_change=true&include_last_updated_at=true`,
      { headers: { accept: 'application/json' } }
    )
    if (!priceRes.ok) {
      return NextResponse.json({ error: 'Price service unavailable' }, { status: 502 })
    }
    const priceJson = await priceRes.json()
    const ltc = priceJson?.litecoin
    const sol = priceJson?.solana
    if (!ltc || typeof ltc.inr !== 'number' || typeof ltc.usd !== 'number') {
      return NextResponse.json({ error: 'Price not found' }, { status: 502 })
    }

    // 7-day price history (INR) for LTC.
    let history: Array<{ t: number; p: number }> = []
    try {
      const histRes = await fetch(
        `${COINGECKO}/coins/litecoin/market_chart?vs_currency=inr&days=7`,
        { headers: { accept: 'application/json' } }
      )
      if (histRes.ok) {
        const histJson = await histRes.json()
        const prices: Array<[number, number]> = histJson?.prices ?? []
        // Downsample to ~40 points for a smooth, light chart.
        const step = Math.max(1, Math.floor(prices.length / 40))
        history = prices
          .filter((_, i) => i % step === 0)
          .map(([t, p]) => ({ t, p }))
      }
    } catch {
      // History is best-effort.
    }

    return NextResponse.json({
      priceInr: ltc.inr,
      priceUsd: ltc.usd,
      change24h: ltc.usd_24h_change ?? 0,
      changeInr24h: ltc.inr_24h_change ?? ltc.usd_24h_change ?? 0,
      lastUpdated: ltc.last_updated_at,
      history,
      sol:
        sol && typeof sol.inr === 'number' && typeof sol.usd === 'number'
          ? {
              priceInr: sol.inr,
              priceUsd: sol.usd,
              change24h: sol.usd_24h_change ?? 0,
              changeInr24h: sol.inr_24h_change ?? sol.usd_24h_change ?? 0,
              lastUpdated: sol.last_updated_at,
            }
          : null,
    })
  } catch (error) {
    console.error('Price API error:', error)
    return NextResponse.json(
      { error: 'Price service error' },
      { status: 500 }
    )
  }
}
