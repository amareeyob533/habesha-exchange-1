'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useUI } from '@/hooks/use-ui'
import { useToast } from '@/hooks/use-toast'
import { apiFetch } from '@/lib/api-client'
import { formatUsd } from '@/lib/format'
import { Copy, Check, Loader2, AlertTriangle, ArrowDownToLine, Clock } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface TokenInfo {
  symbol: string
  name: string
  price: number
  color: string
  icon: string
  iconUrl?: string | null
  networks: { name: string; address: string }[]
}

const TOKENS_FALLBACK: TokenInfo[] = [
  { symbol: 'USDT', name: 'Tether USD', price: 1, color: '#26A17B', icon: '₮', iconUrl: '/tokens/usdt.png', networks: [
    { name: 'TRON (TRC20)', address: 'TBVhUqz5KarVFfK1k2UEALFxL6Pu8cfGHc' },
    { name: 'TON Network', address: 'UQBy0SwWKArNPiErzHpILtENz6y6GgNjPAoVTv9PGnWI8YrZ' },
    { name: 'Ethereum (ERC20)', address: '0xbec7b38f38e7e6239981d4118a69f68cfbf99f98' },
  ]},
  { symbol: 'USDC', name: 'USD Coin', price: 1, color: '#2775CA', icon: '$', iconUrl: '/tokens/usdc.png', networks: [
    { name: 'Ethereum (ERC20)', address: '0xbec7b38f38e7e6239981d4118a69f68cfbf99f98' },
  ]},
  { symbol: 'BTC', name: 'Bitcoin', price: 97500, color: '#F7931A', icon: '₿', iconUrl: '/tokens/btc.png', networks: [
    { name: 'Bitcoin Network', address: '12AhGK4X4RnvdfNdsq7aQxpA4KQ2W12Wtp' },
  ]},
  { symbol: 'ETH', name: 'Ethereum', price: 3400, color: '#627EEA', icon: 'Ξ', iconUrl: '/tokens/eth.png', networks: [
    { name: 'Ethereum (ERC20)', address: '0xbec7b38f38e7e6239981d4118a69f68cfbf99f98' },
  ]},
  { symbol: 'SOL', name: 'Solana', price: 180, color: '#9945FF', icon: '◎', iconUrl: '/tokens/sol.png', networks: [
    { name: 'Solana Network', address: '3peKof5MyQaxXbMZdd1uQCefewvJFTbnLFPM8QPRHLji' },
  ]},
  { symbol: 'TRX', name: 'TRON', price: 0.24, color: '#EF0027', icon: 'T', iconUrl: '/tokens/trx.png', networks: [
    { name: 'TRON (TRC20)', address: 'TBVhUqz5KarVFfK1k2UEALFxL6Pu8cfGHc' },
  ]},
  { symbol: 'TON', name: 'Toncoin', price: 5.42, color: '#0098EA', icon: '◆', iconUrl: '/tokens/ton.png', networks: [
    { name: 'TON Network', address: 'UQC6BnUFgNB-8AxBQxo7_V7tblornEiUI6eSt8UOS4opKeiA' },
  ]},
]

export function DepositModal() {
  const { depositToken } = useUI()
  const open = !!depositToken
  function close() {
    useUI.setState({ depositToken: null })
  }
  return (
    <Dialog open={open} onOpenChange={(v) => !v && close()}>
      <DialogContent className="max-w-[460px] w-[calc(100%-2rem)] glass-strong border-border/40">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold/10 text-gold ring-1 ring-gold/20">
            <ArrowDownToLine className="h-5 w-5" />
          </div>
          <div>
            <DialogTitle className="text-lg font-bold">Deposit</DialogTitle>
            <DialogDescription className="text-xs">Fund your account with crypto</DialogDescription>
          </div>
        </div>
        {depositToken && (
          <DepositForm key={depositToken} initialSymbol={depositToken} onClose={close} />
        )}
      </DialogContent>
    </Dialog>
  )
}

function DepositForm({ initialSymbol, onClose }: { initialSymbol: string; onClose: () => void }) {
  const { toast } = useToast()
  const [tokens, setTokens] = useState<TokenInfo[]>(TOKENS_FALLBACK)
  const [symbol, setSymbol] = useState(initialSymbol)
  const [network, setNetwork] = useState('')
  const [amount, setAmount] = useState('')
  const [copied, setCopied] = useState(false)
  const [countdownStarted, setCountdownStarted] = useState(false)
  const [countdown, setCountdown] = useState(20)
  const [canDeposit, setCanDeposit] = useState(false)
  const [status, setStatus] = useState<'idle' | 'checking' | 'pending' | 'done'>('idle')

  useEffect(() => {
    apiFetch<{ tokens: TokenInfo[] }>('/api/tokens')
      .then((d) => setTokens(d.tokens))
      .catch(() => {})
  }, [])

  const token = tokens.find((t) => t.symbol === symbol) || tokens[0]
  // Derive effective network (default to first when none chosen) — avoids effect.
  const effectiveNetwork = network || token?.networks[0]?.name || ''
  const net = token?.networks.find((n) => n.name === effectiveNetwork)

  // 20-second countdown starts AFTER user copies the wallet address
  useEffect(() => {
    if (!countdownStarted) return
    const id = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) { clearInterval(id); setCanDeposit(true); return 0 }
        return c - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [countdownStarted])

  function copyAddr() {
    if (!net) return
    navigator.clipboard.writeText(net.address)
    setCopied(true)
    setCountdownStarted(true)
    toast({ title: 'Address copied', description: 'Deposit address copied to clipboard.' })
    setTimeout(() => setCopied(false), 1600)
  }

  async function handleDeposited() {
    const amt = Number(amount)
    if (!amt || amt <= 0) {
      toast({ variant: 'destructive', title: 'Invalid amount', description: 'Enter a valid deposit amount.' })
      return
    }
    if (!net) return
    setStatus('checking')
    try {
      await apiFetch('/api/deposit', {
        method: 'POST',
        body: JSON.stringify({ token: symbol, network: net.name, amount: amt }),
      })
      setStatus('pending')
      setTimeout(() => setStatus('done'), 1600)
    } catch (err: any) {
      setStatus('idle')
      toast({ variant: 'destructive', title: 'Deposit failed', description: err.message })
    }
  }

  return (
    <AnimatePresence mode="wait">
      {status === 'done' ? (
        <motion.div
          key="done"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center py-6 text-center"
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-up/15 text-up ring-2 ring-up/30">
            <Clock className="h-8 w-8" />
          </div>
          <h3 className="mt-4 text-lg font-bold">Deposit Submitted</h3>
          <p className="mt-1 max-w-xs text-sm text-muted-foreground">
            Your deposit of <b>{amount} {symbol}</b> is now <b className="text-gold">pending</b>. Our team has been notified and will confirm it shortly.
          </p>
          <Button className="bg-gold-gradient mt-5 w-full font-semibold text-primary-foreground" onClick={onClose}>
            Done
          </Button>
        </motion.div>
      ) : (
        <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Asset</Label>
            <Select value={symbol} onValueChange={setSymbol}>
              <SelectTrigger className="bg-secondary/40"><SelectValue /></SelectTrigger>
              <SelectContent>
                {tokens.map((t) => (
                  <SelectItem key={t.symbol} value={t.symbol}>
                    <span className="flex items-center gap-2">
                      {t.iconUrl ? (
                        <img src={t.iconUrl} alt={t.symbol} className="h-5 w-5 rounded-full object-cover" />
                      ) : (
                        <span className="flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold" style={{ backgroundColor: t.color + '20', color: t.color }}>{t.icon}</span>
                      )}
                      <span className="font-semibold">{t.symbol}</span>
                      <span className="text-muted-foreground">· {t.name}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Network</Label>
            <Select value={effectiveNetwork} onValueChange={setNetwork}>
              <SelectTrigger className="bg-secondary/40"><SelectValue placeholder="Select network" /></SelectTrigger>
              <SelectContent>
                {token?.networks.map((n) => (
                  <SelectItem key={n.name} value={n.name}>{n.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {net && (
            <div className="rounded-xl border border-border bg-secondary/30 p-3">
              <div className="mb-2 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Deposit address ({net.name})</span>
                <button onClick={copyAddr} className="flex items-center gap-1 font-medium text-gold hover:underline">
                  {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />} Copy
                </button>
              </div>
              <div className="break-all rounded-lg bg-background/60 p-2.5 font-mono text-xs">{net.address}</div>
              <div className="mt-2 flex items-start gap-1.5 text-[11px] text-muted-foreground">
                <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-gold" />
                Send only <b>{symbol}</b> via <b>{net.name}</b> to this address. Minimum deposit: <b className="text-gold">$1</b>.
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Amount deposited</Label>
            <Input
              type="number"
              min="0"
              step="any"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="bg-secondary/40"
            />
            {amount && token && (
              <div className="text-[11px] text-muted-foreground">≈ {formatUsd(Number(amount) * token.price)}</div>
            )}
          </div>

          {/* Before copy: empty space. After copy: 20s countdown. After countdown: "I Deposited" button. */}
          {!countdownStarted ? (
            <div className="h-11" />
          ) : !canDeposit ? (
            <div className="flex h-11 items-center justify-center gap-2 rounded-xl border border-gold/30 bg-gold/5 text-sm">
              <Clock className="h-4 w-4 text-gold" />
              <span className="text-muted-foreground">Please wait…</span>
              <span className="font-bold text-gold">{countdown}s</span>
            </div>
          ) : (
            <Button
              className="bg-gold-gradient h-11 w-full font-semibold text-primary-foreground"
              onClick={handleDeposited}
              disabled={status === 'checking' || status === 'pending'}
            >
              {status === 'checking' ? (
                <><Loader2 className="mr-1 h-4 w-4 animate-spin" /> Checking…</>
              ) : status === 'pending' ? (
                <><Clock className="mr-1 h-4 w-4" /> Pending…</>
              ) : (
                'I Deposited'
              )}
            </Button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
