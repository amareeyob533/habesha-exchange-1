// Deterministic historical price-data generator for token charts.
// Uses a seeded PRNG so each token's chart is stable across renders.

export type Timeframe = '1D' | '1W' | '1M' | '3M' | '1Y'

export interface PricePoint {
  t: number // timestamp (ms)
  price: number
}

/** Mulberry32 seeded PRNG. */
function mulberry32(seed: number) {
  return function () {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function seedFromSymbol(symbol: string): number {
  let h = 0
  for (let i = 0; i < symbol.length; i++) {
    h = (Math.imul(31, h) + symbol.charCodeAt(i)) | 0
  }
  return Math.abs(h) || 1
}

/** Per-token daily volatility (fraction). Stablecoins ~0.1%, BTC ~3%, alts ~5%. */
function volatilityFor(symbol: string): number {
  if (symbol === 'USDT' || symbol === 'USDC') return 0.0015
  if (symbol === 'BTC') return 0.03
  if (symbol === 'TON') return 0.05
  return 0.04
}

const TF_CONFIG: Record<Timeframe, { points: number; stepMs: number }> = {
  '1D': { points: 24, stepMs: 60 * 60 * 1000 }, // hourly
  '1W': { points: 7, stepMs: 24 * 60 * 60 * 1000 }, // daily
  '1M': { points: 30, stepMs: 24 * 60 * 60 * 1000 },
  '3M': { points: 90, stepMs: 24 * 60 * 60 * 1000 },
  '1Y': { points: 365, stepMs: 24 * 60 * 60 * 1000 },
}

/**
 * Generate deterministic historical price points ending at `currentPrice`.
 * For zero-volatility tokens (e.g. stablecoins at peg), returns a flat line.
 */
export function generatePriceHistory(
  symbol: string,
  currentPrice: number,
  timeframe: Timeframe,
  change24h: number,
): PricePoint[] {
  const { points, stepMs } = TF_CONFIG[timeframe]
  const now = Date.now()
  const vol = volatilityFor(symbol)

  // Fixed-price token → flat line.
  if (vol === 0 || currentPrice <= 0) {
    return Array.from({ length: points }, (_, i) => ({
      t: now - (points - 1 - i) * stepMs,
      price: currentPrice,
    }))
  }

  const rng = mulberry32(seedFromSymbol(symbol) + timeframe.charCodeAt(0) * 1000)
  // Walk backward from current price: each step = current * (1 + random * vol * direction)
  const prices: number[] = new Array(points)
  prices[points - 1] = currentPrice
  for (let i = points - 2; i >= 0; i--) {
    // Bias slightly so the 24h change is reflected for the 1D timeframe.
    const drift = timeframe === '1D' ? change24h / 100 / points : 0
    const shock = (rng() * 2 - 1) * vol
    prices[i] = prices[i + 1] / (1 + drift + shock)
  }

  return prices.map((price, i) => ({
    t: now - (points - 1 - i) * stepMs,
    price: Math.max(price, currentPrice * 0.01), // floor at 1% of current
  }))
}

/** Compute high/low/range stats from a price series. */
export function priceStats(points: PricePoint[]) {
  const prices = points.map((p) => p.price)
  const high = Math.max(...prices)
  const low = Math.min(...prices)
  const first = prices[0]
  const last = prices[prices.length - 1]
  const change = first > 0 ? ((last - first) / first) * 100 : 0
  return { high, low, change, first, last }
}
