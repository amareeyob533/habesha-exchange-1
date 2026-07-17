'use client'

import { useMemo, useState, useEffect } from 'react'
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import { apiFetch } from '@/lib/api-client'
import { formatUsd } from '@/lib/format'
import { cn } from '@/lib/utils'

const TIMEFRAMES = ['1D', '1W', '1M', '3M', '1Y'] as const
type Timeframe = typeof TIMEFRAMES[number]

interface Candle {
  t: number
  o: number
  h: number
  l: number
  c: number
}

interface TokenChartProps {
  symbol: string
  currentPrice: number
  change24h: number
  color: string
}

export function TokenChart({ symbol, currentPrice, change24h, color }: TokenChartProps) {
  const [tf, setTf] = useState<Timeframe>('1W')
  const [candles, setCandles] = useState<Candle[]>([])
  const [loading, setLoading] = useState(true)

  // Fetch real OHLC candlestick data
  useEffect(() => {
    let cancelled = false
    const fetchData = async () => {
      setLoading(true)
      try {
        const data = await apiFetch<{ candles: Candle[]; source: string }>(`/api/ohlc?symbol=${symbol}&timeframe=${tf}`)
        if (!cancelled) {
          setCandles(data.candles || [])
        }
      } catch {
        if (!cancelled) setCandles([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchData()
    return () => { cancelled = true }
  }, [symbol, tf])

  // Compute stats
  const stats = useMemo(() => {
    if (candles.length === 0) return { high: 0, low: 0, change: 0 }
    const highs = candles.map((c) => c.h)
    const lows = candles.map((c) => c.l)
    const first = candles[0].o
    const last = candles[candles.length - 1].c
    return {
      high: Math.max(...highs),
      low: Math.min(...lows),
      change: first > 0 ? ((last - first) / first) * 100 : 0,
    }
  }, [candles])

  const isUp = stats.change >= 0
  const lineColor = isUp ? '#00D68F' : '#FF4D6D'

  return (
    <div className="space-y-3">
      {/* Price header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-2xl font-extrabold tracking-tight">
            <span className={isUp ? 'text-up' : 'text-foreground'}>
              {formatUsd(currentPrice, { max: currentPrice > 1000 ? 2 : 6 })}
            </span>
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

      {/* Candlestick chart */}
      <div className="h-[240px] w-full sm:h-[280px]">
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-gold border-t-transparent" />
          </div>
        ) : candles.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            No data available
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={candles} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={`candle-up-${symbol}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#00D68F" stopOpacity={0.8} />
                  <stop offset="100%" stopColor="#00D68F" stopOpacity={0.4} />
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
                content={<CandleTooltip symbol={symbol} />}
                cursor={{ stroke: lineColor, strokeWidth: 1, strokeDasharray: '3 3' }}
              />
              {/* Candle wicks (high-low range) */}
              <Bar
                dataKey={(d: Candle) => [d.l, d.h]}
                shape={(props: any) => <Wick {...props} color={lineColor} />}
                isAnimationActive={false}
              />
              {/* Candle bodies (open-close) */}
              <Bar
                dataKey={(d: Candle) => [d.o, d.c]}
                shape={(props: any) => <CandleBody {...props} color={lineColor} />}
                isAnimationActive
                animationDuration={400}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
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

// Custom candle wick (vertical line from low to high)
function Wick(props: any, color: string) {
  const { x, width, y, height, payload } = props
  if (!payload) return null
  const wickX = x + width / 2
  return (
    <line
      x1={wickX}
      x2={wickX}
      y1={y}
      y2={y + height}
      stroke={payload.c >= payload.o ? '#00D68F' : '#FF4D6D'}
      strokeWidth={1}
    />
  )
}

// Custom candle body (rectangle from open to close)
function CandleBody(props: any, color: string) {
  const { x, width, y, height, payload } = props
  if (!payload || height === 0) return null
  const isUp = payload.c >= payload.o
  const bodyColor = isUp ? '#00D68F' : '#FF4D6D'
  const bodyWidth = Math.max(width * 0.6, 2)
  const bodyX = x + (width - bodyWidth) / 2
  return (
    <rect
      x={bodyX}
      y={y}
      width={bodyWidth}
      height={Math.max(height, 1)}
      fill={bodyColor}
      opacity={0.9}
      rx={1}
    />
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

function CandleTooltip({ active, payload, symbol }: any) {
  if (!active || !payload?.length) return null
  const candle = payload[0]?.payload as Candle
  if (!candle) return null
  const isUp = candle.c >= candle.o
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-xl">
      <div className="font-mono font-bold text-foreground">
        O: {formatUsd(candle.o, { max: candle.o > 1000 ? 2 : 6 })}
      </div>
      <div className="font-mono text-up">
        H: {formatUsd(candle.h, { max: candle.h > 1000 ? 2 : 6 })}
      </div>
      <div className="font-mono text-down">
        L: {formatUsd(candle.l, { max: candle.l > 1000 ? 2 : 6 })}
      </div>
      <div className={`font-mono ${isUp ? 'text-up' : 'text-down'}`}>
        C: {formatUsd(candle.c, { max: candle.c > 1000 ? 2 : 6 })}
      </div>
      <div className="mt-0.5 text-[10px] text-muted-foreground">
        {new Date(candle.t).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
      </div>
      <div className="mt-0.5 text-[10px] font-semibold text-gold">{symbol}</div>
    </div>
  )
}
