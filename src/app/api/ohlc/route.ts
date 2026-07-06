import { NextRequest, NextResponse } from 'next/server'
import { TOKENS } from '@/lib/tokens'

// In-memory cache per symbol+timeframe
const ohlcCache = new Map<string, { data: any; timestamp: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

const TIMEFRAME_DAYS: Record<string, number> = {
  '1D': 1,
  '1W': 7,
  '1M': 30,
  '3M': 90,
  '1Y': 365,
}

/** GET /api/ohlc?symbol=BTC&timeframe=1W — returns OHLC candlestick data from CoinGecko */
export async function GET(req: NextRequest) {
  try {
    const symbol = req.nextUrl.searchParams.get('symbol') || ''
    const timeframe = req.nextUrl.searchParams.get('timeframe') || '1W'

    const token = TOKENS.find((t) => t.symbol === symbol)
    if (!token) return NextResponse.json({ error: 'Invalid token' }, { status: 400 })

    // Tokens without CoinGecko IDs: return flat candles at fallback price
    if (!token.coingeckoId) {
      const now = Date.now()
      const candles = Array.from({ length: 20 }, (_, i) => ({
        t: now - (20 - i) * 3600000,
        o: token.price,
        h: token.price,
        l: token.price,
        c: token.price,
      }))
      return NextResponse.json({ candles, source: 'fixed' })
    }

    const days = TIMEFRAME_DAYS[timeframe] || 7
    const cacheKey = `${symbol}-${timeframe}`

    // Return cached if fresh
    const cached = ohlcCache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return NextResponse.json(cached.data)
    }

    // Fetch OHLC from CoinGecko
    // Returns array of [timestamp, open, high, low, close]
    const url = `https://api.coingecko.com/api/v3/coins/${token.coingeckoId}/ohlc?vs_currency=usd&days=${days}`
    const res = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      next: { revalidate: 300 },
    })

    if (!res.ok) {
      // Fallback: generate fake candles from the base price
      const candles = generateFallbackCandles(token.price, days)
      return NextResponse.json({ candles, source: 'fallback' })
    }

    const rawData: number[][] = await res.json()
    const candles = rawData.map((d) => ({
      t: d[0],
      o: d[1],
      h: d[2],
      l: d[3],
      c: d[4],
    }))

    const responseData = { candles, source: 'coingecko' }
    ohlcCache.set(cacheKey, { data: responseData, timestamp: Date.now() })

    return NextResponse.json(responseData)
  } catch (err: any) {
    console.error('ohlc error:', err)
    const token = TOKENS.find((t) => t.symbol === (req.nextUrl.searchParams.get('symbol') || ''))
    const price = token?.price || 1
    const candles = generateFallbackCandles(price, 7)
    return NextResponse.json({ candles, source: 'fallback' })
  }
}

function generateFallbackCandles(price: number, days: number): any[] {
  const count = Math.min(days * 4, 60)
  const now = Date.now()
  const step = (days * 24 * 3600000) / count
  return Array.from({ length: count }, (_, i) => {
    const variation = price * 0.02 * (Math.random() - 0.5)
    const o = price + variation
    const c = price + variation * (Math.random() - 0.5)
    const h = Math.max(o, c) + price * 0.01 * Math.random()
    const l = Math.min(o, c) - price * 0.01 * Math.random()
    return { t: now - (count - i) * step, o, h, l, c }
  })
}
