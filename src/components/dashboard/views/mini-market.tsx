'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { apiFetch } from '@/lib/api-client'
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
  isLive?: boolean
}

const FALLBACK: TokenInfo[] = [
  { symbol: 'BTC', name: 'Bitcoin', price: 97500, change24h: 2.34, color: '#F7931A', icon: '₿' },
  { symbol: 'TON', name: 'Toncoin', price: 5.42, change24h: 4.12, color: '#0098EA', icon: '◆' },
  { symbol: 'USDT', name: 'Tether USD', price: 1, change24h: 0.01, color: '#26A17B', icon: '₮' },
  { symbol: 'USDC', name: 'USD Coin', price: 1, change24h: -0.02, color: '#2775CA', icon: '$' },
]

export function MiniMarketOverview({ onTokenClick }: { onTokenClick?: (symbol: string) => void }) {
  const [tokens, setTokens] = useState<TokenInfo[]>(FALLBACK)

  // Fetch real live prices from CoinGecko (via our API)
  useEffect(() => {
    const load = () => {
      apiFetch<{ tokens: TokenInfo[] }>('/api/market-data')
        .then((d) => setTokens(d.tokens))
        .catch(() => {})
    }
    load()
    // Refresh every 60 seconds
    const id = setInterval(load, 60000)
    return () => clearInterval(id)
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
  const isUp = token.change24h >= 0
  const lineColor = isUp ? '#00D68F' : '#FF4D6D'

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
      <div className="mt-3 flex items-end justify-between gap-3">
        <div>
          <div className="font-mono text-lg font-bold tabular-nums">
            {formatUsd(token.price, { max: token.price > 1000 ? 0 : 4 })}
          </div>
          {token.isLive && (
            <div className="mt-0.5 text-[9px] font-bold text-up">● LIVE</div>
          )}
        </div>
        {/* Mini bar showing up/down */}
        <div className="flex h-8 items-end gap-0.5">
          {[0.3, 0.5, 0.7, 0.4, 0.6, 0.8, 0.5].map((h, i) => (
            <div
              key={i}
              className="w-1 rounded-sm"
              style={{
                height: `${h * 100}%`,
                backgroundColor: lineColor,
                opacity: 0.3 + i * 0.1,
              }}
            />
          ))}
        </div>
      </div>
    </motion.button>
  )
}
