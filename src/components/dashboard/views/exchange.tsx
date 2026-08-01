'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/hooks/use-toast'
import { apiFetch } from '@/lib/api-client'
import { formatUsd, formatTokenAmount } from '@/lib/format'
import { ArrowLeftRight, Loader2, ArrowDown, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TokenIcon } from '@/components/common/token-icon'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { motion } from 'framer-motion'

interface TokenInfo {
  symbol: string
  name: string
  price: number
  color: string
  icon: string
  iconUrl?: string | null
}

const TOKENS_FALLBACK: TokenInfo[] = [
  { symbol: 'USDT', name: 'Tether USD', price: 1, color: '#26A17B', icon: '₮' },
  { symbol: 'USDC', name: 'USD Coin', price: 1, color: '#2775CA', icon: '$' },
  { symbol: 'BTC', name: 'Bitcoin', price: 97500, color: '#F7931A', icon: '₿' },
  { symbol: 'TON', name: 'Toncoin', price: 5.42, color: '#0098EA', icon: '◆' },
]

export function ExchangeView() {
  const { balances, fetchMe } = useAuth()
  const { toast } = useToast()
  const [tokens, setTokens] = useState<TokenInfo[]>(TOKENS_FALLBACK)
  const [fromSymbol, setFromSymbol] = useState('USDT')
  const [toSymbol, setToSymbol] = useState('BTC')
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    apiFetch<{ tokens: TokenInfo[] }>('/api/tokens').then((d) => setTokens(d.tokens)).catch(() => {})
  }, [])

  const from = tokens.find((t) => t.symbol === fromSymbol) || tokens[0]
  const to = tokens.find((t) => t.symbol === toSymbol) || tokens[1]
  const fromBalance = balances.find((b) => b.symbol === fromSymbol)?.amount ?? 0
  const amt = Number(amount) || 0
  const usdValue = amt * from.price
  const received = to.price > 0 ? usdValue / to.price : 0

  function swap() {
    setFromSymbol(toSymbol)
    setToSymbol(fromSymbol)
    setAmount('')
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!amt || amt <= 0) {
      toast({ variant: 'destructive', title: 'Enter a valid amount' })
      return
    }
    if (amt > fromBalance) {
      toast({ variant: 'destructive', title: 'Insufficient balance', description: `Available: ${formatTokenAmount(fromBalance, fromSymbol)} ${fromSymbol}` })
      return
    }
    if (fromSymbol === toSymbol) {
      toast({ variant: 'destructive', title: 'Choose a different token' })
      return
    }
    await doSwap()
  }

  async function doSwap() {
    setLoading(true)
    try {
      const res = await apiFetch<{ ok: boolean; to: { amount: number } }>('/api/swap', {
        method: 'POST',
        body: JSON.stringify({ fromToken: fromSymbol, toToken: toSymbol, amount: amt }),
      })
      await fetchMe()
      toast({
        title: 'Exchange Complete ✓',
        description: `You received ${res.to.amount.toFixed(6)} ${toSymbol}.`,
      })
      setAmount('')
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Exchange failed', description: err.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="flex items-center gap-2 text-2xl font-extrabold tracking-tight">
          <ArrowLeftRight className="h-6 w-6 text-gold" /> Exchange
        </h2>
        <p className="text-sm text-muted-foreground">Swap between any tokens instantly at live rates</p>
      </div>

      <div className="mx-auto max-w-lg">
        <motion.form
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={submit}
          className="space-y-3 glass-card gradient-border rounded-2xl p-5 shadow-premium"
        >
          {/* From */}
          <div className="rounded-xl border border-border bg-secondary/30 p-3">
            <div className="mb-2 flex items-center justify-between text-[11px] text-muted-foreground">
              <span>From</span>
              <span>Balance: <b className="text-foreground">{formatTokenAmount(fromBalance, fromSymbol)}</b> {fromSymbol}</span>
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min="0"
                step="any"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="border-0 bg-transparent text-lg font-bold shadow-none focus-visible:ring-0"
              />
              <Select value={fromSymbol} onValueChange={(v) => { setFromSymbol(v); setAmount('') }}>
                <SelectTrigger className="w-[140px] border-border bg-background"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {tokens.map((t) => (
                    <SelectItem key={t.symbol} value={t.symbol}>
                      <span className="flex items-center gap-2">
                        <TokenIcon symbol={t.symbol} iconUrl={t.iconUrl} icon={t.icon} color={t.color} size={20} className="inline-block" /> {t.symbol}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="mt-1 flex items-center justify-between text-[11px]">
              <span className="text-muted-foreground">{amount ? `≈ ${formatUsd(usdValue)}` : ''}</span>
              <button type="button" onClick={() => setAmount(String(fromBalance))} className="font-medium text-gold hover:underline">Max</button>
            </div>
          </div>

          {/* Swap-direction button */}
          <div className="flex justify-center">
            <button
              type="button"
              onClick={swap}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-gold/40 bg-card text-gold transition-transform hover:rotate-180 hover:bg-gold/10"
              aria-label="Swap direction"
              title="Swap direction"
            >
              <ArrowDown className="h-4 w-4" />
            </button>
          </div>

          {/* To */}
          <div className="rounded-xl border border-border bg-secondary/30 p-3">
            <div className="mb-2 flex items-center justify-between text-[11px] text-muted-foreground">
              <span>To (estimated)</span>
              <span>Balance: <b className="text-foreground">{formatTokenAmount(balances.find((b) => b.symbol === toSymbol)?.amount ?? 0, toSymbol)}</b> {toSymbol}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 text-lg font-bold text-muted-foreground">
                {amount ? received.toFixed(6) : '0.00'}
              </div>
              <Select value={toSymbol} onValueChange={setToSymbol}>
                <SelectTrigger className="w-[140px] border-border bg-background"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {tokens.map((t) => (
                    <SelectItem key={t.symbol} value={t.symbol}>
                      <span className="flex items-center gap-2"><TokenIcon symbol={t.symbol} iconUrl={t.iconUrl} icon={t.icon} color={t.color} size={20} className="inline-block" /> {t.symbol}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Rate */}
          {from && to && (
            <div className="flex items-center justify-center gap-1.5 rounded-lg bg-secondary/20 px-3 py-2 text-[11px] text-muted-foreground">
              <RefreshCw className="h-3 w-3" />
              1 {fromSymbol} = {from.price > 0 ? (from.price / to.price).toFixed(6) : '0'} {toSymbol}
              <span className="mx-1">·</span>
              1 {toSymbol} = {to.price > 0 ? (to.price / from.price).toFixed(6) : '0'} {fromSymbol}
            </div>
          )}

          <Button type="submit" className="bg-gold-gradient h-12 w-full text-base font-semibold text-primary-foreground" disabled={loading || !amount}>
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : `Exchange ${fromSymbol} → ${toSymbol}`}
          </Button>
        </motion.form>

        <div className="mt-4 rounded-xl glass-card gradient-border p-4 text-xs text-muted-foreground">
          <b className="text-gold">Tip:</b> To withdraw to an Ethiopian bank (ETB cash-out), first exchange your tokens to <b className="text-gold">USDT</b> here, then use <b className="text-gold">Withdraw → Bank</b>. Rate: 1 USDT = ~186 ETB.
        </div>
      </div>
    </div>
  )
}
