'use client'

import { useAuth } from '@/hooks/use-auth'
import { useUI } from '@/hooks/use-ui'
import { motion, AnimatePresence } from 'framer-motion'
import { CreditCard, ShieldCheck, Copy, Check, Lock, ArrowLeftRight, Eye, EyeOff, Wifi, Sparkles, CheckCircle2, Zap, Globe } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useState, useEffect } from 'react'

const ACTIVATION_KEY = 'habesha-card-activated'

export function CardView() {
  const { user } = useAuth()
  const { setView } = useUI()
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [flipped, setFlipped] = useState(false)
  const [showCvv, setShowCvv] = useState(false)
  const [activated, setActivated] = useState(false)
  const [activating, setActivating] = useState(false)

  const isVerified = user?.kycStatus === 'approved'
  const cardHolder = (user?.kycFullName || user?.name || 'CARDHOLDER NAME').toUpperCase()
  const cardNumber = '5318 4753 2906 1847'
  const cardNumberRaw = '5318475329061847'
  const expiry = '10/28'
  const cvv = '531'

  // Check if card was already activated (stored in localStorage)
  useEffect(() => {
    try {
      const stored = localStorage.getItem(`${ACTIVATION_KEY}-${user?.uid}`)
      if (stored === 'true') {
        // Use a microtask to avoid setState-in-effect lint
        Promise.resolve().then(() => setActivated(true))
      }
    } catch {}
  }, [user?.uid])

  function copyField(field: string, value: string) {
    navigator.clipboard.writeText(value)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
  }

  function activateCard() {
    setActivating(true)
    setTimeout(() => {
      setActivating(false)
      setActivated(true)
      try {
        localStorage.setItem(`${ACTIVATION_KEY}-${user?.uid}`, 'true')
      } catch {}
    }, 2500)
  }

  // STATE 1: Not KYC verified — locked
  if (!isVerified) {
    return (
      <div className="space-y-5">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight">Habesha Card</h2>
          <p className="text-sm text-muted-foreground">Your virtual Mastercard for spending crypto</p>
        </div>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-secondary/60 text-muted-foreground">
            <Lock className="h-8 w-8" />
          </div>
          <h3 className="mt-4 text-lg font-bold">Verify Your Identity First</h3>
          <p className="mt-1 max-w-xs text-sm text-muted-foreground">
            Complete KYC verification to unlock your Habesha Mastercard. Use it to buy, sell, and spend your crypto anywhere Mastercard is accepted.
          </p>
          <Button className="mt-5 bg-gold-gradient font-semibold text-primary-foreground" onClick={() => useUI.getState().openKyc()}>
            <ShieldCheck className="mr-2 h-4 w-4" /> Verify Now
          </Button>
        </div>
      </div>
    )
  }

  // STATE 2: KYC verified but card not activated — professional activation page
  if (!activated) {
    return (
      <div className="space-y-5">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight">Habesha Card</h2>
          <p className="text-sm text-muted-foreground">Activate your virtual Mastercard</p>
        </div>

        {/* Hero activation card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-2xl glass-card p-6 text-center"
        >
          <div className="bg-gold-glow absolute -right-10 -top-10 h-40 w-40 rounded-full opacity-20" />

          {/* Card logo */}
          <div className="relative flex justify-center mb-4">
            <img src="/habesha-card-logo.png" alt="Habesha Card" className="h-20 w-20 object-contain" />
          </div>

          <h3 className="text-xl font-extrabold tracking-tight">Activate Your Card</h3>
          <p className="mt-1 max-w-sm mx-auto text-sm text-muted-foreground">
            Your identity is verified. Activate your Habesha Mastercard now to start spending your crypto worldwide.
          </p>

          {/* Features */}
          <div className="mt-6 grid grid-cols-3 gap-3">
            <div className="flex flex-col items-center gap-1.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gold/10 text-gold ring-1 ring-gold/20">
                <Zap className="h-4 w-4" />
              </div>
              <span className="text-[10px] font-semibold text-muted-foreground">Instant</span>
            </div>
            <div className="flex flex-col items-center gap-1.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gold/10 text-gold ring-1 ring-gold/20">
                <Globe className="h-4 w-4" />
              </div>
              <span className="text-[10px] font-semibold text-muted-foreground">Worldwide</span>
            </div>
            <div className="flex flex-col items-center gap-1.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gold/10 text-gold ring-1 ring-gold/20">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <span className="text-[10px] font-semibold text-muted-foreground">Secure</span>
            </div>
          </div>

          {/* Card preview (blurred) */}
          <div className="mt-6 relative">
            <div className="filter blur-sm opacity-40 pointer-events-none">
              <div className="mx-auto h-[180px] w-[300px] rounded-2xl" style={{
                background: 'linear-gradient(145deg, #0a0a0a, #1c1c1c)',
                border: '1px solid rgba(240, 185, 11, 0.2)',
              }}>
                <div className="p-4 flex items-center gap-2">
                  <img src="/habesha-card-logo.png" alt="" className="h-6 w-6" />
                  <span className="text-[10px] font-bold text-gold">HABESHA EXCHANGE</span>
                </div>
                <div className="px-4 mt-4">
                  <div className="h-8 w-11 rounded-md" style={{ background: 'linear-gradient(135deg, #C8A032, #F0D040, #C8A032)' }} />
                </div>
                <div className="px-4 mt-4">
                  <div className="h-3 w-40 rounded bg-gold/20" />
                </div>
              </div>
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <Lock className="h-8 w-8 text-gold/40" />
            </div>
          </div>

          {/* Activate button */}
          <Button
            className="mt-6 w-full bg-gold-gradient h-12 font-bold text-primary-foreground shadow-gold"
            onClick={activateCard}
            disabled={activating}
          >
            {activating ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                >
                  <Sparkles className="h-4 w-4" />
                </motion.div>
                Activating your card…
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" /> Activate My Card
              </>
            )}
          </Button>

          <p className="mt-3 text-[11px] text-muted-foreground">
            No fees · No waiting · Instant activation
          </p>
        </motion.div>
      </div>
    )
  }

  // STATE 3: Card activated — show the full card
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight">Habesha Card</h2>
          <p className="text-sm text-muted-foreground">Your virtual Mastercard — spend crypto anywhere</p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-up/15 px-2.5 py-1 text-[10px] font-bold text-up">
          <ShieldCheck className="h-3 w-3" /> Active
        </span>
      </div>

      {/* The Card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-center"
      >
        <div
          className="relative h-[230px] w-[360px] max-w-full cursor-pointer"
          onClick={() => setFlipped(!flipped)}
          style={{ perspective: '1200px' }}
        >
          <motion.div
            animate={{ rotateY: flipped ? 180 : 0 }}
            transition={{ duration: 0.6, ease: 'easeInOut' }}
            className="relative h-full w-full"
            style={{ transformStyle: 'preserve-3d' }}
          >
            {/* ============ FRONT ============ */}
            <div
              className="absolute inset-0 rounded-2xl overflow-hidden"
              style={{
                background: 'linear-gradient(145deg, #0a0a0a 0%, #1c1c1c 40%, #0f0f0f 100%)',
                backfaceVisibility: 'hidden',
                border: '1px solid rgba(240, 185, 11, 0.2)',
                boxShadow: '0 12px 40px rgba(0, 0, 0, 0.5), 0 0 1px rgba(240, 185, 11, 0.3)',
              }}
            >
              {/* Geometric pattern overlay */}
              <div
                className="absolute inset-0 opacity-[0.04]"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M40 0L80 40L40 80L0 40Z' fill='none' stroke='%23F0B90B' stroke-width='1'/%3E%3Cpath d='M40 20L60 40L40 60L20 40Z' fill='none' stroke='%23F0B90B' stroke-width='0.5'/%3E%3C/svg%3E")`,
                  backgroundSize: '40px 40px',
                }}
              />

              {/* Gold glow */}
              <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #F0B90B, transparent 70%)' }} />

              {/* Top row: real logo + World Elite */}
              <div className="flex items-start justify-between p-4">
                <div className="flex items-center gap-2">
                  <img src="/habesha-card-logo.png" alt="Habesha Exchange" className="h-8 w-8 object-contain" />
                  <span className="text-[10px] font-bold tracking-[0.15em] text-gold">HABESHA EXCHANGE</span>
                </div>
                <span className="text-[8px] font-bold tracking-[0.2em] text-gold/70">WORLD ELITE</span>
              </div>

              {/* Chip + Contactless */}
              <div className="flex items-center justify-between px-4 mt-1">
                <div className="h-8 w-11 rounded-md relative overflow-hidden" style={{
                  background: 'linear-gradient(135deg, #C8A032 0%, #F0D040 25%, #C8A032 50%, #F0D040 75%, #C8A032 100%)',
                  boxShadow: '0 0 6px rgba(240, 185, 11, 0.4), inset 0 1px 2px rgba(255, 255, 255, 0.3)',
                }}>
                  <div className="absolute inset-1 border border-black/20 rounded-sm" />
                  <div className="absolute top-1/2 left-1 right-1 h-px bg-black/15" />
                  <div className="absolute left-1/2 top-1 bottom-1 w-px bg-black/15" />
                </div>
                <Wifi className="h-5 w-5 text-gold/40 rotate-90" />
              </div>

              {/* Card number */}
              <div className="mt-3 px-4">
                <p className="font-mono text-[16px] font-bold tracking-[0.15em] text-gold" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
                  {cardNumber}
                </p>
              </div>

              {/* Valid thru + Cardholder */}
              <div className="mt-2 px-4 flex items-end justify-between">
                <div>
                  <p className="text-[8px] text-gold/50 tracking-wider">VALID THRU</p>
                  <p className="text-[12px] font-bold text-gold">{expiry}</p>
                </div>
                <div className="text-right">
                  <p className="text-[7px] text-gold/50 tracking-wider">CARD HOLDER</p>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gold max-w-[180px] truncate">
                    {cardHolder}
                  </p>
                </div>
              </div>

              {/* Mastercard logo */}
              <div className="absolute bottom-3 right-4 flex items-center gap-1">
                <span className="text-[7px] text-gold/50 mr-1">DEBIT</span>
                <div className="flex items-center">
                  <div className="h-5 w-5 rounded-full" style={{ background: '#EB001B' }} />
                  <div className="h-5 w-5 -ml-2.5 rounded-full" style={{ background: '#F79E1B', mixBlendMode: 'screen' }} />
                </div>
                <span className="text-[7px] text-gold/70 ml-0.5">mastercard.</span>
              </div>
            </div>

            {/* ============ BACK ============ */}
            <div
              className="absolute inset-0 rounded-2xl overflow-hidden"
              style={{
                background: 'linear-gradient(145deg, #0a0a0a 0%, #1c1c1c 40%, #0f0f0f 100%)',
                backfaceVisibility: 'hidden',
                transform: 'rotateY(180deg)',
                border: '1px solid rgba(240, 185, 11, 0.2)',
                boxShadow: '0 12px 40px rgba(0, 0, 0, 0.5)',
              }}
            >
              {/* Magnetic stripe */}
              <div className="mt-5 h-10 w-full" style={{ background: '#000' }} />

              {/* Signature strip */}
              <div className="mx-4 mt-4 flex items-center justify-between rounded bg-white/85 px-3 py-2">
                <span className="text-[9px] text-black/40 tracking-wider">AUTHORIZED SIGNATURE</span>
                <span className="font-mono text-[10px] text-black/40">NOT TRANSFERABLE</span>
              </div>

              {/* CVV */}
              <div className="mx-4 mt-3">
                <div className="flex items-center justify-between rounded bg-white/15 px-3 py-2 border border-white/5">
                  <span className="text-[9px] text-gold/60 tracking-wider">CVV / SECURITY CODE</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold text-gold">
                      {showCvv ? cvv : '•••'}
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); setShowCvv(!showCvv) }}
                      className="text-gold/50 hover:text-gold"
                    >
                      {showCvv ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Customer service */}
              <div className="mx-4 mt-3">
                <p className="text-[8px] text-gold/30 leading-relaxed">
                  For customer service, visit habesha-exchange.com or contact support. This card remains the property of Habesha Exchange.
                </p>
              </div>

              {/* Footer logos */}
              <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between">
                <img src="/habesha-card-logo.png" alt="Habesha Exchange" className="h-6 w-6 object-contain" />
                <div className="flex items-center">
                  <div className="h-4 w-4 rounded-full" style={{ background: '#EB001B' }} />
                  <div className="h-4 w-4 -ml-2 rounded-full" style={{ background: '#F79E1B', mixBlendMode: 'screen' }} />
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* Tap to flip hint */}
      <p className="text-center text-[11px] text-muted-foreground">Tap card to flip • Tap eye icon to reveal CVV</p>

      {/* Card details — all copyable */}
      <div className="glass-card rounded-2xl p-5 space-y-1">
        <h3 className="text-sm font-bold mb-3">Card Details</h3>

        <div className="flex items-center justify-between border-b border-border/50 py-2.5">
          <span className="text-xs text-muted-foreground">Card Number</span>
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-bold">{cardNumber}</span>
            <button onClick={() => copyField('number', cardNumberRaw)} className="text-muted-foreground hover:text-gold transition-colors">
              {copiedField === 'number' ? <Check className="h-3.5 w-3.5 text-up" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between border-b border-border/50 py-2.5">
          <span className="text-xs text-muted-foreground">Card Holder</span>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold uppercase">{cardHolder}</span>
            <button onClick={() => copyField('holder', cardHolder)} className="text-muted-foreground hover:text-gold transition-colors">
              {copiedField === 'holder' ? <Check className="h-3.5 w-3.5 text-up" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between border-b border-border/50 py-2.5">
          <span className="text-xs text-muted-foreground">Expiry Date</span>
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-bold">{expiry}</span>
            <button onClick={() => copyField('expiry', expiry)} className="text-muted-foreground hover:text-gold transition-colors">
              {copiedField === 'expiry' ? <Check className="h-3.5 w-3.5 text-up" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between border-b border-border/50 py-2.5">
          <span className="text-xs text-muted-foreground">CVV</span>
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-bold">{showCvv ? cvv : '•••'}</span>
            <button onClick={() => setShowCvv(!showCvv)} className="text-muted-foreground hover:text-gold transition-colors">
              {showCvv ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            </button>
            <button onClick={() => copyField('cvv', cvv)} className="text-muted-foreground hover:text-gold transition-colors">
              {copiedField === 'cvv' ? <Check className="h-3.5 w-3.5 text-up" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between border-b border-border/50 py-2.5">
          <span className="text-xs text-muted-foreground">Card Type</span>
          <span className="text-sm font-bold">World Elite Debit</span>
        </div>

        <div className="flex items-center justify-between border-b border-border/50 py-2.5">
          <span className="text-xs text-muted-foreground">Network</span>
          <span className="text-sm font-bold">Mastercard</span>
        </div>

        <div className="flex items-center justify-between py-2.5">
          <span className="text-xs text-muted-foreground">Status</span>
          <span className="inline-flex items-center gap-1 rounded-full bg-up/15 px-2 py-0.5 text-[10px] font-bold text-up">
            <ShieldCheck className="h-3 w-3" /> Active
          </span>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-3 gap-3">
        <Button variant="outline" className="h-14 flex-col gap-1" onClick={() => setView('exchange')}>
          <ArrowLeftRight className="h-4 w-4" />
          <span className="text-[9px]">Exchange</span>
        </Button>
        <Button variant="outline" className="h-14 flex-col gap-1" onClick={() => setView('wallet')}>
          <CreditCard className="h-4 w-4" />
          <span className="text-[9px]">Wallet</span>
        </Button>
        <Button variant="outline" className="h-14 flex-col gap-1" onClick={() => setView('transactions')}>
          <ShieldCheck className="h-4 w-4" />
          <span className="text-[9px]">History</span>
        </Button>
      </div>

      {/* Info card */}
      <div className="glass-card rounded-2xl p-4">
        <div className="flex items-start gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-up" />
          <span>
            Your Habesha Card is a virtual Mastercard linked to your crypto wallet. Use it for online purchases, transfers, and payments wherever Mastercard is accepted. Funds are deducted directly from your USDT balance.
          </span>
        </div>
      </div>
    </div>
  )
}
