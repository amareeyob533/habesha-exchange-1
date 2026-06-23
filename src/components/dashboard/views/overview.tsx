'use client'

import { useAuth } from '@/hooks/use-auth'
import { useUI } from '@/hooks/use-ui'
import { formatUsd, timeAgo } from '@/lib/format'
import { motion } from 'framer-motion'
import { ArrowDownToLine, ArrowUpFromLine, Send, Plus, TrendingUp, ShoppingCart, LineChart, ArrowLeftRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MiniMarketOverview } from '@/components/dashboard/views/mini-market'
import { BUY_ETB_RATE } from '@/lib/buy-config'

export function OverviewView() {
  const { user, totalUsd, notifications } = useAuth()
  const { openDeposit, openWithdraw, setView, openBuy, openTokenDetail } = useUI()

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
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Total Balance (USD)</div>
            <motion.div key={totalUsd} initial={{ opacity: 0.5 }} animate={{ opacity: 1 }} className="mt-2 text-4xl font-extrabold tracking-tight tabular-nums sm:text-5xl">
              <span className="text-foreground">{formatUsd(totalUsd)}</span>
            </motion.div>
            <div className="mt-1 flex items-center gap-1.5 text-xs text-up">
              <TrendingUp className="h-3.5 w-3.5" /> Ready to trade
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button className="bg-gold-gradient font-semibold text-primary-foreground" onClick={() => openDeposit('USDT')}>
                <ArrowDownToLine className="mr-1 h-4 w-4" /> Deposit
              </Button>
              <Button variant="outline" className="border-gold/30 text-gold hover:bg-gold/10" onClick={() => openWithdraw('USDT')}>
                <ArrowUpFromLine className="mr-1 h-4 w-4" /> Withdraw
              </Button>
              <Button variant="outline" onClick={() => openBuy()}>
                <ShoppingCart className="mr-1 h-4 w-4" /> Buy USDT
              </Button>
              <Button variant="outline" onClick={() => openWithdraw('USDT')}>
                <Send className="mr-1 h-4 w-4" /> Transfer
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Quick Buy USDT card */}
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
              <span className="rounded-full bg-gold/15 px-2 py-0.5 text-[10px] font-bold text-gold">LIVE</span>
            </div>
            <div className="mt-4 text-center">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">1 USDT =</div>
              <div className="text-4xl font-extrabold text-gold-gradient">{BUY_ETB_RATE} ETB</div>
              <div className="mt-1 text-[11px] text-muted-foreground">Pay via CBE · Telebirr · Abay · EMPSA</div>
            </div>
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
