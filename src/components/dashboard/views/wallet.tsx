'use client'

import { useAuth } from '@/hooks/use-auth'
import { useUI } from '@/hooks/use-ui'
import { useUserSettings } from '@/hooks/use-user-settings'
import { formatUsd, formatTokenAmount } from '@/lib/format'
import { motion } from 'framer-motion'
import { ArrowDownToLine, ArrowUpFromLine } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TokenIcon } from '@/components/common/token-icon'

export function WalletView() {
  const { balances, totalUsd, user } = useAuth()
  const { openDeposit, openWithdraw } = useUI()
  const { settings } = useUserSettings()

  // Apply "Hide small balances" setting — hide tokens worth less than $1
  const visibleBalances = settings.hideSmallBalances
    ? balances.filter((b) => b.usdValue >= 1 || b.amount > 0 && b.usdValue > 0)
    : balances

  return (
    <div className="space-y-5">
      <div className="glass-card gradient-border rounded-2xl p-6">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">Total Estimated Value</div>
        <div className="mt-1 text-3xl font-extrabold tracking-tight tabular-nums"><span className="text-foreground">{formatUsd(totalUsd)}</span></div>
        <div className="mt-3 text-xs text-muted-foreground">{visibleBalances.length} assets · UID <b className="text-gold">{user?.uid}</b></div>
      </div>

      <div className="overflow-hidden glass-card rounded-2xl shadow-premium">
        <div className="grid grid-cols-12 gap-2 border-b border-border px-4 py-3 text-[11px] uppercase tracking-wider text-muted-foreground">
          <div className="col-span-4 sm:col-span-3">Asset</div>
          <div className="col-span-4 text-right sm:col-span-3">Balance</div>
          <div className="col-span-4 text-right sm:col-span-3">Value (USD)</div>
          <div className="col-span-12 mt-1 sm:col-span-3 sm:mt-0">Actions</div>
        </div>
        {visibleBalances.map((b, i) => (
          <motion.div
            key={b.symbol}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: i * 0.03 }}
            className="grid grid-cols-12 items-center gap-2 border-b border-border/50 px-4 py-3.5 last:border-0 transition-colors hover:bg-secondary/30"
          >
            <div className="col-span-4 flex items-center gap-2.5 sm:col-span-3">
              <TokenIcon symbol={b.symbol} iconUrl={b.iconUrl} icon={b.icon} color={b.color} size={36} />
              <div>
                <div className="flex items-center gap-1.5 text-sm font-bold">
                  {b.symbol}
                </div>
                <div className="text-[11px] text-muted-foreground">{b.name}</div>
              </div>
            </div>
            <div className="col-span-4 text-right font-mono text-sm font-semibold sm:col-span-3">{formatTokenAmount(b.amount, b.symbol)}</div>
            <div className="col-span-4 text-right font-mono text-sm text-muted-foreground sm:col-span-3">{formatUsd(b.usdValue)}</div>
            <div className="col-span-12 flex gap-1.5 sm:col-span-3 sm:justify-end">
              <Button size="sm" variant="outline" className="h-8 border-border text-xs" onClick={() => openDeposit(b.symbol)}>
                <ArrowDownToLine className="h-3 w-3" />
              </Button>
              <Button size="sm" variant="outline" className="h-8 border-border text-xs" onClick={() => openWithdraw(b.symbol)}>
                <ArrowUpFromLine className="h-3 w-3" />
              </Button>
            </div>
          </motion.div>
        ))}
      </div>

    </div>
  )
}
