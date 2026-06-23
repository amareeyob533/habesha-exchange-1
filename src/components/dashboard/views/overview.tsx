'use client'

import { useAuth } from '@/hooks/use-auth'
import { useUI } from '@/hooks/use-ui'
import { formatUsd, formatTokenAmount, timeAgo } from '@/lib/format'
import { motion } from 'framer-motion'
import { ArrowDownToLine, ArrowUpFromLine, Send, Plus, TrendingUp, ShoppingCart } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function OverviewView() {
  const { user, balances, totalUsd, notifications } = useAuth()
  const { openDeposit, openWithdraw, setView, openBuy } = useUI()

  return (
    <div className="space-y-5">
      {/* Balance hero + quick actions */}
      <div className="grid gap-4 lg:grid-cols-3">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-gold/10 via-card to-card p-6 lg:col-span-2"
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
                <ShoppingCart className="mr-1 h-4 w-4" /> Buy
              </Button>
              <Button variant="outline" onClick={() => openWithdraw('USDT')}>
                <Send className="mr-1 h-4 w-4" /> Transfer
              </Button>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="rounded-2xl border border-border bg-card p-6"
        >
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold">Account Status</div>
          </div>
          <div className="mt-4 space-y-3">
            <StatusRow label="UID" value={user?.uid || '—'} mono />
            <StatusRow label="Username" value={user?.username ? `@${user.username}` : '—'} />
            <StatusRow label="Member since" value={user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'} />
          </div>
          <Button variant="outline" className="mt-4 w-full border-gold/30 text-gold hover:bg-gold/10" onClick={() => setView('wallet')}>
            View Wallet <Plus className="ml-1 h-3 w-3" />
          </Button>
        </motion.div>
      </div>

      {/* Balances grid */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-bold">My Assets</h3>
          <button onClick={() => setView('wallet')} className="text-xs font-medium text-gold hover:underline">View all →</button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {balances.map((b, i) => (
            <motion.div
              key={b.symbol}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="group rounded-2xl border border-border bg-card p-4 transition-colors hover:border-gold/40"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold" style={{ backgroundColor: `${b.color}22`, color: b.color }}>
                    {b.icon}
                  </div>
                  <div>
                    <div className="text-sm font-bold">{b.symbol}</div>
                    <div className="text-[11px] text-muted-foreground">{b.name}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-sm font-semibold">{formatTokenAmount(b.amount, b.symbol)}</div>
                  <div className="text-[11px] text-muted-foreground">{formatUsd(b.usdValue)}</div>
                </div>
              </div>
              <div className="mt-3 flex gap-1.5">
                <Button size="sm" variant="outline" className="h-8 flex-1 border-border text-xs" disabled={b.symbol === 'HABESHA'} onClick={() => openDeposit(b.symbol)}>
                  Deposit
                </Button>
                <Button size="sm" variant="outline" className="h-8 flex-1 border-border text-xs" onClick={() => openWithdraw(b.symbol)}>
                  {b.symbol === 'HABESHA' ? 'Send' : 'Withdraw'}
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Recent activity */}
      <div className="rounded-2xl border border-border bg-card p-5">
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

function StatusRow({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={mono ? 'font-mono font-bold text-gold' : 'font-medium'}>{value}</span>
    </div>
  )
}
