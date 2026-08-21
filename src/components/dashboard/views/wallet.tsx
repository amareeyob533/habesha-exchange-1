'use client'

import { useAuth } from '@/hooks/use-auth'
import { useUI } from '@/hooks/use-ui'
import { useUserSettings } from '@/hooks/use-user-settings'
import { formatUsd, formatTokenAmount } from '@/lib/format'
import { apiFetch } from '@/lib/api-client'
import { motion } from 'framer-motion'
import { ArrowDownToLine, ArrowUpFromLine, CreditCard, Loader2, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TokenIcon } from '@/components/common/token-icon'
import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'

export function WalletView() {
  const { balances, totalUsd, user, fetchMe } = useAuth()
  const { openDeposit, openWithdraw, setView } = useUI()
  const { settings } = useUserSettings()
  const { toast } = useToast()
  const [showTransfer, setShowTransfer] = useState(false)
  const [transferAmount, setTransferAmount] = useState('')
  const [transferring, setTransferring] = useState(false)

  const isVerified = user?.kycStatus === 'approved'
  const cardBalance = user?.cardBalance || 0
  const usdtBalance = balances.find((b) => b.symbol === 'USDT')

  async function transferToCard() {
    const amt = Number(transferAmount)
    if (!amt || amt <= 0) {
      toast({ variant: 'destructive', title: 'Invalid amount', description: 'Enter a valid USDT amount' })
      return
    }
    setTransferring(true)
    try {
      await apiFetch('/api/card/transfer', {
        method: 'POST',
        body: JSON.stringify({ token: 'USDT', amount: amt }),
      })
      await fetchMe()
      toast({ title: 'Transfer complete ✓', description: `${amt} USDT moved to your Habesha Card` })
      setTransferAmount('')
      setShowTransfer(false)
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Transfer failed', description: err.message })
    } finally {
      setTransferring(false)
    }
  }

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

      {/* Habesha Card balance + transfer (only for verified users) */}
      {isVerified && (
        <div className="glass-card rounded-2xl p-5 ring-1 ring-gold/15">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-gold" />
              <div>
                <div className="text-sm font-bold">Habesha Card Balance</div>
                <div className="text-xl font-extrabold tabular-nums text-gold">${cardBalance.toFixed(2)}</div>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="border-gold/30 text-gold hover:bg-gold/10"
              onClick={() => setShowTransfer(!showTransfer)}
            >
              {showTransfer ? 'Cancel' : 'Transfer to Card'}
            </Button>
          </div>

          {showTransfer && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-4 space-y-3 border-t border-border pt-4"
            >
              <div className="text-xs text-muted-foreground">
                Available USDT: <b className="text-foreground">{usdtBalance ? formatTokenAmount(usdtBalance.amount, 'USDT') : '0.00'} USDT</b>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Amount (USDT) to transfer to card</Label>
                <Input
                  type="number"
                  min="0"
                  step="any"
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(e.target.value)}
                  placeholder="e.g. 50"
                  className="bg-secondary/40"
                />
              </div>
              <Button
                className="w-full bg-gold-gradient font-semibold text-primary-foreground"
                disabled={transferring || !transferAmount}
                onClick={transferToCard}
              >
                {transferring ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                {transferring ? 'Transferring…' : 'Transfer to Card'}
              </Button>
            </motion.div>
          )}

          <button
            onClick={() => setView('card')}
            className="mt-3 flex w-full items-center justify-center gap-1 text-xs font-semibold text-gold hover:underline"
          >
            View Card <ArrowRight className="h-3 w-3" />
          </button>
        </div>
      )}

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
