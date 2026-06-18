'use client'

import { useState, useRef, useCallback } from 'react'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { useUI } from '@/hooks/use-ui'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/hooks/use-toast'
import { apiFetch, uploadFile } from '@/lib/api-client'
import { CameraCapture } from '@/components/kyc/camera-capture'
import { ShieldCheck, Loader2, Upload, ScanFace, IdCard, Check, Clock, AlertCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

type Step = 'level' | 'capture' | 'submitting' | 'review'

export function KycModal() {
  const { kycOpen } = useUI()
  const { fetchMe } = useAuth()
  const { toast } = useToast()
  const [level, setLevel] = useState<'normal' | 'high' | null>(null)
  const [step, setStep] = useState<Step>('level')

  // Captured media (uploaded URLs)
  const [selfieVideoUrl, setSelfieVideoUrl] = useState<string | null>(null)
  const [selfiePhotoUrl, setSelfiePhotoUrl] = useState<string | null>(null)
  const [docUrl, setDocUrl] = useState<string | null>(null)
  const [docName, setDocName] = useState('')
  const docRef = useRef<HTMLInputElement>(null)
  const [uploadingVideo, setUploadingVideo] = useState(false)

  function close() {
    useUI.setState({ kycOpen: false })
  }

  function reset() {
    setLevel(null)
    setStep('level')
    setSelfieVideoUrl(null)
    setSelfiePhotoUrl(null)
    setDocUrl(null)
    setDocName('')
  }

  const handleCaptured = useCallback(async ({ videoBlob, thumbnailDataUrl }: { videoBlob: Blob; thumbnailDataUrl: string }) => {
    setUploadingVideo(true)
    try {
      // Upload the recorded video
      const videoFile = new File([videoBlob], 'selfie.webm', { type: 'video/webm' })
      const vRes = await uploadFile('/api/kyc/upload', videoFile)
      setSelfieVideoUrl(vRes.url)

      // Upload the thumbnail frame as the selfie photo
      const thumbBlob = await (await fetch(thumbnailDataUrl)).blob()
      const thumbFile = new File([thumbBlob], 'selfie.jpg', { type: 'image/jpeg' })
      const pRes = await uploadFile('/api/kyc/upload', thumbFile)
      setSelfiePhotoUrl(pRes.url)

      toast({ title: 'Face capture uploaded', description: 'Your live video was recorded successfully.' })
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Upload failed', description: err.message })
    } finally {
      setUploadingVideo(false)
    }
  }, [toast])

  async function uploadDoc(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const { url } = await uploadFile('/api/kyc/upload', file)
      setDocUrl(url)
      setDocName(file.name)
      toast({ title: 'ID uploaded', description: file.name })
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Upload failed', description: err.message })
    }
  }

  async function submit() {
    if (!selfieVideoUrl && !selfiePhotoUrl) {
      toast({ variant: 'destructive', title: 'Face capture required', description: 'Please record your live face video first.' })
      setStep('capture')
      return
    }
    if (level === 'high' && !docUrl) {
      toast({ variant: 'destructive', title: 'ID required', description: 'Please upload your national ID photo.' })
      setStep('capture')
      return
    }
    setStep('submitting')
    try {
      await apiFetch('/api/kyc', {
        method: 'POST',
        body: JSON.stringify({ level, docUrl, selfieUrl: selfiePhotoUrl, selfieVideoUrl }),
      })
      await fetchMe()
      setStep('review')
    } catch (err: any) {
      setStep('capture')
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
                req="Live face video (camera)"
                benefit="Deposit & withdraw · up to $100,000"
                icon={ScanFace}
              />
              <LevelCard
                active={level === 'high'}
                onClick={() => setLevel('high')}
                badge="High KYC"
                req="National ID photo + live face video"
                benefit="Unlimited deposits & withdrawals"
                icon={IdCard}
                highlight
              />
              <div className="flex items-start gap-2 rounded-lg border border-gold/20 bg-gold/5 p-2.5 text-[11px] text-muted-foreground">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold" />
                <span>Both levels require a <b className="text-gold">live camera recording</b> of your face. Your verification is reviewed and approved manually by our admin team — no instant auto-approval.</span>
              </div>
              <Button className="bg-gold-gradient h-11 w-full font-semibold text-primary-foreground" disabled={!level} onClick={() => setStep('capture')}>
                Continue
              </Button>
            </motion.div>
          )}

          {step === 'capture' && (
            <motion.div key="capture" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
              <div className="rounded-lg border border-border bg-secondary/30 p-3 text-xs text-muted-foreground">
                <b className="text-foreground">{level === 'high' ? 'High KYC' : 'Normal KYC'}</b> · {level === 'high' ? 'ID photo + live face video' : 'Live face video'}
              </div>

              {/* Live camera capture (required for both levels) */}
              <CameraCapture
                duration={4}
                label="Live Face Video (required)"
                hint="Center your face in the frame, then click Start Recording"
                onCaptured={handleCaptured}
              />

              {uploadingVideo && (
                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-gold" /> Uploading your recording…
                </div>
              )}

              {/* ID card upload (high KYC only) */}
              {level === 'high' && (
                <div className="space-y-1.5 border-t border-border pt-4">
                  <Label className="text-xs text-muted-foreground">National ID Photo (required)</Label>
                  <button
                    type="button"
                    onClick={() => docRef.current?.click()}
                    className="flex w-full items-center gap-3 rounded-xl border border-dashed border-border bg-secondary/30 p-3 text-left transition-colors hover:border-gold/50"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gold/10 text-gold"><IdCard className="h-4 w-4" /></div>
                    <div className="flex-1">
                      <div className="text-xs font-semibold">{docName || 'Click to upload ID photo'}</div>
                      <div className="text-[10px] text-muted-foreground">JPG, PNG or WEBP · max 25MB</div>
                    </div>
                    <Upload className="h-4 w-4 text-muted-foreground" />
                  </button>
                  <input ref={docRef} type="file" accept="image/*" className="hidden" onChange={uploadDoc} />
                  {docUrl && (
                    <div className="flex items-center gap-1 text-[11px] text-up">
                      <Check className="h-3 w-3" /> ID photo uploaded
                    </div>
                  )}
                </div>
              )}

              <Button
                className="bg-gold-gradient h-11 w-full font-semibold text-primary-foreground"
                disabled={!selfieVideoUrl || (level === 'high' && !docUrl)}
                onClick={submit}
              >
                Submit for Review
              </Button>
              <button onClick={() => setStep('level')} className="w-full text-center text-xs text-muted-foreground hover:text-foreground">← Back</button>
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
              <h3 className="mt-4 text-lg font-bold">Submitted for Review</h3>
              <p className="mt-1 max-w-xs text-sm text-muted-foreground">
                Your {level === 'high' ? 'High KYC' : 'KYC'} with the live face recording{level === 'high' ? ' and ID photo' : ''} has been submitted. Our admin team will review it and approve or reject it. You'll receive a notification with the result.
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
