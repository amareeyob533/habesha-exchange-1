'use client'

import { useState, useEffect, useRef } from 'react'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useUI } from '@/hooks/use-ui'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/hooks/use-toast'
import { apiFetch, uploadFile } from '@/lib/api-client'
import { ShieldCheck, Loader2, Upload, Check, ChevronRight, ArrowLeft, IdCard, MapPin, User, CheckCircle2, Clock, XCircle, AlertCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

type Step = 'info' | 'name' | 'id' | 'submitting' | 'done'

const ID_TYPES = [
  { code: 'driver_license', label: "Driver's License", desc: 'Valid driving permit' },
  { code: 'national_id', label: 'National ID', desc: 'Government-issued ID card' },
  { code: 'passport', label: 'Passport', desc: 'Valid passport booklet' },
]

export function KycModal() {
  const { kycOpen } = useUI()
  const { fetchMe, user } = useAuth()
  const { toast } = useToast()
  const [step, setStep] = useState<Step>('info')
  const [fullName, setFullName] = useState('')
  const [city, setCity] = useState('')
  const [idType, setIdType] = useState('')
  const [docUrl, setDocUrl] = useState<string | null>(null)
  const [docId, setDocId] = useState<string | null>(null)
  const [docName, setDocName] = useState('')
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const open = kycOpen
  function close() {
    useUI.setState({ kycOpen: false })
  }

  // Reset when modal closes
  useEffect(() => {
    if (!open) {
      const t = setTimeout(() => {
        setStep('info'); setFullName(''); setCity(''); setIdType('')
        setDocUrl(null); setDocId(null); setDocName('')
      }, 300)
      return () => clearTimeout(t)
    }
  }, [open])

  // Pre-fill name from user profile
  useEffect(() => {
    if (open && user?.name && !fullName) setFullName(user.name)
  }, [open, user, fullName])

  const status = user?.kycStatus || 'none'

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
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
      const res = await uploadFile<{ id: string; url: string }>('/api/kyc/upload', file)
      setDocUrl(res.url)
      setDocId(res.id)
      setDocName(file.name)
      toast({ title: 'ID photo uploaded' })
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Upload failed', description: err.message || 'Could not upload image.' })
      e.target.value = ''
    } finally {
      setUploading(false)
    }
  }

  async function submit() {
    setSubmitting(true)
    setStep('submitting')
    try {
      await apiFetch('/api/kyc', {
        method: 'POST',
        body: JSON.stringify({ fullName, city, idType, documentId: docId }),
      })
      await fetchMe()
      setStep('done')
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Submission failed', description: err.message })
      setStep('id')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && close()}>
      <DialogContent className="max-w-[480px] w-[calc(100%-2rem)] glass-strong border-border/40">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <DialogTitle className="text-lg font-bold">Identity Verification (KYC)</DialogTitle>
            <DialogDescription className="text-xs">Verify your identity to unlock unlimited deposits & withdrawals</DialogDescription>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {/* STATUS VIEW — when already submitted */}
          {step === 'info' && status !== 'none' && status !== 'rejected' && (
            <motion.div key="status" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4 py-2">
              {status === 'pending' && (
                <div className="flex flex-col items-center py-4 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary ring-2 ring-primary/30">
                    <Clock className="h-8 w-8" />
                  </div>
                  <h3 className="mt-4 text-lg font-bold">Under Review</h3>
                  <p className="mt-1 max-w-xs text-sm text-muted-foreground">
                    Your KYC application is being reviewed by our admin team. You'll be notified once it's approved or rejected. This usually takes a few hours.
                  </p>
                </div>
              )}
              {status === 'approved' && (
                <div className="flex flex-col items-center py-4 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-up/15 text-up ring-2 ring-up/30">
                    <CheckCircle2 className="h-8 w-8" />
                  </div>
                  <h3 className="mt-4 text-lg font-bold">Verified ✓</h3>
                  <p className="mt-1 max-w-xs text-sm text-muted-foreground">
                    Your identity has been verified. You now have unlimited deposit and withdrawal limits.
                  </p>
                </div>
              )}
              {user?.kycFullName && (
                <div className="rounded-lg border border-border bg-secondary/30 p-3 text-xs">
                  <div className="flex justify-between py-0.5"><span className="text-muted-foreground">Full Name</span><span className="font-semibold">{user.kycFullName}</span></div>
                  <div className="flex justify-between py-0.5"><span className="text-muted-foreground">City</span><span className="font-semibold">{user.kycCity}</span></div>
                  <div className="flex justify-between py-0.5"><span className="text-muted-foreground">ID Type</span><span className="font-semibold">{ID_TYPES.find((t) => t.code === user.kycIdType)?.label || user.kycIdType}</span></div>
                  <div className="flex justify-between py-0.5"><span className="text-muted-foreground">Submitted</span><span className="font-semibold">{user.kycSubmittedAt ? new Date(user.kycSubmittedAt).toLocaleDateString() : '—'}</span></div>
                </div>
              )}
              <Button className="w-full" variant="outline" onClick={close}>Close</Button>
            </motion.div>
          )}

          {/* REJECTED VIEW — allow re-submission */}
          {step === 'info' && status === 'rejected' && (
            <motion.div key="rejected" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4 py-2">
              <div className="flex flex-col items-center py-4 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-down/15 text-down ring-2 ring-down/30">
                  <XCircle className="h-8 w-8" />
                </div>
                <h3 className="mt-4 text-lg font-bold">KYC Rejected</h3>
                <p className="mt-1 max-w-xs text-sm text-muted-foreground">
                  {user?.kycRejectReason || 'Your KYC application was rejected. You can re-submit your verification.'}
                </p>
              </div>
              <Button className="w-full bg-primary font-semibold text-primary-foreground" onClick={() => setStep('name')}>
                Re-submit Verification
              </Button>
            </motion.div>
          )}

          {/* STEP 1: Full name + city */}
          {step === 'info' && status === 'none' && (
            <motion.div key="start" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4 py-2">
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-[11px] text-muted-foreground">
                <div className="mb-1 flex items-center gap-1.5 font-semibold text-primary"><AlertCircle className="h-3.5 w-3.5" /> Deposit limit</div>
                Without KYC verification, you can deposit up to <b className="text-foreground">$500 USD</b> total. Verify your identity to unlock <b className="text-foreground">unlimited deposits & withdrawals</b>.
              </div>
              <Button className="w-full bg-primary font-semibold text-primary-foreground" onClick={() => setStep('name')}>
                Start Verification <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
              <Button className="w-full" variant="outline" onClick={close}>Later</Button>
            </motion.div>
          )}

          {/* STEP 1: Name + City */}
          {step === 'name' && (
            <motion.div key="name" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground">1</span>
                Personal Information
                <span className="ml-auto flex h-6 w-6 items-center justify-center rounded-full border border-border text-muted-foreground">2</span>
                <span className="text-muted-foreground">ID Document</span>
              </div>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground"><User className="mr-1 inline h-3 w-3" />Full Name (as written on your ID)</Label>
                  <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="e.g. Amare Yalew" className="bg-secondary/40" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground"><MapPin className="mr-1 inline h-3 w-3" />City where you live</Label>
                  <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Addis Ababa" className="bg-secondary/40" />
                </div>
              </div>
              <Button
                className="w-full bg-primary font-semibold text-primary-foreground"
                disabled={fullName.trim().length < 2 || city.trim().length < 2}
                onClick={() => setStep('id')}
              >
                Next <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
              <button onClick={() => setStep('info')} className="w-full text-center text-xs text-muted-foreground hover:text-foreground"><ArrowLeft className="mr-1 inline h-3 w-3" />Back</button>
            </motion.div>
          )}

          {/* STEP 2: ID type + upload */}
          {step === 'id' && (
            <motion.div key="id" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                <span className="flex h-6 w-6 items-center justify-center rounded-full border border-primary text-primary">1</span>
                <span className="text-muted-foreground">Personal Information</span>
                <span className="ml-auto flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground">2</span>
                ID Document
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground"><IdCard className="mr-1 inline h-3 w-3" />Choose your ID type</Label>
                <div className="space-y-2">
                  {ID_TYPES.map((t) => (
                    <button
                      key={t.code}
                      onClick={() => setIdType(t.code)}
                      className={`flex w-full items-center justify-between rounded-xl border p-3 text-left transition-all ${
                        idType === t.code ? 'border-primary bg-primary/10' : 'border-border bg-secondary/30 hover:border-primary/40'
                      }`}
                    >
                      <div>
                        <div className="text-sm font-bold">{t.label}</div>
                        <div className="text-[10px] text-muted-foreground">{t.desc}</div>
                      </div>
                      {idType === t.code && <Check className="h-4 w-4 text-primary" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Upload ID photo */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Upload a photo of your ID</Label>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="flex w-full items-center gap-3 rounded-xl border border-dashed border-border bg-secondary/30 p-3 text-left transition-colors hover:border-primary/50"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary"><Upload className="h-4 w-4" /></div>
                  <div className="flex-1">
                    <div className="text-xs font-semibold">{docName || 'Click to upload ID photo'}</div>
                    <div className="text-[10px] text-muted-foreground">Any image type · max 8MB</div>
                  </div>
                  {uploading && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                  {docUrl && !uploading && <Check className="h-4 w-4 text-up" />}
                </button>
                <input ref={fileRef} type="file" accept="image/*,.heic,.heif,.avif" className="hidden" onChange={handleUpload} />
              </div>

              {/* Preview */}
              {docUrl && (
                <div className="rounded-lg border border-border overflow-hidden">
                  <img src={docUrl} alt="ID document" className="w-full max-h-[200px] object-contain bg-black/30" />
                </div>
              )}

              <Button
                className="w-full bg-primary font-semibold text-primary-foreground"
                disabled={!idType || !docId || submitting}
                onClick={submit}
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Submit for Review <ChevronRight className="ml-1 h-4 w-4" /></>}
              </Button>
              <button onClick={() => setStep('name')} className="w-full text-center text-xs text-muted-foreground hover:text-foreground"><ArrowLeft className="mr-1 inline h-3 w-3" />Back</button>
            </motion.div>
          )}

          {/* SUBMITTING */}
          {step === 'submitting' && (
            <motion.div key="submitting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center py-8">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="mt-3 text-sm text-muted-foreground">Submitting your verification…</p>
            </motion.div>
          )}

          {/* DONE */}
          {step === 'done' && (
            <motion.div key="done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center py-6 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/15 text-primary ring-2 ring-primary/30">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <h3 className="mt-4 text-lg font-bold">Submitted for Review</h3>
              <p className="mt-1 max-w-xs text-sm text-muted-foreground">
                Your KYC application has been submitted. Our admin team will review it shortly. You'll be notified once it's approved.
              </p>
              <Button className="mt-5 w-full bg-primary font-semibold text-primary-foreground" onClick={close}>Done</Button>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  )
}
