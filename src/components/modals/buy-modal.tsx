'use client'

import { useState, useEffect, useRef } from 'react'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useUI } from '@/hooks/use-ui'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/hooks/use-toast'
import { useLiveRate } from '@/hooks/use-live-rate'
import { apiFetch, uploadFile } from '@/lib/api-client'
import { compressImage, formatBytes } from '@/lib/compress-image'
import { BUY_BANKS } from '@/lib/buy-config'
import { ShoppingCart, Copy, Check, Loader2, Clock, Upload, ChevronRight, ArrowLeftRight, CheckCircle2, Image as ImageIcon } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

type Step = 'amount' | 'bank' | 'account' | 'upload' | 'done'
type Currency = 'USDT' | 'ETB'

export function BuyModal() {
  const { buyOpen, openBuy } = useUI()
  const { fetchMe } = useAuth()
  const { toast } = useToast()
  const { rate: liveRate } = useLiveRate()
  const [step, setStep] = useState<Step>('amount')
  const [currency, setCurrency] = useState<Currency>('USDT')
  const [amount, setAmount] = useState('')
  const [bankCode, setBankCode] = useState('')
  const [copied, setCopied] = useState(false)
  const [countdownStarted, setCountdownStarted] = useState(false)
  const [countdown, setCountdown] = useState(20)
  const [canProceed, setCanProceed] = useState(false)
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null)
  const [screenshotId, setScreenshotId] = useState<string | null>(null)
  const [screenshotName, setScreenshotName] = useState('')
  const [txnCode, setTxnCode] = useState('')
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const open = buyOpen
  function close() {
    useUI.setState({ buyOpen: false })
  }

  // Reset when modal closes
  useEffect(() => {
    if (!open) {
      const t = setTimeout(() => {
        setStep('amount'); setAmount(''); setBankCode(''); setCopied(false)
        setCanProceed(false); setCountdownStarted(false); setScreenshotUrl(null); setScreenshotId(null); setScreenshotName(''); setTxnCode(''); setCountdown(20)
      }, 300)
      return () => clearTimeout(t)
    }
  }, [open])

  // Derived amounts
  const usdtAmount = currency === 'USDT' ? Number(amount) || 0 : (Number(amount) || 0) / liveRate
  const birrAmount = currency === 'ETB' ? Number(amount) || 0 : (Number(amount) || 0) * liveRate
  const bank = BUY_BANKS.find((b) => b.code === bankCode)

  // 20-second countdown starts AFTER user copies the account number
  useEffect(() => {
    if (step !== 'account' || !countdownStarted) return
    setCountdown(20)
    setCanProceed(false)
    const id = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) { clearInterval(id); setCanProceed(true); return 0 }
        return c - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [step, countdownStarted])

  function copyAccount() {
    if (!bank) return
    navigator.clipboard.writeText(bank.accountNumber)
    setCopied(true)
    setCountdownStarted(true)
    toast({ title: 'Account number copied', description: bank.accountNumber })
    setTimeout(() => setCopied(false), 1600)
  }

  async function handleScreenshot(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    // Client-side validation before upload
    const isImage = file.type.startsWith('image/')
    if (!isImage) {
      toast({ variant: 'destructive', title: 'Invalid file', description: 'Please select an image file (JPG, PNG, WEBP, HEIC, etc.)' })
      e.target.value = ''
      return
    }
    if (file.size > 8 * 1024 * 1024) {
      toast({ variant: 'destructive', title: 'File too large', description: `Max 8 MB. Your file is ${(file.size / 1024 / 1024).toFixed(1)} MB` })
      e.target.value = ''
      return
    }
    setUploading(true)
    try {
      // Compress in the browser first — dramatically reduces upload time
      // and database size while keeping the image clear for admin review.
      const originalSize = file.size
      const compressed = await compressImage(file)
      const compressedSize = compressed.size
      const savedPct = originalSize > 0 ? Math.round((1 - compressedSize / originalSize) * 100) : 0
      if (savedPct > 10) {
        toast({ title: 'Image compressed', description: `${formatBytes(originalSize)} → ${formatBytes(compressedSize)} (${savedPct}% smaller)` })
      }
      const res = await uploadFile('/api/buy/upload', compressed)
      setScreenshotUrl(res.url)
      setScreenshotId(res.id || null)
      setScreenshotName(compressed.name)
      toast({ title: 'Screenshot uploaded', description: 'Payment proof ready to submit.' })
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Upload failed', description: err.message || 'Could not upload image. Please try again.' })
      e.target.value = ''
    } finally {
      setUploading(false)
    }
  }

  async function submitOrder() {
    setSubmitting(true)
    try {
      await apiFetch('/api/buy', {
        method: 'POST',
        body: JSON.stringify({ usdtAmount: usdtAmount, birrAmount: birrAmount, bank: bankCode, screenshotUrl, screenshotId, transactionCode: txnCode, rate: liveRate }),
      })
      await fetchMe()
      setStep('done')
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Failed', description: err.message })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && close()}>
      <DialogContent className="max-w-[460px] w-[calc(100%-2rem)] glass-strong border-border/40">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold/10 text-gold ring-1 ring-gold/20">
            <ShoppingCart className="h-5 w-5" />
          </div>
          <div>
            <DialogTitle className="text-lg font-bold">Buy USDT</DialogTitle>
            <DialogDescription className="text-xs">Pay in ETB via bank transfer — 1 USDT = {liveRate} ETB</DialogDescription>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {/* STEP 1: Amount */}
          {step === 'amount' && (
            <motion.div key="amount" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
              {/* Currency toggle */}
              <div className="flex items-center justify-center gap-2 rounded-xl border border-border bg-secondary/30 p-1">
                <button
                  onClick={() => { setCurrency('USDT'); setAmount('') }}
                  className={`flex-1 rounded-lg py-2 text-sm font-bold transition-colors ${currency === 'USDT' ? 'bg-gold text-primary-foreground' : 'text-muted-foreground'}`}
                >USDT</button>
                <button
                  onClick={() => { setCurrency('ETB'); setAmount('') }}
                  className={`flex-1 rounded-lg py-2 text-sm font-bold transition-colors ${currency === 'ETB' ? 'bg-gold text-primary-foreground' : 'text-muted-foreground'}`}
                >ETB (Birr)</button>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Amount in {currency}</Label>
                <Input
                  type="number"
                  min="0"
                  step="any"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder={currency === 'USDT' ? 'e.g. 50' : 'e.g. 9600'}
                  className="bg-secondary/40 text-lg font-bold"
                />
              </div>

              {/* Live conversion preview */}
              {amount && Number(amount) > 0 && (
                <div className="rounded-xl border border-gold/20 bg-gold/5 p-3 text-center">
                  <div className="flex items-center justify-center gap-2 text-sm">
                    <span className="font-bold text-gold">{usdtAmount.toFixed(4)} USDT</span>
                    <ArrowLeftRight className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="font-bold text-gold">{birrAmount.toLocaleString('en-US', { maximumFractionDigits: 2 })} ETB</span>
                  </div>
                  <div className="mt-1 text-[11px] text-muted-foreground">Rate: 1 USDT = {liveRate} ETB</div>
                </div>
              )}

              <Button
                className="bg-gold-gradient h-11 w-full font-semibold text-primary-foreground"
                disabled={!amount || Number(amount) <= 0}
                onClick={() => setStep('bank')}
              >
                Continue <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </motion.div>
          )}

          {/* STEP 2: Bank selection */}
          {step === 'bank' && (
            <motion.div key="bank" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
              <div className="rounded-lg border border-border bg-secondary/30 p-2.5 text-xs">
                Buying <b className="text-gold">{usdtAmount.toFixed(4)} USDT</b> for <b className="text-gold">{birrAmount.toLocaleString('en-US')} ETB</b>
              </div>
              <Label className="text-xs text-muted-foreground">Select your bank</Label>
              <div className="space-y-2">
                {BUY_BANKS.map((b) => (
                  <button
                    key={b.code}
                    onClick={() => { setBankCode(b.code); setStep('account') }}
                    className={`flex w-full items-center justify-between rounded-xl border p-3 text-left transition-all ${
                      bankCode === b.code ? 'border-gold bg-gold/10' : 'border-border bg-secondary/30 hover:border-gold/40'
                    }`}
                  >
                    <div>
                      <div className="text-sm font-bold">{b.name}</div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </button>
                ))}
              </div>
              <button onClick={() => setStep('amount')} className="w-full text-center text-xs text-muted-foreground hover:text-foreground">← Change amount</button>
            </motion.div>
          )}

          {/* STEP 3: Bank account + 20s countdown */}
          {step === 'account' && bank && (
            <motion.div key="account" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
              <div className="rounded-lg border border-border bg-secondary/30 p-2.5 text-xs">
                Buying <b className="text-gold">{usdtAmount.toFixed(4)} USDT</b> for <b className="text-gold">{birrAmount.toLocaleString('en-US')} ETB</b> via {bank.name}
              </div>

              <div className="rounded-xl border border-gold/30 bg-gold/5 p-4">
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Send exactly this much ETB to</div>
                <div className="mt-1 text-sm font-bold">{bank.name}</div>
                <div className="mt-2 text-[11px] text-muted-foreground">Account Name</div>
                <div className="text-sm font-semibold">{bank.accountName}</div>
                <div className="mt-2 text-[11px] text-muted-foreground">Account Number</div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 rounded-lg bg-background/60 p-2.5 font-mono text-sm font-bold">{bank.accountNumber}</div>
                  <button onClick={copyAccount} className="flex h-9 w-9 items-center justify-center rounded-lg border border-gold/40 text-gold hover:bg-gold/10">
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
                <div className="mt-2 text-[11px] text-muted-foreground">Amount to send: <b className="text-gold">{birrAmount.toLocaleString('en-US')} ETB</b></div>
              </div>

              {/* Empty space before copy, countdown after copy, proceed button after countdown */}
              {!countdownStarted ? (
                <div className="h-11" />
              ) : !canProceed ? (
                <div className="flex items-center justify-center gap-2 rounded-lg border border-gold/30 bg-gold/5 py-3 text-sm">
                  <Clock className="h-4 w-4 text-gold" />
                  <span className="text-muted-foreground">Please wait…</span>
                  <span className="font-bold text-gold">{countdown}s</span>
                </div>
              ) : (
                <Button className="bg-gold-gradient h-11 w-full font-semibold text-primary-foreground" onClick={() => setStep('upload')}>
                  I've Made the Payment <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              )}
              <button onClick={() => { setStep('bank'); setCountdownStarted(false); setCanProceed(false) }} className="w-full text-center text-xs text-muted-foreground hover:text-foreground">← Change bank</button>
            </motion.div>
          )}

          {/* STEP 4: Upload screenshot (optional) + transaction code */}
          {step === 'upload' && (
            <motion.div key="upload" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
              <div className="flex items-start gap-2 rounded-lg border border-gold/40 bg-gold/5 p-3 text-[11px] text-muted-foreground">
                <Upload className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
                <span>Upload a screenshot of your payment and/or enter the transaction code to confirm your buy order. Both are optional but recommended so the admin can verify your payment faster.</span>
              </div>

              {/* Screenshot upload (optional) */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Payment Screenshot (optional)</Label>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="flex w-full items-center gap-3 rounded-xl border border-dashed border-border bg-secondary/30 p-3 text-left transition-colors hover:border-gold/50"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gold/10 text-gold"><ImageIcon className="h-4 w-4" /></div>
                  <div className="flex-1">
                    <div className="text-xs font-semibold">{screenshotName || 'Click to upload screenshot'}</div>
                    <div className="text-[10px] text-muted-foreground">JPG, PNG or WEBP · max 8MB</div>
                  </div>
                  {uploading && <Loader2 className="h-4 w-4 animate-spin text-gold" />}
                  {screenshotUrl && !uploading && <Check className="h-4 w-4 text-up" />}
                </button>
                <input ref={fileRef} type="file" accept="image/*,.heic,.heif,.avif" className="hidden" onChange={handleScreenshot} />
              </div>

              {/* Screenshot preview */}
              {screenshotUrl && (
                <div className="rounded-lg border border-border overflow-hidden">
                  <img src={screenshotUrl} alt="Payment proof" className="w-full max-h-[200px] object-contain bg-black/30" />
                </div>
              )}

              {/* Optional transaction code */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Transaction Code (optional)</Label>
                <Input value={txnCode} onChange={(e) => setTxnCode(e.target.value)} placeholder="e.g. TXN123456789" className="bg-secondary/40 font-mono text-xs" />
              </div>

              <Button
                className="bg-gold-gradient h-11 w-full font-semibold text-primary-foreground"
                disabled={submitting}
                onClick={submitOrder}
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm & Submit'}
              </Button>
              <button onClick={() => setStep('account')} className="w-full text-center text-xs text-muted-foreground hover:text-foreground">← Back to account</button>
            </motion.div>
          )}

          {/* STEP 5: Done */}
          {step === 'done' && (
            <motion.div key="done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center py-6 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-up/15 text-up ring-2 ring-up/30">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <h3 className="mt-4 text-lg font-bold">Buy Order Submitted</h3>
              <p className="mt-1 max-w-xs text-sm text-muted-foreground">
                Your buy order for <b className="text-gold">{usdtAmount.toFixed(4)} USDT</b> ({birrAmount.toLocaleString('en-US')} ETB) is <b className="text-gold">pending admin approval</b>. You'll be notified once the USDT is credited to your wallet.
              </p>
              <Button className="bg-gold-gradient mt-5 w-full font-semibold text-primary-foreground" onClick={close}>Done</Button>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  )
}
