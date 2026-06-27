'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/hooks/use-toast'
import { apiFetch } from '@/lib/api-client'
import { formatUsd, formatTokenAmount } from '@/lib/format'
import { ArrowLeftRight, Loader2, ArrowDown, RefreshCw, ShieldAlert, Lock, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TokenIcon } from '@/components/common/token-icon'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { motion } from 'framer-motion'

interface TokenInfo {
  symbol: string
  name: string
  price: number
  color: string
  icon: string
  iconUrl?: string | null
  internalOnly?: boolean
}

const TOKENS_FALLBACK: TokenInfo[] = [
  { symbol: 'USDT', name: 'Tether USD', price: 1, color: '#26A17B', icon: '₮' },
  { symbol: 'USDC', name: 'USD Coin', price: 1, color: '#2775CA', icon: '$' },
  { symbol: 'BTC', name: 'Bitcoin', price: 97500, color: '#F7931A', icon: '₿' },
  { symbol: 'TON', name: 'Toncoin', price: 5.42, color: '#0098EA', icon: '◆' },
  { symbol: 'HABESHA', name: 'Habesha Token', price: 6.4321674, color: '#F0B90B', icon: 'H' },
]

export function ExchangeView() {
  const { balances, fetchMe } = useAuth()
  const { toast } = useToast()
  const [tokens, setTokens] = useState<TokenInfo[]>(TOKENS_FALLBACK)
  const [fromSymbol, setFromSymbol] = useState('USDT')
  const [toSymbol, setToSymbol] = useState('BTC')
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [showHabeshaWarning, setShowHabeshaWarning] = useState(false)

  useEffect(() => {
    apiFetch<{ tokens: TokenInfo[] }>('/api/tokens').then((d) => setTokens(d.tokens)).catch(() => {})
  }, [])

  const from = tokens.find((t) => t.symbol === fromSymbol) || tokens[0]
  const to = tokens.find((t) => t.symbol === toSymbol) || tokens[1]
  const fromBalance = balances.find((b) => b.symbol === fromSymbol)?.amount ?? 0
  const amt = Number(amount) || 0
  const usdValue = amt * from.price
  const received = to.price > 0 ? usdValue / to.price : 0

  // Habesha Token restriction: can be a TARGET (to), never a SOURCE (from).
  const toIsHabesha = to?.internalOnly
  const fromIsHabesha = from?.internalOnly

  function swap() {
    // Block flipping if it would put HABESHA in the "From" position.
    if (toIsHabesha) {
      toast({
        variant: 'destructive',
        title: 'Cannot swap from Habesha Token',
        description: 'Habesha Token is not listed yet. You can receive it but cannot exchange it into other tokens.',
      })
      return
    }
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
    // Warn before swapping INTO Habesha (one-way conversion).
    if (toIsHabesha) {
      setShowHabeshaWarning(true)
      return
    }
    await doSwap()
  }

  async function doSwap() {
    setLoading(true)
    setShowHabeshaWarning(false)
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
                    // Habesha Token cannot be a source (not listed yet) → disabled in "From".
                    <SelectItem key={t.symbol} value={t.symbol} disabled={!!t.internalOnly}>
                      <span className="flex items-center gap-2">
                        <TokenIcon symbol={t.symbol} iconUrl={t.iconUrl} icon={t.icon} color={t.color} size={20} className="inline-block" /> {t.symbol}
                        {t.internalOnly && <Lock className="h-3 w-3 text-muted-foreground" />}
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

          {/* Swap-direction button — disabled when "To" is Habesha (can't swap FROM it) */}
          <div className="flex justify-center">
            <button
              type="button"
              onClick={swap}
              disabled={toIsHabesha}
              className={`flex h-9 w-9 items-center justify-center rounded-full border bg-card transition-transform ${
                toIsHabesha
                  ? 'cursor-not-allowed border-border text-muted-foreground opacity-40'
                  : 'border-gold/40 text-gold hover:rotate-180 hover:bg-gold/10'
              }`}
              aria-label="Swap direction"
              title={toIsHabesha ? 'Habesha Token cannot be exchanged into other tokens' : 'Swap direction'}
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

          {/* Warning when swapping INTO Habesha (one-way conversion) */}
          {toIsHabesha && (
            <div className="flex items-start gap-2 rounded-lg border border-gold/40 bg-gold/5 p-3 text-[11px]">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
              <span className="text-muted-foreground">
                <b className="text-gold">One-way conversion:</b> You are exchanging {fromSymbol} into <b className="text-gold">Habesha Token</b>, which is not publicly listed yet. Once converted, HABESHA <b>cannot be exchanged back</b> into other tokens — it can only be transferred internally between Habesha Exchange users. Please confirm you understand before continuing.
              </span>
            </div>
          )}

          <Button type="submit" className="bg-gold-gradient h-12 w-full text-base font-semibold text-primary-foreground" disabled={loading || !amount}>
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : `Exchange ${fromSymbol} → ${toSymbol}`}
          </Button>
        </motion.form>

        <div className="mt-4 rounded-xl glass-card gradient-border p-4 text-xs text-muted-foreground">
          <b className="text-gold">Tip:</b> To withdraw to an Ethiopian bank (ETB cash-out), first exchange your tokens to <b className="text-gold">USDT</b> here, then use <b className="text-gold">Withdraw → Bank</b>. Rate: 1 USDT = 192 ETB.
        </div>

        <div className="mt-2 rounded-xl glass-card gradient-border p-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5 font-semibold text-gold">
            <Lock className="h-3.5 w-3.5" /> Habesha Token — Not Listed Yet
          </div>
          <p className="mt-1">You can <b className="text-gold">receive</b> Habesha Token by exchanging other tokens into it, but you <b>cannot exchange it back</b> into other tokens until it is publicly listed. Habesha Token can be transferred internally (UID → UID) between Habesha Exchange users.</p>
        </div>
      </div>

      {/* Confirmation dialog when swapping INTO Habesha */}
      <Dialog open={showHabeshaWarning} onOpenChange={(v) => !v && setShowHabeshaWarning(false)}>
        <DialogContent className="max-w-[420px] border-border bg-card">
          <div className="flex flex-col items-center text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gold/15 text-gold ring-2 ring-gold/30">
              <AlertTriangle className="h-7 w-7" />
            </div>
            <DialogTitle className="mt-4 text-lg font-bold">Confirm Habesha Token Exchange</DialogTitle>
            <DialogDescription className="mt-1 text-sm text-muted-foreground">
              You are about to convert <b className="text-foreground">{amt} {fromSymbol}</b> (≈ {formatUsd(usdValue)}) into <b className="text-gold">{received.toFixed(6)} HABESHA</b>.
            </DialogDescription>
            <div className="mt-4 w-full rounded-lg border border-gold/30 bg-gold/5 p-3 text-left text-[11px] text-muted-foreground">
              <div className="flex items-center gap-1.5 font-semibold text-gold">
                <Lock className="h-3.5 w-3.5" /> This is a one-way conversion
              </div>
              <ul className="mt-2 space-y-1.5">
                <li>• Habesha Token is <b>not publicly listed yet</b>.</li>
                <li>• You <b>cannot exchange it back</b> into {fromSymbol} or any other token.</li>
                <li>• It can only be <b>transferred internally</b> between Habesha Exchange users (by UID).</li>
                <li>• You cannot withdraw it to an external wallet or bank.</li>
              </ul>
            </div>
            <div className="mt-5 flex w-full gap-2">
              <Button variant="outline" className="flex-1 border-border" onClick={() => setShowHabeshaWarning(false)}>
                Cancel
              </Button>
              <Button className="bg-gold-gradient flex-1 font-semibold text-primary-foreground" disabled={loading} onClick={doSwap}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'I Understand — Confirm'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
