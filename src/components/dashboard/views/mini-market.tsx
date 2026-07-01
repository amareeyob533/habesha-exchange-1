'use client'

import { useEffect, useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { apiFetch } from '@/lib/api-client'
import { generatePriceHistory } from '@/lib/price-history'
import { formatUsd } from '@/lib/format'
import { cn } from '@/lib/utils'
import { TokenIcon } from '@/components/common/token-icon'

interface TokenInfo {
  symbol: string
  name: string
  price: number
  change24h: number
  color: string
  icon: string
  iconUrl?: string | null
}

const FALLBACK: TokenInfo[] = [
  { symbol: 'BTC', name: 'Bitcoin', price: 97500, change24h: 2.34, color: '#F7931A', icon: '₿' },
  { symbol: 'TON', name: 'Toncoin', price: 5.42, change24h: 4.12, color: '#0098EA', icon: '◆' },
  { symbol: 'USDT', name: 'Tether USD', price: 1, change24h: 0.01, color: '#26A17B', icon: '₮' },
  { symbol: 'USDC', name: 'USD Coin', price: 1, change24h: -0.02, color: '#2775CA', icon: '$' },
  { symbol: 'HABESHA', name: 'Habesha Token', price: 6.4321674, change24h: 0, color: '#F0B90B', icon: 'H' },
]

export function MiniMarketOverview({ onTokenClick }: { onTokenClick?: (symbol: string) => void }) {
  const [tokens, setTokens] = useState<TokenInfo[]>(FALLBACK)

  useEffect(() => {
    apiFetch<{ tokens: TokenInfo[] }>('/api/tokens').then((d) => setTokens(d.tokens)).catch(() => {})
  }, [])

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-lg font-bold">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-up opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-up" />
          </span>
          Live Markets
        </h3>
        <button onClick={() => onTokenClick?.('')} className="text-xs font-medium text-gold hover:underline">View charts →</button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {tokens.map((t, i) => (
          <MiniTokenCard key={t.symbol} token={t} delay={i * 0.05} onClick={() => onTokenClick?.(t.symbol)} />
        ))}
      </div>
    </div>
  )
}

function MiniTokenCard({ token, delay, onClick }: { token: TokenInfo; delay: number; onClick: () => void }) {
  const points = useMemo(() => generatePriceHistory(token.symbol, token.price, '1D', token.change24h), [token])
  const isUp = token.change24h >= 0
  const lineColor = token.symbol === 'HABESHA' ? '#F0B90B' : isUp ? '#0ECB81' : '#F6465D'
  const fillColor = token.symbol === 'HABESHA' ? '#F0B90B' : isUp ? '#0ECB81' : '#F6465D'

  // Build SVG sparkline path
  const w = 120
  const h = 40
  const prices = points.map((p) => p.price)
  const min = Math.min(...prices)
  const max = Math.max(...prices)
  const range = max - min || 1
  const stepX = w / (prices.length - 1)
  const pathD = prices.map((p, i) => `${i === 0 ? 'M' : 'L'} ${i * stepX} ${h - ((p - min) / range) * h}`).join(' ')
  const areaD = `${pathD} L ${w} ${h} L 0 ${h} Z`

  return (
    <motion.button
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      onClick={onClick}
      className="group glass-card rounded-2xl p-4 text-left transition-all hover:shadow-gold hover:border-gold/30"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <TokenIcon symbol={token.symbol} iconUrl={token.iconUrl} icon={token.icon} color={token.color} size={36} />
          <div>
            <div className="text-sm font-bold">{token.symbol}</div>
            <div className="text-[10px] text-muted-foreground">{token.name}</div>
          </div>
        </div>
        <div className={cn('text-xs font-bold', isUp ? 'text-up' : 'text-down')}>
          {isUp ? '▲' : '▼'} {Math.abs(token.change24h).toFixed(2)}%
        </div>
      </div>
      {/* Mini sparkline */}
      <div className="mt-3 flex items-end justify-between gap-3">
        <div>
          <div className="font-mono text-lg font-bold tabular-nums">
            {formatUsd(token.price, { max: token.price > 1000 ? 0 : 4 })}
          </div>
        </div>
        <svg width={w} height={h} className="overflow-visible">
          <defs>
            <linearGradient id={`spark-${token.symbol}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={fillColor} stopOpacity={0.3} />
              <stop offset="100%" stopColor={fillColor} stopOpacity={0} />
            </linearGradient>
          </defs>
          <path d={areaD} fill={`url(#spark-${token.symbol})`} />
          <path d={pathD} fill="none" stroke={lineColor} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
        </svg>
      </div>
    </motion.button>
  )
}
