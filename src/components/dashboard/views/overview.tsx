'use client'

import { useAuth } from '@/hooks/use-auth'
import { useUI } from '@/hooks/use-ui'
import { useLiveRate } from '@/hooks/use-live-rate'
import { formatUsd, timeAgo } from '@/lib/format'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import { ArrowDownToLine, ArrowUpFromLine, Send, Plus, TrendingUp, ShoppingCart, LineChart, ArrowLeftRight, TrendingDown, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MiniMarketOverview } from '@/components/dashboard/views/mini-market'

export function OverviewView() {
  const { user, totalUsd, notifications } = useAuth()
  const { openDeposit, openWithdraw, setView, openBuy, openTokenDetail, balanceHidden, toggleBalanceHidden } = useUI()

  return (
    <div className="space-y-5">
      {/* Balance hero + quick actions */}
      <div className="grid gap-4 lg:grid-cols-3">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-2xl gradient-border glass-card p-6 lg:col-span-2"
        >
          <div className="bg-gold-glow pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full opacity-40" />
          <div className="relative">
            <div className="flex items-center justify-between">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Total Balance (USD)</div>
              <button
                onClick={toggleBalanceHidden}
                aria-label={balanceHidden ? 'Show balance' : 'Hide balance'}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground"
              >
                {balanceHidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <motion.div key={`${totalUsd}-${balanceHidden}`} initial={{ opacity: 0.5 }} animate={{ opacity: 1 }} className="mt-2 text-3xl font-bold tracking-tight tabular-nums sm:text-4xl">
              <span className="text-foreground">{balanceHidden ? '******' : formatUsd(totalUsd)}</span>
            </motion.div>
            <div className="mt-1 flex items-center gap-1.5 text-xs text-up">
              <TrendingUp className="h-3.5 w-3.5" /> Ready to trade
            </div>
            {/* CTA hierarchy: Deposit = solid cyan, others = ghost outline */}
            <div className="mt-5 flex flex-wrap gap-2">
              <Button className="bg-emerald-gradient font-bold text-primary-foreground shadow-gold" onClick={() => openDeposit('USDT')}>
                <ArrowDownToLine className="mr-1 h-4 w-4" /> Deposit
              </Button>
              <Button variant="ghost" className="border border-border/40 text-muted-foreground hover:text-foreground hover:bg-secondary/40" onClick={() => openWithdraw('USDT')}>
                <ArrowUpFromLine className="mr-1 h-4 w-4" /> Withdraw
              </Button>
              <Button variant="ghost" className="border border-border/40 text-muted-foreground hover:text-foreground hover:bg-secondary/40" onClick={() => openBuy()}>
                <ShoppingCart className="mr-1 h-4 w-4" /> Buy
              </Button>
              <Button variant="ghost" className="border border-border/40 text-muted-foreground hover:text-foreground hover:bg-secondary/40" onClick={() => openWithdraw('USDT')}>
                <Send className="mr-1 h-4 w-4" /> Transfer
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Quick Buy USDT card with LIVE fluctuating rate */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="relative overflow-hidden rounded-2xl gradient-border glass-card p-6"
        >
          <div className="bg-gold-glow pointer-events-none absolute -bottom-12 -right-12 h-40 w-40 rounded-full opacity-30" />
          <div className="relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <ShoppingCart className="h-4 w-4 text-gold" /> Buy USDT
              </div>
              <span className="flex items-center gap-1 rounded-full bg-up/15 px-2 py-0.5 text-[10px] font-bold text-up">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-up opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-up" />
                </span>
                LIVE
              </span>
            </div>
            <LiveRateDisplay />
            <Button className="shimmer-btn bg-gold-gradient mt-4 h-11 w-full font-bold text-primary-foreground shadow-gold hover:opacity-95" onClick={() => openBuy()}>
              Buy Now <ShoppingCart className="ml-1 h-4 w-4" />
            </Button>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Button variant="outline" size="sm" className="h-9 border-gold/30 text-gold hover:bg-gold/10" onClick={() => setView('exchange')}>
                <ArrowLeftRight className="mr-1 h-3.5 w-3.5" /> Exchange
              </Button>
              <Button variant="outline" size="sm" className="h-9 border-border" onClick={() => setView('wallet')}>
                <Plus className="mr-1 h-3.5 w-3.5" /> Wallet
              </Button>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Live Markets dashboard (replaces My Assets) */}
      <MiniMarketOverview onTokenClick={(symbol) => symbol && openTokenDetail(symbol)} />

      {/* Quick stats row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <QuickStat icon={LineChart} label="Markets" value="5" onClick={() => setView('markets')} />
        <QuickStat icon={ArrowLeftRight} label="Exchange" value="Swap" onClick={() => setView('exchange')} />
        <QuickStat icon={Plus} label="Wallet" value="Assets" onClick={() => setView('wallet')} />
        <QuickStat icon={Send} label="Transfer" value="UID" onClick={() => openWithdraw('USDT')} />
      </div>

      {/* Recent activity */}
      <div className="glass-card rounded-2xl p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-bold">Recent Activity</h3>
          <button onClick={() => setView('transactions')} className="text-xs font-medium text-gold hover:underline">View all →</button>
        </div>
        {notifications.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">No recent activity</div>
        ) : (
          <div className="space-y-2">
            {notifications.slice(0, 5).map((n) => (
              <div key={n.id} className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-secondary/30">
                <div className={`h-1.5 w-1.5 rounded-full ${n.type === 'success' ? 'bg-up' : n.type === 'warning' ? 'bg-down' : 'bg-gold'}`} />
                <div className="flex-1">
                  <div className="text-sm font-medium">{n.title}</div>
                  <div className="text-[11px] text-muted-foreground">{n.message}</div>
                </div>
                <div className="text-[10px] text-muted-foreground">{timeAgo(n.createdAt)}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function QuickStat({ icon: Icon, label, value, onClick }: { icon: any; label: string; value: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="group glass-card rounded-xl p-3 text-left transition-all hover:shadow-gold hover:border-gold/30"
    >
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gold/10 text-gold ring-1 ring-gold/20 transition-transform group-hover:scale-110">
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <div className="text-sm font-bold">{value}</div>
          <div className="text-[10px] text-muted-foreground">{label}</div>
        </div>
      </div>
    </button>
  )
}

/**
 * Live USDT/ETB rate display with fluctuating price, sparkline, direction arrow,
 * and next-update countdown. The rate changes between 185 and 187 at
 * random intervals (2/10/30 min).
 */
function LiveRateDisplay() {
  const { rate, prevRate, direction, history } = useLiveRate()
  const isUp = direction === 'up'
  const isDown = direction === 'down'
  const change = rate - prevRate

  // Build mini sparkline from history
  const w = 200, h = 36
  const rates = history.map((p) => p.rate)
  const min = Math.min(...rates, 185)
  const max = Math.max(...rates, 187)
  const range = max - min || 1
  const stepX = rates.length > 1 ? w / (rates.length - 1) : w
  const pathD = rates.map((p, i) => `${i === 0 ? 'M' : 'L'} ${i * stepX} ${h - ((p - min) / range) * h}`).join(' ')
  const areaD = `${pathD} L ${w} ${h} L 0 ${h} Z`

  return (
    <div className="mt-4">
      {/* Rate display */}
      <div className="flex items-center justify-center gap-2">
        <motion.div
          key={rate.toFixed(5)}
          initial={{ opacity: 0.6, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex items-baseline gap-1"
        >
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground">1 USDT =</span>
          <span className="text-4xl font-extrabold tabular-nums text-gold-gradient">{rate.toFixed(5)}</span>
          <span className="text-sm font-bold text-muted-foreground">ETB</span>
        </motion.div>
      </div>

      {/* Direction + change */}
      <div className="mt-1 flex items-center justify-center gap-2 text-xs">
        <span
          className={cn(
            'flex items-center gap-1 font-bold',
            isUp ? 'text-up' : isDown ? 'text-down' : 'text-muted-foreground',
          )}
        >
          {isUp && <TrendingUp className="h-3 w-3" />}
          {isDown && <TrendingDown className="h-3 w-3" />}
          {!isUp && !isDown && <span className="h-3 w-3 text-center">—</span>}
          {isUp ? '+' : ''}{change.toFixed(5)} ETB
        </span>
        <span className="text-muted-foreground">·</span>
        <span className={cn('font-semibold', isUp ? 'text-up' : isDown ? 'text-down' : 'text-muted-foreground')}>
          {isUp ? '+' : ''}{prevRate > 0 ? ((change / prevRate) * 100).toFixed(3) : '0.000'}%
        </span>
      </div>

      {/* Mini sparkline — interactive price history chart */}
      {rates.length > 1 && (
        <div className="mt-3 rounded-xl border border-border/30 bg-secondary/20 p-3">
          <div className="mb-1 flex items-center justify-between text-[10px] text-muted-foreground">
            <span>USDT/ETB Price History</span>
            <span className={cn('font-bold', isUp ? 'text-up' : isDown ? 'text-down' : 'text-muted-foreground')}>
              {isUp ? '▲' : isDown ? '▼' : '—'} {prevRate > 0 ? Math.abs(((change / prevRate) * 100)).toFixed(3) : '0.000'}%
            </span>
          </div>
          <div className="flex justify-center">
            <svg width={w} height={h + 8} className="overflow-visible">
              <defs>
                <linearGradient id="rate-spark-cyan" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={isUp ? '#00E08F' : isDown ? '#FF4D6D' : '#00D4FF'} stopOpacity={0.25} />
                  <stop offset="100%" stopColor={isUp ? '#00E08F' : isDown ? '#FF4D6D' : '#00D4FF'} stopOpacity={0} />
                </linearGradient>
              </defs>
              <path d={areaD} fill="url(#rate-spark-cyan)" />
              <path d={pathD} fill="none" stroke={isUp ? '#00E08F' : isDown ? '#FF4D6D' : '#00D4FF'} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
              {/* Last point dot with glow */}
              <circle cx={(rates.length - 1) * stepX} cy={h - ((rates[rates.length - 1] - min) / range) * h} r={3} fill={isUp ? '#00E08F' : isDown ? '#FF4D6D' : '#00D4FF'} />
              <circle cx={(rates.length - 1) * stepX} cy={h - ((rates[rates.length - 1] - min) / range) * h} r={6} fill={isUp ? '#00E08F' : isDown ? '#FF4D6D' : '#00D4FF'} opacity={0.2} />
            </svg>
          </div>
          {/* Range labels */}
          <div className="mt-1 flex justify-between text-[9px] text-muted-foreground">
            <span>Low: {min.toFixed(3)}</span>
            <span>High: {max.toFixed(3)}</span>
          </div>
        </div>
      )}

      {/* Bank options */}
      <div className="mt-2 text-center text-[11px] text-muted-foreground">Pay via CBE · Telebirr · Abay · M-PESA</div>
    </div>
  )
}
