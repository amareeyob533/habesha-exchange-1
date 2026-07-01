'use client'

import { useMemo, useState } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import { generatePriceHistory, priceStats, type Timeframe, type PricePoint } from '@/lib/price-history'
import { formatUsd } from '@/lib/format'
import { cn } from '@/lib/utils'

const TIMEFRAMES: Timeframe[] = ['1D', '1W', '1M', '3M', '1Y']

interface TokenChartProps {
  symbol: string
  currentPrice: number
  change24h: number
  color: string
}

export function TokenChart({ symbol, currentPrice, change24h, color }: TokenChartProps) {
  const [tf, setTf] = useState<Timeframe>('1W')

  const points = useMemo<PricePoint[]>(
    () => generatePriceHistory(symbol, currentPrice, tf, change24h),
    [symbol, currentPrice, tf, change24h],
  )
  const stats = useMemo(() => priceStats(points), [points])
  const isUp = stats.change >= 0
  const lineColor = symbol === 'HABESHA' ? '#F0B90B' : isUp ? '#0ECB81' : '#F6465D'

  const data = points.map((p) => ({ t: p.t, price: p.price }))

  return (
    <div className="space-y-3">
      {/* Price header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-2xl font-extrabold tracking-tight">
            <span className={isUp ? 'text-up' : 'text-foreground'}>{formatUsd(currentPrice, { max: currentPrice > 1000 ? 2 : 6 })}</span>
          </div>
          <div className={cn('mt-0.5 text-sm font-semibold', isUp ? 'text-up' : 'text-down')}>
            {isUp ? '▲' : '▼'} {Math.abs(stats.change).toFixed(2)}% · {tf}
          </div>
        </div>
        {/* Timeframe selector */}
        <div className="inline-flex rounded-lg border border-border bg-secondary/40 p-0.5">
          {TIMEFRAMES.map((t) => (
            <button
              key={t}
              onClick={() => setTf(t)}
              className={cn(
                'rounded-md px-2.5 py-1 text-xs font-bold transition-colors',
                tf === t ? 'bg-gold text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="h-[240px] w-full sm:h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={`grad-${symbol}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={lineColor} stopOpacity={0.35} />
                <stop offset="100%" stopColor={lineColor} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis
              dataKey="t"
              tickFormatter={(t) => formatTick(t, tf)}
              stroke="rgba(139,139,149,0.6)"
              tick={{ fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              minTickGap={32}
            />
            <YAxis
              domain={['auto', 'auto']}
              tickFormatter={(v) => formatUsd(v, { max: v > 1000 ? 0 : v > 1 ? 2 : 4 })}
              stroke="rgba(139,139,149,0.6)"
              tick={{ fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              width={56}
              orientation="right"
            />
            <Tooltip
              content={<ChartTooltip symbol={symbol} />}
              cursor={{ stroke: lineColor, strokeWidth: 1, strokeDasharray: '3 3' }}
            />
            <Area
              type="monotone"
              dataKey="price"
              stroke={lineColor}
              strokeWidth={2}
              fill={`url(#grad-${symbol})`}
              isAnimationActive
              animationDuration={400}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2 text-xs">
        <Stat label={`${tf} High`} value={formatUsd(stats.high, { max: currentPrice > 1000 ? 0 : 4 })} />
        <Stat label={`${tf} Low`} value={formatUsd(stats.low, { max: currentPrice > 1000 ? 0 : 4 })} />
        <Stat label={`${tf} Change`} value={`${isUp ? '+' : ''}${stats.change.toFixed(2)}%`} valueClass={isUp ? 'text-up' : 'text-down'} />
      </div>
    </div>
  )
}

function Stat({ label, value, valueClass = '' }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="rounded-lg border border-border bg-secondary/30 px-3 py-2">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={cn('mt-0.5 font-mono font-semibold', valueClass)}>{value}</div>
    </div>
  )
}

function formatTick(t: number, tf: Timeframe): string {
  const d = new Date(t)
  if (tf === '1D') return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  if (tf === '1W' || tf === '1M') return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
}

function ChartTooltip({ active, payload, symbol }: any) {
  if (!active || !payload?.length) return null
  const point = payload[0].payload as { t: number; price: number }
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-xl">
      <div className="font-mono font-bold text-foreground">{formatUsd(point.price, { max: point.price > 1000 ? 2 : 6 })}</div>
      <div className="mt-0.5 text-[10px] text-muted-foreground">
        {new Date(point.t).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
      </div>
      <div className="mt-0.5 text-[10px] font-semibold text-gold">{symbol}</div>
    </div>
  )
}
