'use client'

import { useEffect, useState } from 'react'
import { useUI } from '@/hooks/use-ui'
import { apiFetch } from '@/lib/api-client'
import { formatUsd } from '@/lib/format'
import { motion } from 'framer-motion'
import { ArrowDownToLine, ArrowUpFromLine, Send, TrendingUp, TrendingDown, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

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
  const { openDeposit, openWithdraw, openTokenDetail } = useUI()
  const [tokens, setTokens] = useState<TokenRow[]>([])
  const [search, setSearch] = useState('')

  useEffect(() => {
    apiFetch<{ tokens: TokenRow[] }>('/api/tokens').then((d) => setTokens(d.tokens)).catch(() => {})
  }, [])

  const filtered = tokens.filter((t) => {
    const q = search.trim().toLowerCase()
    if (!q) return true
    return t.symbol.toLowerCase().includes(q) || t.name.toLowerCase().includes(q)
  })

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight">Markets</h2>
          <p className="text-sm text-muted-foreground">Click any token to view its price chart</p>
        </div>
        <div className="relative w-full sm:w-[240px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search token…"
            className="border-border bg-card pl-9"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="grid grid-cols-12 gap-2 border-b border-border px-5 py-3 text-[11px] uppercase tracking-wider text-muted-foreground">
          <div className="col-span-4">Token</div>
          <div className="col-span-3 text-right">Price</div>
          <div className="col-span-2 text-right">24h</div>
          <div className="col-span-3 text-right">Actions</div>
        </div>
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center text-sm text-muted-foreground">
            <Search className="mb-2 h-6 w-6 opacity-30" />
            No tokens match "{search}"
          </div>
        ) : (
          filtered.map((t, i) => (
            <motion.div
              key={t.symbol}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.04 }}
              onClick={() => openTokenDetail(t.symbol)}
              className="grid cursor-pointer grid-cols-12 items-center gap-2 border-b border-border/50 px-5 py-4 last:border-0 transition-colors hover:bg-secondary/40"
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
              <div className="col-span-3 flex justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                <Button size="sm" variant="outline" className="h-8 border-border text-xs" disabled={t.internalOnly} onClick={() => openDeposit(t.symbol)}>
                  <ArrowDownToLine className="h-3 w-3" />
                </Button>
                <Button size="sm" variant="outline" className="h-8 border-border text-xs" onClick={() => openWithdraw(t.symbol)}>
                  {t.internalOnly ? <Send className="h-3 w-3" /> : <ArrowUpFromLine className="h-3 w-3" />}
                </Button>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  )
}
