'use client'

import { useEffect, useState } from 'react'
import { useUI } from '@/hooks/use-ui'
import { apiFetch } from '@/lib/api-client'
import { formatUsd } from '@/lib/format'
import { motion } from 'framer-motion'
import { ArrowDownToLine, ArrowUpFromLine, Send, TrendingUp, TrendingDown } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface TokenRow {
  symbol: string
  name: string
  price: number
  change24h: number
  color: string
  icon: string
  fixed?: boolean
  internalOnly?: boolean
  listed: boolean
}

export function MarketsView() {
  const { openDeposit, openWithdraw } = useUI()
  const [tokens, setTokens] = useState<TokenRow[]>([])

  useEffect(() => {
    apiFetch<{ tokens: TokenRow[] }>('/api/tokens').then((d) => setTokens(d.tokens)).catch(() => {})
  }, [])

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight">Markets</h2>
        <p className="text-sm text-muted-foreground">Live prices and 24h performance</p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="grid grid-cols-12 gap-2 border-b border-border px-5 py-3 text-[11px] uppercase tracking-wider text-muted-foreground">
          <div className="col-span-4">Token</div>
          <div className="col-span-3 text-right">Price</div>
          <div className="col-span-2 text-right">24h</div>
          <div className="col-span-3 text-right">Actions</div>
        </div>
        {tokens.map((t, i) => (
          <motion.div
            key={t.symbol}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: i * 0.04 }}
            className="grid grid-cols-12 items-center gap-2 border-b border-border/50 px-5 py-4 last:border-0 transition-colors hover:bg-secondary/30"
          >
            <div className="col-span-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full text-base font-bold" style={{ backgroundColor: `${t.color}22`, color: t.color }}>
                {t.icon}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-1.5 font-bold">
                  {t.symbol}
                  {t.internalOnly && <span className="rounded bg-gold/15 px-1.5 py-0.5 text-[9px] font-bold text-gold">EXCLUSIVE</span>}
                  {t.fixed && <span className="rounded bg-secondary px-1.5 py-0.5 text-[9px] font-bold text-muted-foreground">FIXED</span>}
                </div>
                <div className="text-[11px] text-muted-foreground">{t.name}</div>
              </div>
            </div>
            <div className="col-span-3 text-right font-mono text-sm font-semibold">
              {formatUsd(t.price, { max: t.price > 1000 ? 0 : 4 })}
            </div>
            <div className={`col-span-2 flex items-center justify-end gap-1 text-right font-mono text-sm ${t.change24h >= 0 ? 'text-up' : 'text-down'}`}>
              {t.change24h >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {t.fixed ? '0.00%' : `${t.change24h >= 0 ? '+' : ''}${t.change24h.toFixed(2)}%`}
            </div>
            <div className="col-span-3 flex justify-end gap-1.5">
              <Button size="sm" variant="outline" className="h-8 border-border text-xs" disabled={t.internalOnly} onClick={() => openDeposit(t.symbol)}>
                <ArrowDownToLine className="h-3 w-3" />
              </Button>
              <Button size="sm" variant="outline" className="h-8 border-border text-xs" onClick={() => openWithdraw(t.symbol)}>
                {t.internalOnly ? <Send className="h-3 w-3" /> : <ArrowUpFromLine className="h-3 w-3" />}
              </Button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
