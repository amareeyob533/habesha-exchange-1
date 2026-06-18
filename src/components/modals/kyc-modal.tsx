'use client'

import { useState, useRef } from 'react'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { useUI } from '@/hooks/use-ui'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/hooks/use-toast'
import { apiFetch, uploadFile } from '@/lib/api-client'
import { ShieldCheck, Loader2, Upload, ScanFace, IdCard, Check, Clock } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

type Step = 'level' | 'verify' | 'scanning' | 'submitting' | 'review'

export function KycModal() {
  const { kycOpen } = useUI()
  const { fetchMe } = useAuth()
  const { toast } = useToast()
  const [level, setLevel] = useState<'normal' | 'high' | null>(null)
  const [step, setStep] = useState<Step>('level')
  const [docUrl, setDocUrl] = useState<string | null>(null)
  const [selfieUrl, setSelfieUrl] = useState<string | null>(null)
  const [docName, setDocName] = useState('')
  const [selfieName, setSelfieName] = useState('')
  const docRef = useRef<HTMLInputElement>(null)
  const selfieRef = useRef<HTMLInputElement>(null)

  function close() {
    useUI.setState({ kycOpen: false })
  }

  function reset() {
    setLevel(null)
    setStep('level')
    setDocUrl(null)
    setSelfieUrl(null)
    setDocName('')
    setSelfieName('')
  }

  async function uploadDoc(e: React.ChangeEvent<HTMLInputElement>, kind: 'doc' | 'selfie') {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const { url } = await uploadFile('/api/kyc/upload', file)
      if (kind === 'doc') {
        setDocUrl(url)
        setDocName(file.name)
      } else {
        setSelfieUrl(url)
        setSelfieName(file.name)
      }
      toast({ title: 'Uploaded', description: `${kind === 'doc' ? 'Document' : 'Selfie'} uploaded.` })
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Upload failed', description: err.message })
    }
  }

  function startFaceCheck() {
    setStep('scanning')
    setTimeout(() => { void doSubmit() }, 2600)
  }

  async function doSubmit() {
    if (level === 'high' && !docUrl) {
      toast({ variant: 'destructive', title: 'ID required', description: 'Please upload your national ID.' })
      setStep('verify')
      return
    }
    setStep('submitting')
    try {
      await apiFetch('/api/kyc', {
        method: 'POST',
        body: JSON.stringify({ level, docUrl, selfieUrl }),
      })
      await fetchMe()
      setStep('review')
    } catch (err: any) {
      setStep('verify')
      toast({ variant: 'destructive', title: 'Submission failed', description: err.message })
    }
  }

  return (
    <Dialog open={kycOpen} onOpenChange={(v) => !v && close()}>
      <DialogContent className="max-w-[460px] border-border bg-card">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold/10 text-gold ring-1 ring-gold/20">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <DialogTitle className="text-lg font-bold">Account Verification</DialogTitle>
            <DialogDescription className="text-xs">Complete KYC to enable deposits & withdrawals</DialogDescription>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {step === 'level' && (
            <motion.div key="level" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
              <LevelCard
                active={level === 'normal'}
                onClick={() => setLevel('normal')}
                badge="Normal KYC"
                req="Live face check"
                benefit="Deposit & withdraw · up to $100,000"
                icon={ScanFace}
              />
              <LevelCard
                active={level === 'high'}
                onClick={() => setLevel('high')}
                badge="High KYC"
                req="National ID + live selfie"
                benefit="Unlimited deposits & withdrawals"
                icon={IdCard}
                highlight
              />
              <Button
                className="bg-gold-gradient h-11 w-full font-semibold text-primary-foreground"
                disabled={!level}
                onClick={() => setStep('verify')}
              >
                Continue
              </Button>
            </motion.div>
          )}

          {step === 'verify' && (
            <motion.div key="verify" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
              <div className="rounded-lg border border-border bg-secondary/30 p-3 text-xs text-muted-foreground">
                <b className="text-foreground">{level === 'high' ? 'High KYC' : 'Normal KYC'}</b> · {level === 'high' ? 'National ID + live selfie verification' : 'Live face check verification'}
              </div>

              {level === 'high' && (
                <div className="space-y-3">
                  <UploadField label="National ID document" fileName={docName} onClick={() => docRef.current?.click()} icon={IdCard} />
                  <input ref={docRef} type="file" accept="image/*" className="hidden" onChange={(e) => uploadDoc(e, 'doc')} />
                  <UploadField label="Live selfie (optional)" fileName={selfieName} onClick={() => selfieRef.current?.click()} icon={ScanFace} />
                  <input ref={selfieRef} type="file" accept="image/*" className="hidden" onChange={(e) => uploadDoc(e, 'selfie')} />
                </div>
              )}

              <div className="rounded-xl border border-gold/20 bg-gold/5 p-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-gold"><ScanFace className="h-4 w-4" /> Live Face Check</div>
                <p className="mt-1 text-[11px] text-muted-foreground">Position your face in the frame and stay still during the scan.</p>
              </div>

              <Button className="bg-gold-gradient h-11 w-full font-semibold text-primary-foreground" onClick={startFaceCheck}>
                <ScanFace className="mr-1 h-4 w-4" /> Start Face Check
              </Button>
              <button onClick={() => setStep('level')} className="w-full text-center text-xs text-muted-foreground hover:text-foreground">← Back</button>
            </motion.div>
          )}

          {step === 'scanning' && (
            <motion.div key="scanning" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center py-8">
              <div className="relative h-32 w-32">
                <div className="absolute inset-0 rounded-full border-2 border-gold/30" />
                <motion.div
                  className="absolute inset-0 rounded-full border-2 border-transparent"
                  style={{ borderTopColor: 'var(--gold)' }}
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <ScanFace className="h-10 w-10 text-gold" />
                </div>
                <motion.div
                  className="absolute left-0 right-0 h-0.5 bg-gold shadow-[0_0_12px_var(--gold)]"
                  initial={{ top: '10%' }}
                  animate={{ top: ['10%', '85%', '10%'] }}
                  transition={{ repeat: Infinity, duration: 1.6, ease: 'easeInOut' }}
                />
              </div>
              <div className="mt-5 text-sm font-semibold">Scanning your face…</div>
              <div className="mt-1 text-xs text-muted-foreground">Hold still and look at the camera</div>
            </motion.div>
          )}

          {step === 'submitting' && (
            <motion.div key="submitting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center py-8">
              <Loader2 className="h-10 w-10 animate-spin text-gold" />
              <div className="mt-4 text-sm font-semibold">Submitting verification…</div>
            </motion.div>
          )}

          {step === 'review' && (
            <motion.div key="review" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center py-6 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gold/15 text-gold ring-2 ring-gold/30">
                <Clock className="h-8 w-8" />
              </div>
              <h3 className="mt-4 text-lg font-bold">Under Review</h3>
              <p className="mt-1 max-w-xs text-sm text-muted-foreground">
                Your {level === 'high' ? 'High KYC' : 'KYC'} is being verified. This usually takes a few seconds. You'll be notified once approved.
              </p>
              <Button className="bg-gold-gradient mt-5 w-full font-semibold text-primary-foreground" onClick={() => { close(); reset() }}>
                Done
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  )
}

function LevelCard({ active, onClick, badge, req, benefit, icon: Icon, highlight }: { active: boolean; onClick: () => void; badge: string; req: string; benefit: string; icon: any; highlight?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`relative flex w-full items-start gap-3 rounded-xl border p-4 text-left transition-all ${
        active ? 'border-gold bg-gold/10' : 'border-border bg-secondary/30 hover:border-gold/40'
      }`}
    >
      <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${highlight ? 'bg-gold/20' : 'bg-secondary'} text-gold`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold">{badge}</span>
          {highlight && <span className="rounded bg-gold/15 px-1.5 py-0.5 text-[9px] font-bold text-gold">RECOMMENDED</span>}
        </div>
        <div className="mt-1 text-xs text-muted-foreground">Requirements: {req}</div>
        <div className="mt-0.5 text-xs text-up">{benefit}</div>
      </div>
      <div className={`mt-1 flex h-4 w-4 items-center justify-center rounded-full border ${active ? 'border-gold bg-gold text-primary-foreground' : 'border-border'}`}>
        {active && <Check className="h-3 w-3" />}
      </div>
    </button>
  )
}

function UploadField({ label, fileName, onClick, icon: Icon }: { label: string; fileName: string; onClick: () => void; icon: any }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <button
        type="button"
        onClick={onClick}
        className="flex w-full items-center gap-3 rounded-xl border border-dashed border-border bg-secondary/30 p-3 text-left transition-colors hover:border-gold/50"
      >
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gold/10 text-gold"><Icon className="h-4 w-4" /></div>
        <div className="flex-1">
          <div className="text-xs font-semibold">{fileName || 'Click to upload'}</div>
          <div className="text-[10px] text-muted-foreground">JPG, PNG or WEBP · max 8MB</div>
        </div>
        <Upload className="h-4 w-4 text-muted-foreground" />
      </button>
    </div>
  )
}
