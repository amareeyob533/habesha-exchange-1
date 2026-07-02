'use client'

import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useUI } from '@/hooks/use-ui'
import { useAuth } from '@/hooks/use-auth'
import { apiFetch } from '@/lib/api-client'
import { formatUsd } from '@/lib/format'
import { TokenChart } from '@/components/markets/token-chart'
import { TokenIcon } from '@/components/common/token-icon'
import { ArrowDownToLine, ArrowUpFromLine, Send, TrendingUp, TrendingDown, Info, Lock } from 'lucide-react'
import { motion } from 'framer-motion'

interface TokenInfo {
  symbol: string
  name: string
  price: number
  change24h: number
  color: string
  icon: string
  iconUrl?: string | null
  fixed?: boolean
  internalOnly?: boolean
  listed: boolean
  isLive?: boolean
}

const FALLBACK: TokenInfo[] = [
  { symbol: 'USDT', name: 'Tether USD', price: 1, change24h: 0.01, color: '#26A17B', icon: '₮', listed: true },
  { symbol: 'USDC', name: 'USD Coin', price: 1, change24h: -0.02, color: '#2775CA', icon: '$', listed: true },
  { symbol: 'BTC', name: 'Bitcoin', price: 97500, change24h: 2.34, color: '#F7931A', icon: '₿', listed: true },
  { symbol: 'TON', name: 'Toncoin', price: 5.42, change24h: 4.12, color: '#0098EA', icon: '◆', listed: true },
  { symbol: 'HABESHA', name: 'Habesha Token', price: 6.4321674, change24h: 0, color: '#F0B90B', icon: 'H', fixed: true, internalOnly: true, listed: false },
]

export function TokenDetailModal() {
  const { tokenDetail, openTokenDetail, openDeposit, openWithdraw, openAuth } = useUI()
  const { user } = useAuth()
  const open = !!tokenDetail
  const [tokens, setTokens] = useState<TokenInfo[]>(FALLBACK)

  useEffect(() => {
    apiFetch<{ tokens: TokenInfo[] }>('/api/market-data').then((d) => setTokens(d.tokens)).catch(() => {})
  }, [])

  const token = tokens.find((t) => t.symbol === tokenDetail)

  function close() {
    openTokenDetail('') // close by setting empty? no — need null
    useUI.setState({ tokenDetail: null })
  }

  function handleAction(kind: 'deposit' | 'withdraw') {
    if (!user) {
      close()
      openAuth('signup')
      return
    }
    if (kind === 'deposit') openDeposit(token!.symbol)
    else openWithdraw(token!.symbol)
    close()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && close()}>
      <DialogContent className="max-w-[560px] w-[calc(100%-2rem)] glass-strong border-border/40">
        {token && (
          <>
            {/* Header */}
            <div className="flex items-center gap-3">
              <TokenIcon symbol={token.symbol} iconUrl={token.iconUrl} icon={token.icon} color={token.color} size={48} />
              <div className="flex-1">
                <DialogTitle className="flex items-center gap-2 text-lg font-bold">
                  {token.symbol}
                  {token.internalOnly && <span className="rounded bg-gold/15 px-1.5 py-0.5 text-[9px] font-bold text-gold">EXCLUSIVE</span>}
                  {token.fixed && <span className="rounded bg-secondary px-1.5 py-0.5 text-[9px] font-bold text-muted-foreground">FIXED</span>}
                </DialogTitle>
                <DialogDescription className="text-xs">{token.name}</DialogDescription>
              </div>
              <div className="text-right">
                <div className={`flex items-center justify-end gap-1 text-sm font-bold ${token.change24h >= 0 ? 'text-up' : 'text-down'}`}>
                  {token.change24h >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                  {token.fixed ? '0.00%' : `${token.change24h >= 0 ? '+' : ''}${token.change24h.toFixed(2)}%`}
                </div>
                <div className="text-[10px] text-muted-foreground">24h</div>
              </div>
            </div>

            {/* Chart */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
              <TokenChart
                symbol={token.symbol}
                currentPrice={token.price}
                change24h={token.change24h}
                color={token.color}
              />
            </motion.div>

            {/* Fixed price notice for HABESHA */}
            {token.fixed && (
              <div className="flex items-start gap-2 rounded-lg border border-gold/20 bg-gold/5 p-2.5 text-[11px] text-muted-foreground">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold" />
                <span>Habesha Token is fixed at <b className="text-gold">$6.4321674</b> and not publicly listed. Price chart is flat by design.</span>
              </div>
            )}

            {/* Internal-only notice */}
            {token.internalOnly && (
              <div className="flex items-start gap-2 rounded-lg border border-gold/20 bg-gold/5 p-2.5 text-[11px] text-muted-foreground">
                <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold" />
                <span>Habesha Token can only be transferred internally (UID to UID). No external deposits or withdrawals.</span>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                className="bg-gold-gradient h-11 flex-1 font-semibold text-primary-foreground"
                disabled={token.internalOnly}
                onClick={() => handleAction('deposit')}
              >
                <ArrowDownToLine className="mr-1 h-4 w-4" /> Deposit
              </Button>
              <Button
                variant="outline"
                className="h-11 flex-1 border-gold/30 text-gold hover:bg-gold/10"
                onClick={() => handleAction('withdraw')}
              >
                {token.internalOnly ? <Send className="mr-1 h-4 w-4" /> : <ArrowUpFromLine className="mr-1 h-4 w-4" />}
                {token.internalOnly ? 'Transfer' : 'Withdraw'}
              </Button>
            </div>
            {!user && (
              <p className="text-center text-[11px] text-muted-foreground">
                Sign up to trade · New users get <b className="text-gold">$15</b> in Habesha Token
              </p>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
