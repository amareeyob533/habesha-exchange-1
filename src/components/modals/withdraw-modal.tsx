'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useUI } from '@/hooks/use-ui'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/hooks/use-toast'
import { apiFetch } from '@/lib/api-client'
import { formatUsd, formatTokenAmount, shortAddr } from '@/lib/format'
import { ETB_RATE, BANKS } from '@/lib/tokens'
import { ArrowUpFromLine, Users, Globe, Landmark, Loader2, ShieldAlert, Check, Info, ArrowLeftRight } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface TokenInfo {
  symbol: string
  name: string
  price: number
  color: string
  icon: string
  networks: { name: string; address: string }[]
  internalOnly?: boolean
}

const TOKENS_FALLBACK: TokenInfo[] = [
  { symbol: 'USDT', name: 'Tether USD', price: 1, color: '#26A17B', icon: '₮', networks: [
    { name: 'TRON (TRC20)', address: '' }, { name: 'Ethereum (ERC20)', address: '' } ]},
  { symbol: 'USDC', name: 'USD Coin', price: 1, color: '#2775CA', icon: '$', networks: [{ name: 'Ethereum (ERC20)', address: '' }]},
  { symbol: 'BTC', name: 'Bitcoin', price: 97500, color: '#F7931A', icon: '₿', networks: [{ name: 'Bitcoin Network', address: '' }]},
  { symbol: 'TON', name: 'Toncoin', price: 5.42, color: '#0098EA', icon: '◆', networks: [{ name: 'TON Network', address: '' }]},
  { symbol: 'HABESHA', name: 'Habesha Token', price: 6.4321674, color: '#F0B90B', icon: 'H', networks: [], internalOnly: true },
]

type Mode = 'internal' | 'external' | 'bank'

export function WithdrawModal() {
  const { withdrawToken } = useUI()
  const open = !!withdrawToken
  function close() {
    useUI.setState({ withdrawToken: null })
  }
  return (
    <Dialog open={open} onOpenChange={(v) => !v && close()}>
      <DialogContent className="max-w-[460px] border-border bg-card">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold/10 text-gold ring-1 ring-gold/20">
            <ArrowUpFromLine className="h-5 w-5" />
          </div>
          <div>
            <DialogTitle className="text-lg font-bold">Withdraw / Transfer</DialogTitle>
            <DialogDescription className="text-xs">Move funds internally, to a wallet, or to a bank</DialogDescription>
          </div>
        </div>
        {withdrawToken && <WithdrawForm key={withdrawToken} initialSymbol={withdrawToken} onClose={close} />}
      </DialogContent>
    </Dialog>
  )
}

function WithdrawForm({ initialSymbol, onClose }: { initialSymbol: string; onClose: () => void }) {
  const { balances, fetchMe } = useAuth()
  const { toast } = useToast()
  const [tokens, setTokens] = useState<TokenInfo[]>(TOKENS_FALLBACK)
  const [symbol, setSymbol] = useState(initialSymbol)
  const [mode, setMode] = useState<Mode>('internal')
  const [targetUid, setTargetUid] = useState('')
  const [address, setAddress] = useState('')
  const [network, setNetwork] = useState('')
  const [amount, setAmount] = useState('')
  // Bank-specific
  const [bankCode, setBankCode] = useState('')
  const [accountName, setAccountName] = useState('')
  const [bankAccount, setBankAccount] = useState('')
  const [showBankForm, setShowBankForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState<null | { mode: Mode; amount: number; to: string; birr?: number; bank?: string }>(null)

  useEffect(() => {
    apiFetch<{ tokens: TokenInfo[] }>('/api/tokens').then((d) => setTokens(d.tokens)).catch(() => {})
  }, [])

  const token = tokens.find((t) => t.symbol === symbol) || tokens[0]
  const balance = balances.find((b) => b.symbol === symbol)?.amount ?? 0
  // Force internal mode for Habesha (derived, no effect). Bank requires USDT.
  const effectiveMode: Mode = token?.internalOnly ? 'internal' : mode
  const effectiveNetwork = effectiveMode === 'external' ? (network || token?.networks[0]?.name || '') : ''
  // ETB preview for bank withdrawals (USDT amount * rate)
  const birrPreview = effectiveMode === 'bank' && amount ? Number(amount) * ETB_RATE : 0

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const amt = Number(amount)
    if (!amt || amt <= 0) {
      toast({ variant: 'destructive', title: 'Invalid amount' })
      return
    }
    if (amt > balance) {
      toast({ variant: 'destructive', title: 'Insufficient balance', description: `Available: ${formatTokenAmount(balance, symbol)} ${symbol}` })
      return
    }
    setLoading(true)
    try {
      const payload: any = { token: symbol, amount: amt, network: effectiveMode }
      if (effectiveMode === 'internal') {
        const uid = targetUid.trim()
        if (!/^\d{6}$/.test(uid)) {
          toast({ variant: 'destructive', title: 'Invalid UID', description: 'Enter a 6-digit recipient UID.' })
          setLoading(false)
          return
        }
        payload.address = uid
      } else if (effectiveMode === 'external') {
        payload.network = effectiveNetwork
        payload.address = address.trim()
        if (!address.trim()) {
          toast({ variant: 'destructive', title: 'Address required' })
          setLoading(false)
          return
        }
      } else if (effectiveMode === 'bank') {
        // Stage 1: show bank info form before final submit
        if (!showBankForm) {
          if (!bankCode) {
            toast({ variant: 'destructive', title: 'Select a bank' })
            setLoading(false)
            return
          }
          setShowBankForm(true)
          setLoading(false)
          return
        }
        // Stage 2: final submit with bank info
        if (!accountName.trim()) {
          toast({ variant: 'destructive', title: 'Account name required' })
          setLoading(false)
          return
        }
        if (!bankAccount.trim()) {
          toast({ variant: 'destructive', title: 'Bank account number required' })
          setLoading(false)
          return
        }
        payload.network = 'bank'
        payload.bankName = bankCode
        payload.accountName = accountName.trim()
        payload.address = bankAccount.trim()
      }
      await apiFetch('/api/withdraw', { method: 'POST', body: JSON.stringify(payload) })
      await fetchMe()
      setDone({
        mode: effectiveMode,
        amount: amt,
        to: effectiveMode === 'internal' ? targetUid.trim() : effectiveMode === 'bank' ? bankAccount.trim() : address.trim(),
        birr: effectiveMode === 'bank' ? birrPreview : undefined,
        bank: effectiveMode === 'bank' ? bankCode : undefined,
      })
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Failed', description: err.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <AnimatePresence mode="wait">
      {done ? (
        <motion.div key="done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center py-6 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-up/15 text-up ring-2 ring-up/30">
            <Check className="h-8 w-8" />
          </div>
          <h3 className="mt-4 text-lg font-bold">
            {done.mode === 'internal' ? 'Transfer Complete' : done.mode === 'bank' ? 'Bank Withdrawal Submitted' : 'Withdrawal Submitted'}
          </h3>
          <p className="mt-1 max-w-xs text-sm text-muted-foreground">
            {done.mode === 'internal'
              ? `${done.amount} ${symbol} sent to UID ${done.to} instantly.`
              : done.mode === 'bank'
              ? `${done.amount} USDT (≈ ${done.birr?.toLocaleString('en-US')} ETB) to ${done.bank} is pending admin approval. You'll be notified once the ETB is sent to your bank.`
              : `${done.amount} ${symbol} is processing to ${shortAddr(done.to)}. You'll be notified on completion.`}
          </p>
          <Button className="bg-gold-gradient mt-5 w-full font-semibold text-primary-foreground" onClick={onClose}>Done</Button>
        </motion.div>
      ) : (
        <motion.form key="form" onSubmit={submit} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
          <div className="flex items-center justify-between rounded-xl border border-border bg-secondary/30 px-3 py-2">
            <span className="text-xs text-muted-foreground">Available</span>
            <span className="font-mono text-sm font-semibold">{formatTokenAmount(balance, symbol)} {symbol}</span>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Asset</Label>
            <Select value={symbol} onValueChange={(v) => { setSymbol(v); setMode('internal'); setShowBankForm(false) }}>
              <SelectTrigger className="bg-secondary/40"><SelectValue /></SelectTrigger>
              <SelectContent>
                {tokens.map((t) => (
                  <SelectItem key={t.symbol} value={t.symbol}>
                    <span className="flex items-center gap-2">
                      <span style={{ color: t.color }}>{t.icon}</span> {t.symbol}
                      {t.internalOnly && <span className="rounded bg-gold/15 px-1 text-[9px] font-bold text-gold">INTERNAL</span>}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Mode selector — 3 options */}
          <div className="grid grid-cols-3 gap-2">
            <ModeButton active={effectiveMode === 'internal'} onClick={() => { setMode('internal'); setShowBankForm(false) }} icon={Users} label="Internal" sub="By UID" />
            <ModeButton active={effectiveMode === 'external'} onClick={() => { if (!token?.internalOnly) { setMode('external'); setShowBankForm(false) } }} icon={Globe} label="External" sub="Wallet" disabled={!!token?.internalOnly} />
            <ModeButton active={effectiveMode === 'bank'} onClick={() => { if (symbol === 'USDT' && !token?.internalOnly) { setMode('bank'); setShowBankForm(false) } }} icon={Landmark} label="Bank" sub="ETB cash-out" disabled={symbol !== 'USDT' || !!token?.internalOnly} />
          </div>

          {token?.internalOnly && (
            <div className="flex items-start gap-2 rounded-lg border border-gold/30 bg-gold/5 p-2.5 text-[11px]">
              <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold" />
              <span className="text-muted-foreground"><b className="text-gold">Habesha Token</b> can only be transferred internally between Habesha Exchange users. External & bank withdrawals are not available.</span>
            </div>
          )}

          {symbol !== 'USDT' && mode === 'bank' && (
            <div className="flex items-start gap-2 rounded-lg border border-gold/30 bg-gold/5 p-2.5 text-[11px]">
              <ArrowLeftRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold" />
              <span className="text-muted-foreground">Bank withdrawals require <b className="text-gold">USDT</b>. Use the <b className="text-gold">Exchange</b> page to convert your {symbol} to USDT first.</span>
            </div>
          )}

          {effectiveMode === 'internal' ? (
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Recipient UID (6 digits)</Label>
              <Input
                value={targetUid}
                onChange={(e) => setTargetUid(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="e.g. 482917"
                className="bg-secondary/40 font-mono tracking-widest"
                inputMode="numeric"
              />
              <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <Info className="h-3 w-3" /> Transfers are instant and free between Habesha Exchange users.
              </div>
            </div>
          ) : effectiveMode === 'external' ? (
            <div className="space-y-3">
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
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Wallet address</Label>
                <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="0x… or wallet address" className="bg-secondary/40 font-mono text-xs" />
              </div>
            </div>
          ) : (
            // Bank mode
            !showBankForm ? (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Select Bank</Label>
                  <Select value={bankCode} onValueChange={setBankCode}>
                    <SelectTrigger className="bg-secondary/40"><SelectValue placeholder="Choose your bank" /></SelectTrigger>
                    <SelectContent>
                      {BANKS.map((b) => (
                        <SelectItem key={b.code} value={b.code}>{b.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="rounded-lg border border-gold/20 bg-gold/5 p-2.5 text-[11px] text-muted-foreground">
                  <Info className="mr-1 inline h-3 w-3 text-gold" />
                  Bank withdrawals are paid in <b className="text-gold">Ethiopian Birr (ETB)</b> at a fixed rate of <b className="text-gold">1 USDT = {ETB_RATE} ETB</b>.
                </div>
              </div>
            ) : (
              // Stage 2: bank info form
              <div className="space-y-3">
                <div className="flex items-center gap-2 rounded-lg border border-gold/30 bg-gold/5 p-2.5 text-[11px]">
                  <span className="text-muted-foreground">Withdrawing <b className="text-gold">{amount} USDT</b> ≈ <b className="text-gold">{birrPreview.toLocaleString('en-US')} ETB</b> to <b className="text-gold">{BANKS.find(b => b.code === bankCode)?.name}</b></span>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Account holder name</Label>
                  <Input value={accountName} onChange={(e) => setAccountName(e.target.value)} placeholder="Full name as on bank account" className="bg-secondary/40" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Bank account number</Label>
                  <Input value={bankAccount} onChange={(e) => setBankAccount(e.target.value.replace(/[^\dA-Za-z]/g, ''))} placeholder="Your bank account number" className="bg-secondary/40 font-mono" />
                </div>
                <button type="button" onClick={() => setShowBankForm(false)} className="text-[11px] text-muted-foreground hover:text-foreground">← Change amount or bank</button>
              </div>
            )
          )}

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Amount {effectiveMode === 'bank' ? '(USDT)' : ''}</Label>
            <Input type="number" min="0" step="any" value={amount} onChange={(e) => { setAmount(e.target.value); setShowBankForm(false) }} placeholder="0.00" className="bg-secondary/40" disabled={effectiveMode === 'bank' && showBankForm} />
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-muted-foreground">
                {amount && token ? `≈ ${formatUsd(Number(amount) * token.price)}` : ''}
                {effectiveMode === 'bank' && amount ? ` · ≈ ${birrPreview.toLocaleString('en-US')} ETB` : ''}
              </span>
              {!(effectiveMode === 'bank' && showBankForm) && (
                <button type="button" onClick={() => setAmount(String(balance))} className="font-medium text-gold hover:underline">Max</button>
              )}
            </div>
          </div>

          <Button type="submit" className="bg-gold-gradient h-11 w-full font-semibold text-primary-foreground" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : effectiveMode === 'bank' && !showBankForm ? 'Continue' : effectiveMode === 'internal' ? 'Send Instantly' : effectiveMode === 'bank' ? 'Submit Bank Withdrawal' : 'Submit Withdrawal'}
          </Button>
        </motion.form>
      )}
    </AnimatePresence>
  )
}

function ModeButton({ active, onClick, icon: Icon, label, sub, disabled }: { active: boolean; onClick: () => void; icon: any; label: string; sub: string; disabled: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`relative flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition-all ${
        active ? 'border-gold bg-gold/10' : 'border-border bg-secondary/30 hover:border-gold/40'
      } ${disabled ? 'cursor-not-allowed opacity-40' : ''}`}
    >
      <Icon className={`h-4 w-4 ${active ? 'text-gold' : 'text-muted-foreground'}`} />
      <div className="text-xs font-semibold">{label}</div>
      <div className="text-[10px] text-muted-foreground">{sub}</div>
    </button>
  )
}
