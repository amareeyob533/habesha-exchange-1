import { NextResponse } from 'next/server'
import { TOKENS } from '@/lib/tokens'

// In-memory cache (survives between requests on Vercel serverless)
let priceCache: { data: any; timestamp: number } | null = null
const CACHE_TTL = 60 * 1000 // 60 seconds

interface CoinGeckoPrice {
  usd: number
  usd_24h_change: number
}

/** GET /api/market-data — returns real live prices from CoinGecko (cached 60s) */
export async function GET() {
  try {
    // Return cached data if fresh
    if (priceCache && Date.now() - priceCache.timestamp < CACHE_TTL) {
      return NextResponse.json(priceCache.data)
    }

    // Get all CoinGecko IDs (skip HABESHA — it's fixed price)
    const coingeckoIds = TOKENS.filter((t) => t.coingeckoId).map((t) => t.coingeckoId!)
    const idsParam = coingeckoIds.join(',')

    // Fetch real prices from CoinGecko (free API, no key needed)
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${idsParam}&vs_currencies=usd&include_24hr_change=true`
    const res = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      next: { revalidate: 60 },
    })

    let livePrices: Record<string, CoinGeckoPrice> = {}
    if (res.ok) {
      livePrices = await res.json()
    }

    // Build the response — use real price if available, otherwise fallback
    const tokens = TOKENS.map((t) => {
      const live = t.coingeckoId ? livePrices[t.coingeckoId] : null
      return {
        symbol: t.symbol,
        name: t.name,
        price: live?.usd ?? t.price,
        change24h: live?.usd_24h_change ?? t.change24h,
        color: t.color,
        icon: t.icon,
        iconUrl: t.iconUrl || null,
        coingeckoId: t.coingeckoId || null,
        fixed: !!t.fixed,
        internalOnly: !!t.internalOnly,
        listed: t.listed,
        networks: t.networks.map((n) => ({ name: n.name, address: n.address })),
        isLive: !!live,
      }
    })

    const responseData = { tokens, source: 'coingecko', fetchedAt: new Date().toISOString() }

    // Cache the result
    priceCache = { data: responseData, timestamp: Date.now() }

    return NextResponse.json(responseData)
  } catch (err: any) {
    console.error('market-data error:', err)
    // Return fallback prices if CoinGecko is unreachable
    const tokens = TOKENS.map((t) => ({
      symbol: t.symbol,
      name: t.name,
      price: t.price,
      change24h: t.change24h,
      color: t.color,
      icon: t.icon,
      iconUrl: t.iconUrl || null,
      coingeckoId: t.coingeckoId || null,
      fixed: !!t.fixed,
      internalOnly: !!t.internalOnly,
      listed: t.listed,
      networks: t.networks.map((n) => ({ name: n.name, address: n.address })),
      isLive: false,
    }))
    return NextResponse.json({ tokens, source: 'fallback', error: 'CoinGecko API unreachable' })
  }
}
