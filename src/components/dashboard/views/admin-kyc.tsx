'use client'

import { useEffect, useState, useCallback } from 'react'
import { apiFetch, getStoredToken } from '@/lib/api-client'
import { useToast } from '@/hooks/use-toast'
import { timeAgo } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { motion } from 'framer-motion'
import { Check, X, Loader2, Inbox, Download, Eye, ShieldCheck, Search, ExternalLink } from 'lucide-react'

interface KycDoc {
  id: string
  side: string
  fileName: string
  mimeType: string
  size: number
  deleteAfter: string | null
}
interface KycApp {
  id: string
  fullName: string
  city: string
  idType: string
  status: string
  rejectReason: string | null
  submittedAt: string
  reviewedAt: string | null
  user: { id: string; uid: string; email: string; username: string | null; name: string | null }
  documents: KycDoc[]
}

const ID_LABELS: Record<string, string> = {
  driver_license: "Driver's License",
  national_id: 'National ID',
  passport: 'Passport',
}

export function KycAdmin({ refreshKey }: { refreshKey: number }) {
  const { toast } = useToast()
  const [apps, setApps] = useState<KycApp[]>([])
  const [loading, setLoading] = useState(false)
  const [acting, setActing] = useState<string | null>(null)
  const [rejecting, setRejecting] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [search, setSearch] = useState('')

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    if (!getStoredToken()) return
    if (!opts?.silent) setLoading(true)
    try {
      const data = await apiFetch<{ applications: KycApp[] }>('/api/admin/kyc?status=pending')
      const next = data.applications
      // Only update state if data actually changed (prevents flicker during polling)
      setApps((prev) => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next))
    } catch (err: any) {
      // Silently skip auth errors (happens during logout)
      const msg = String(err?.message || '')
      if (msg.includes('401') || msg.toLowerCase().includes('unauthorized')) return
      // Only show error toast on non-silent (manual) loads — silent polls fail quietly
      if (!opts?.silent) toast({ variant: 'destructive', title: 'Failed to load', description: err.message })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => { load() }, [load, refreshKey])

  // Fast polling: refresh pending KYC applications every 5s so new ones show up quickly.
  // Stop polling when the tab is hidden.
  useEffect(() => {
    let id: ReturnType<typeof setInterval> | null = null
    const start = () => { if (!id) id = setInterval(() => load({ silent: true }), 2000) }
    const stop = () => { if (id) { clearInterval(id); id = null } }
    const onVis = () => { document.hidden ? stop() : start() }
    start()
    document.addEventListener('visibilitychange', onVis)
    return () => { stop(); document.removeEventListener('visibilitychange', onVis) }
  }, [load])

  // Client-side filter (by name, uid, email, city)
  const filtered = search.trim()
    ? apps.filter((a) => {
        const q = search.toLowerCase()
        return (
          a.fullName.toLowerCase().includes(q) ||
          a.city.toLowerCase().includes(q) ||
          a.user.uid.includes(q) ||
          a.user.email.toLowerCase().includes(q) ||
          (a.user.username || '').toLowerCase().includes(q)
        )
      })
    : apps

  async function approve(id: string) {
    setActing(id)
    try {
      const res = await apiFetch<{ ok: boolean; message: string }>('/api/admin/kyc/approve', {
        method: 'POST',
        body: JSON.stringify({ applicationId: id }),
      })
      toast({ title: 'KYC Approved', description: res.message })
      await load({ silent: true })
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Failed', description: err.message })
    } finally {
      setActing(null)
    }
  }

  async function reject(id: string) {
    setActing(id)
    try {
      const res = await apiFetch<{ ok: boolean; message: string }>('/api/admin/kyc/reject', {
        method: 'POST',
        body: JSON.stringify({ applicationId: id, reason: rejectReason || undefined }),
      })
      toast({ title: 'KYC Rejected', description: res.message })
      setRejecting(null)
      setRejectReason('')
      await load({ silent: true })
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Failed', description: err.message })
    } finally {
      setActing(null)
    }
  }

  if (loading && apps.length === 0) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (apps.length === 0) {
    return (
      <div className="overflow-hidden glass-card rounded-2xl shadow-premium">
        <div className="flex flex-col items-center justify-center py-16 text-center text-sm text-muted-foreground">
          <Inbox className="mb-2 h-8 w-8 opacity-30" />
          No pending KYC applications
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, city, UID, email, or username…"
          className="bg-secondary/40 pl-9"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {filtered.map((a, i) => (
          <motion.div
            key={a.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            className="overflow-hidden glass-card rounded-2xl shadow-premium"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border bg-secondary/30 px-4 py-3">
              <div>
                <div className="text-sm font-bold text-primary">@{a.user.username || a.user.email}</div>
                <div className="text-[11px] text-muted-foreground">UID {a.user.uid} · {timeAgo(a.submittedAt)}</div>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1 text-[11px] font-semibold text-primary">
                  <ShieldCheck className="h-3.5 w-3.5" /> KYC
                </div>
                <div className="text-[10px] text-muted-foreground">{ID_LABELS[a.idType] || a.idType}</div>
              </div>
            </div>

            {/* KYC info */}
            <div className="space-y-3 p-4">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg border border-border bg-secondary/30 p-2">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Full Name</div>
                  <div className="font-semibold">{a.fullName}</div>
                </div>
                <div className="rounded-lg border border-border bg-secondary/30 p-2">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">City</div>
                  <div className="font-semibold">{a.city}</div>
                </div>
              </div>

              {/* ID documents (front + back) */}
              {a.documents.length > 0 ? (
                <div className="space-y-3">
                  <div className="text-[11px] font-semibold text-muted-foreground">ID Documents ({a.documents.length})</div>
                  {a.documents.map((doc) => (
                    <div key={doc.id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="text-[11px] font-bold uppercase tracking-wider text-primary">
                          {doc.side === 'back' ? 'Back of ID' : 'Front of ID'}
                        </div>
                        <div className="text-[10px] text-muted-foreground">{doc.fileName}</div>
                      </div>
                      <div className="rounded-lg border border-border overflow-hidden">
                        <img
                          src={`/api/kyc/document?id=${doc.id}`}
                          alt={`${doc.side} of ID`}
                          className="w-full max-h-[240px] object-contain bg-black/30"
                        />
                      </div>
                      <div className="flex gap-2">
                        <a
                          href={`/api/kyc/document?id=${doc.id}&download=true`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex-1"
                        >
                          <Button size="sm" variant="outline" className="w-full">
                            <Download className="mr-1 h-3.5 w-3.5" /> Download
                          </Button>
                        </a>
                        <a
                          href={`/api/kyc/document?id=${doc.id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex-1"
                        >
                          <Button size="sm" variant="outline" className="w-full">
                            <ExternalLink className="mr-1 h-3.5 w-3.5" /> Open
                          </Button>
                        </a>
                      </div>
                      {doc.deleteAfter && (
                        <div className="text-[10px] text-muted-foreground text-center">
                          Auto-deletes on {new Date(doc.deleteAfter).toLocaleString()}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-lg border border-border bg-secondary/20 p-3 text-center text-[11px] text-muted-foreground">
                  Documents auto-deleted (retention period expired)
                </div>
              )}

              {/* Reject reason input (when rejecting) */}
              {rejecting === a.id ? (
                <div className="space-y-2 border-t border-border pt-3">
                  <Label className="text-xs text-muted-foreground">Reason for rejection (optional)</Label>
                  <Input
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="e.g. ID photo is blurry"
                    className="bg-secondary/40 text-xs"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" className="h-9 flex-1 bg-down text-white hover:bg-down/90" disabled={acting === a.id} onClick={() => reject(a.id)}>
                      {acting === a.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />} Confirm Reject
                    </Button>
                    <Button size="sm" variant="outline" className="h-9" onClick={() => { setRejecting(null); setRejectReason('') }}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2 border-t border-border pt-3">
                  <Button size="sm" className="h-9 flex-1 bg-up text-white hover:bg-up/90" disabled={acting === a.id} onClick={() => approve(a.id)}>
                    {acting === a.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Approve
                  </Button>
                  <Button size="sm" variant="outline" className="h-9 border-down/40 text-down hover:bg-down/10" disabled={acting === a.id} onClick={() => setRejecting(a.id)}>
                    <X className="h-4 w-4" /> Reject
                  </Button>
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
