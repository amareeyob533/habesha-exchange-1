'use client'

import { useEffect, useState, useCallback } from 'react'
import { apiFetch } from '@/lib/api-client'
import { useToast } from '@/hooks/use-toast'
import { timeAgo } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { motion } from 'framer-motion'
import { Check, X, Loader2, Inbox, ShieldCheck, ScanFace, IdCard, Video } from 'lucide-react'

interface KycSubmission {
  id: string
  uid: string
  email: string
  name: string | null
  avatarUrl: string | null
  kycStatus: string
  kycLevel: string
  kycRequestedLevel: string | null
  kycSubmittedAt: string | null
  kycDocUrl: string | null
  kycSelfieUrl: string | null
  kycSelfieVideoUrl: string | null
}

interface KycAdminProps {
  refreshKey: number
}

export function KycAdmin({ refreshKey }: KycAdminProps) {
  const { toast } = useToast()
  const [submissions, setSubmissions] = useState<KycSubmission[]>([])
  const [loading, setLoading] = useState(false)
  const [acting, setActing] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await apiFetch<{ submissions: KycSubmission[] }>('/api/admin/kyc?status=pending')
      setSubmissions(data.submissions)
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Failed to load', description: err.message })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    load()
  }, [load, refreshKey])

  async function act(userId: string, action: 'approve' | 'reject') {
    setActing(userId)
    try {
      const res = await apiFetch<{ ok: boolean; message: string }>(`/api/admin/kyc/${action}`, {
        method: 'POST',
        body: JSON.stringify({ userId }),
      })
      toast({ title: action === 'approve' ? 'KYC Approved' : 'KYC Rejected', description: res.message })
      await load()
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Action failed', description: err.message })
    } finally {
      setActing(null)
    }
  }

  const pendingCount = submissions.length

  return (
    <div className="space-y-4">
      {pendingCount > 0 && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3 rounded-2xl border border-gold/40 bg-gold/5 p-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gold/15 text-gold animate-pulse-gold">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <div className="text-sm font-bold">{pendingCount} KYC submission{pendingCount > 1 ? 's' : ''} awaiting your review</div>
            <div className="text-xs text-muted-foreground">Review the live face video (and ID photo for High KYC) before approving.</div>
          </div>
        </motion.div>
      )}

      {submissions.length === 0 ? (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="flex flex-col items-center justify-center py-16 text-center text-sm text-muted-foreground">
            <Inbox className="mb-2 h-8 w-8 opacity-30" />
            No pending KYC submissions
          </div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {submissions.map((s, i) => {
            const isHigh = s.kycRequestedLevel === 'high'
            return (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="overflow-hidden rounded-2xl border border-border bg-card"
              >
                {/* Header: user + level */}
                <div className="flex items-center justify-between border-b border-border bg-secondary/30 px-4 py-3">
                  <div>
                    <div className="text-sm font-bold text-gold">UID {s.uid}</div>
                    <div className="text-[11px] text-muted-foreground">{s.email}</div>
                  </div>
                  <div className="text-right">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${isHigh ? 'bg-gold/15 text-gold' : 'bg-up/15 text-up'}`}>
                      {isHigh ? <IdCard className="h-3 w-3" /> : <ScanFace className="h-3 w-3" />}
                      {isHigh ? 'HIGH KYC' : 'NORMAL KYC'}
                    </span>
                    <div className="mt-1 text-[10px] text-muted-foreground">{s.kycSubmittedAt ? timeAgo(s.kycSubmittedAt) : ''}</div>
                  </div>
                </div>

                {/* Media */}
                <div className="space-y-3 p-4">
                  {/* Live face video */}
                  <div>
                    <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
                      <Video className="h-3 w-3 text-gold" /> Live Face Video
                    </div>
                    {s.kycSelfieVideoUrl ? (
                      <video src={s.kycSelfieVideoUrl} controls playsInline className="w-full rounded-lg border border-border bg-black" />
                    ) : s.kycSelfieUrl ? (
                      <img src={s.kycSelfieUrl} alt="Selfie" className="w-full rounded-lg border border-border" />
                    ) : (
                      <div className="rounded-lg border border-dashed border-border p-4 text-center text-[11px] text-muted-foreground">No face capture</div>
                    )}
                  </div>

                  {/* ID card (high KYC only) */}
                  {isHigh && (
                    <div>
                      <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
                        <IdCard className="h-3 w-3 text-gold" /> National ID Photo
                      </div>
                      {s.kycDocUrl ? (
                        <img src={s.kycDocUrl} alt="ID document" className="w-full rounded-lg border border-border" />
                      ) : (
                        <div className="rounded-lg border border-dashed border-border p-4 text-center text-[11px] text-muted-foreground">No ID photo</div>
                      )}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2 border-t border-border px-4 py-3">
                  <Button
                    size="sm"
                    className="h-9 flex-1 bg-up text-white hover:bg-up/90"
                    disabled={acting === s.id}
                    onClick={() => act(s.id, 'approve')}
                  >
                    {acting === s.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    Approve {isHigh ? 'High' : 'Normal'} KYC
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-9 border-down/40 text-down hover:bg-down/10"
                    disabled={acting === s.id}
                    onClick={() => act(s.id, 'reject')}
                  >
                    {acting === s.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                    Reject
                  </Button>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      <div className="rounded-xl border border-border bg-card p-4 text-xs text-muted-foreground">
        <b className="text-foreground">How KYC review works:</b> Each submission includes a <b className="text-gold">live face video</b> recorded from the user's camera (required for both levels) and, for High KYC, an <b className="text-gold">ID card photo</b>. Click <b className="text-up">Approve</b> to enable deposits & withdrawals at the requested level, or <b className="text-down">Reject</b> to clear the submission (the user can re-apply).
      </div>
    </div>
  )
}
