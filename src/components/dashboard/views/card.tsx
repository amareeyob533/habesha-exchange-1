'use client'

import { useAuth } from '@/hooks/use-auth'
import { useUI } from '@/hooks/use-ui'
import { motion } from 'framer-motion'
import { CreditCard, ShieldCheck, Copy, Check, Lock, ArrowLeftRight, ShoppingCart, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useState } from 'react'

export function CardView() {
  const { user } = useAuth()
  const { setView } = useUI()
  const [copied, setCopied] = useState(false)
  const [flipped, setFlipped] = useState(false)

  const isVerified = user?.kycStatus === 'approved'
  const cardHolder = user?.kycFullName || user?.name || 'CARDHOLDER NAME'
  // Same card number for everyone (not unique per user)
  const cardNumber = '5318 4753 2906 1847'
  const expiry = '10/28'

  function copyNumber() {
    navigator.clipboard.writeText(cardNumber.replace(/\s/g, ''))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // If not KYC verified, show the locked state
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

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight">Habesha Card</h2>
        <p className="text-sm text-muted-foreground">Your virtual Mastercard — spend crypto anywhere</p>
      </div>

      {/* The Card — matching the design from the screenshot */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-center"
      >
        <div
          className="relative h-[220px] w-[350px] max-w-full cursor-pointer perspective-1000"
          onClick={() => setFlipped(!flipped)}
          style={{ perspective: '1000px' }}
        >
          <motion.div
            animate={{ rotateY: flipped ? 180 : 0 }}
            transition={{ duration: 0.6 }}
            className="relative h-full w-full"
            style={{ transformStyle: 'preserve-3d' }}
          >
            {/* FRONT of card */}
            <div
              className="absolute inset-0 rounded-2xl overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 50%, #0a0a0a 100%)',
                backfaceVisibility: 'hidden',
                border: '1px solid rgba(240, 185, 11, 0.15)',
              }}
            >
              {/* Subtle geometric pattern */}
              <div
                className="absolute inset-0 opacity-[0.03]"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0L60 30L30 60L0 30Z' fill='%23F0B90B'/%3E%3C/svg%3E")`,
                  backgroundSize: '30px 30px',
                }}
              />

              {/* Top row: logo + World Elite */}
              <div className="flex items-start justify-between p-4">
                <div className="flex items-center gap-2">
                  {/* Habesha logo mark */}
                  <div className="flex h-7 w-7 items-center justify-center">
                    <svg viewBox="0 0 24 24" className="h-7 w-7" fill="#F0B90B">
                      <path d="M4 4L12 2L20 4L22 12L20 20L12 22L4 20L2 12Z" opacity="0.9" />
                      <path d="M8 8L12 6L16 8L18 12L16 16L12 18L8 16L6 12Z" fill="#0a0a0a" />
                      <path d="M10 10L12 9L14 10L15 12L14 14L12 15L10 14L9 12Z" fill="#F0B90B" />
                    </svg>
                  </div>
                  <span className="text-[10px] font-bold tracking-wider text-gold">HABESHA EXCHANGE</span>
                </div>
                <span className="text-[9px] font-bold tracking-widest text-gold">WORLD ELITE</span>
              </div>

              {/* Chip */}
              <div className="ml-4 mt-1">
                <div className="h-8 w-11 rounded-md" style={{
                  background: 'linear-gradient(135deg, #D4AF37, #F0B90B, #D4AF37)',
                  boxShadow: '0 0 8px rgba(240, 185, 11, 0.3)',
                }} />
              </div>

              {/* Card number */}
              <div className="mt-3 px-4">
                <p className="font-mono text-[15px] font-bold tracking-widest text-gold">
                  {cardNumber}
                </p>
              </div>

              {/* Valid thru */}
              <div className="mt-1 px-4">
                <p className="text-[9px] text-gold/60">VALID THRU</p>
                <p className="text-[11px] font-bold text-gold">{expiry}</p>
              </div>

              {/* Cardholder name */}
              <div className="absolute bottom-3 left-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gold">
                  {cardHolder}
                </p>
              </div>

              {/* Mastercard logo */}
              <div className="absolute bottom-3 right-4 flex items-center gap-1">
                <span className="text-[8px] text-gold/60">DEBIT</span>
                <div className="flex items-center">
                  <div className="h-5 w-5 rounded-full" style={{ background: '#EB001B' }} />
                  <div className="h-5 w-5 -ml-2 rounded-full" style={{ background: '#F79E1B', mixBlendMode: 'screen' }} />
                </div>
                <span className="text-[7px] text-gold/80">mastercard.</span>
              </div>
            </div>

            {/* BACK of card */}
            <div
              className="absolute inset-0 rounded-2xl overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 50%, #0a0a0a 100%)',
                backfaceVisibility: 'hidden',
                transform: 'rotateY(180deg)',
                border: '1px solid rgba(240, 185, 11, 0.15)',
              }}
            >
              {/* Magnetic stripe */}
              <div className="mt-4 h-10 w-full" style={{ background: '#000' }} />

              {/* Signature strip */}
              <div className="mx-4 mt-4 flex items-center justify-between rounded bg-white/90 px-3 py-2">
                <span className="text-[9px] text-black/40">AUTHORIZED SIGNATURE</span>
                <span className="font-mono text-[9px] text-black/50">531</span>
              </div>

              {/* CVV */}
              <div className="mx-4 mt-3">
                <div className="flex items-center justify-between rounded bg-white/20 px-3 py-2">
                  <span className="text-[9px] text-gold/60">CVV</span>
                  <span className="font-mono text-sm font-bold text-gold">•••</span>
                </div>
              </div>

              {/* Footer */}
              <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between">
                <span className="text-[8px] text-gold/40">This card is property of Habesha Exchange</span>
                <div className="flex items-center">
                  <div className="h-4 w-4 rounded-full" style={{ background: '#EB001B' }} />
                  <div className="h-4 w-4 -ml-1.5 rounded-full" style={{ background: '#F79E1B', mixBlendMode: 'screen' }} />
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* Tap to flip hint */}
      <p className="text-center text-[11px] text-muted-foreground">Tap card to flip • See CVV on back</p>

      {/* Card details */}
      <div className="glass-card rounded-2xl p-5 space-y-3">
        <h3 className="text-sm font-bold">Card Details</h3>

        <div className="flex items-center justify-between border-b border-border/50 py-2">
          <span className="text-xs text-muted-foreground">Card Number</span>
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-bold">{cardNumber}</span>
            <button onClick={copyNumber} className="text-muted-foreground hover:text-gold">
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between border-b border-border/50 py-2">
          <span className="text-xs text-muted-foreground">Card Holder</span>
          <span className="text-sm font-bold uppercase">{cardHolder}</span>
        </div>

        <div className="flex items-center justify-between border-b border-border/50 py-2">
          <span className="text-xs text-muted-foreground">Expiry Date</span>
          <span className="font-mono text-sm font-bold">{expiry}</span>
        </div>

        <div className="flex items-center justify-between border-b border-border/50 py-2">
          <span className="text-xs text-muted-foreground">Card Type</span>
          <span className="text-sm font-bold">World Elite Debit</span>
        </div>

        <div className="flex items-center justify-between py-2">
          <span className="text-xs text-muted-foreground">Status</span>
          <span className="inline-flex items-center gap-1 rounded-full bg-up/15 px-2 py-0.5 text-[10px] font-bold text-up">
            <ShieldCheck className="h-3 w-3" /> Active
          </span>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3">
        <Button variant="outline" className="h-12 flex-col gap-1" onClick={() => setView('exchange')}>
          <ArrowLeftRight className="h-4 w-4" />
          <span className="text-[10px]">Exchange</span>
        </Button>
        <Button variant="outline" className="h-12 flex-col gap-1" onClick={() => setView('wallet')}>
          <CreditCard className="h-4 w-4" />
          <span className="text-[10px]">Wallet</span>
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
