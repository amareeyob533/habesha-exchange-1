'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { apiFetch, getStoredToken } from '@/lib/api-client'
import { compressImage, formatBytes as compressFormatBytes } from '@/lib/compress-image'
import { useToast } from '@/hooks/use-toast'
import { upload } from '@vercel/blob/client'
import { timeAgo } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { motion, AnimatePresence } from 'framer-motion'
import { Megaphone, Send, Loader2, Inbox, Video, Heart, Film, X, Upload, ImageIcon, Gift, Clock, Pencil, Check } from 'lucide-react'

interface AdminBroadcast {
  id: string
  title: string
  message: string
  hasVideo: boolean
  videoMime: string | null
  videoSize: number
  createdAt: string
  expiresAt: string | null
  isGift: boolean
  reactionCount: number
  seenCount: number
}

const MAX_MEDIA_BYTES = 25 * 1024 * 1024 // 25 MB

/** Expiry options for the dropdown. */
type ExpiryKey = '1h' | '1d' | '3d' | '1w' | 'never'
const EXPIRY_OPTIONS: { key: ExpiryKey; label: string; ms: number | null }[] = [
  { key: '1h', label: '1 hour', ms: 60 * 60 * 1000 },
  { key: '1d', label: '1 day', ms: 24 * 60 * 60 * 1000 },
  { key: '3d', label: '3 days', ms: 3 * 24 * 60 * 60 * 1000 },
  { key: '1w', label: '1 week', ms: 7 * 24 * 60 * 60 * 1000 },
  { key: 'never', label: 'Never', ms: null },
]

/** Compute an ISO date string for the given expiry option (or null for never). */
function expiryToISO(key: ExpiryKey): string | null {
  const opt = EXPIRY_OPTIONS.find((o) => o.key === key)
  if (!opt || opt.ms === null) return null
  return new Date(Date.now() + opt.ms).toISOString()
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

/** Human-readable remaining/expired label for a broadcast's expiry. */
function describeExpiry(expiresAt: string | null): { text: string; tone: 'expired' | 'soon' | 'later' | 'never' } {
  if (!expiresAt) return { text: 'Never expires', tone: 'never' }
  const d = new Date(expiresAt)
  const ms = d.getTime() - Date.now()
  if (ms <= 0) return { text: 'Expired', tone: 'expired' }
  const mins = Math.floor(ms / 60000)
  if (mins < 60) return { text: `Expires in ${mins}m`, tone: 'soon' }
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return { text: `Expires in ${hrs}h`, tone: 'soon' }
  const days = Math.floor(hrs / 24)
  return { text: `Expires in ${days}d`, tone: 'later' }
}

export function BroadcastAdmin({ refreshKey }: { refreshKey: number }) {
  const { toast } = useToast()
  const [broadcasts, setBroadcasts] = useState<AdminBroadcast[]>([])
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)

  // Compose form state
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [mediaFile, setMediaFile] = useState<File | null>(null)
  const [mediaPreviewUrl, setMediaPreviewUrl] = useState<string | null>(null)
  const [mediaType, setMediaType] = useState<'video' | 'image' | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [expiryKey, setExpiryKey] = useState<ExpiryKey>('never')
  const [isGift, setIsGift] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  // Edit-expiry state for past broadcasts
  const [editingExpiry, setEditingExpiry] = useState<string | null>(null) // broadcast id
  const [editExpiryKey, setEditExpiryKey] = useState<ExpiryKey>('never')
  const [editIsGift, setEditIsGift] = useState(false)
  const [savingExpiry, setSavingExpiry] = useState<string | null>(null) // broadcast id currently saving

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    if (!getStoredToken()) return
    if (!opts?.silent) setLoading(true)
    try {
      const data = await apiFetch<{ broadcasts: AdminBroadcast[] }>('/api/admin/broadcast')
      const next = data.broadcasts || []
      // Only update state if data actually changed (prevents flicker during polling)
      setBroadcasts((prev) => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next))
    } catch (err: any) {
      const msg = String(err?.message || '')
      if (msg.includes('401') || msg.toLowerCase().includes('unauthorized')) return
      if (!opts?.silent) toast({ variant: 'destructive', title: 'Failed to load', description: err.message })
    } finally {
      if (!opts?.silent) setLoading(false)
    }
  }, [toast])

  useEffect(() => { load() }, [load, refreshKey])

  // Poll every 5s so new reaction/seen counts show up. Stop when tab is hidden.
  useEffect(() => {
    let id: ReturnType<typeof setInterval> | null = null
    const start = () => { if (!id) id = setInterval(() => load({ silent: true }), 5000) }
    const stop = () => { if (id) { clearInterval(id); id = null } }
    const onVis = () => { document.hidden ? stop() : start() }
    start()
    document.addEventListener('visibilitychange', onVis)
    return () => { stop(); document.removeEventListener('visibilitychange', onVis) }
  }, [load])

  // Clean up preview URL when media changes / unmounts.
  useEffect(() => {
    return () => {
      if (mediaPreviewUrl) URL.revokeObjectURL(mediaPreviewUrl)
    }
  }, [mediaPreviewUrl])

  async function handleMediaSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const isVideo = file.type.startsWith('video/')
    const isImage = file.type.startsWith('image/')
    if (!isVideo && !isImage) {
      toast({ variant: 'destructive', title: 'Invalid file', description: 'Please select a video or image file' })
      e.target.value = ''
      return
    }
    if (file.size > MAX_MEDIA_BYTES) {
      toast({ variant: 'destructive', title: 'File too large', description: `Max 25 MB. Your file is ${(file.size / 1024 / 1024).toFixed(1)} MB` })
      e.target.value = ''
      return
    }
    // Compress images in the browser before upload (videos are too complex to compress client-side)
    let finalFile = file
    if (isImage) {
      setUploading(true)
      try {
        const originalSize = file.size
        finalFile = await compressImage(file, 1280, 0.8)
        const savedPct = originalSize > 0 ? Math.round((1 - finalFile.size / originalSize) * 100) : 0
        if (savedPct > 10) {
          toast({ title: 'Image compressed', description: `${compressFormatBytes(originalSize)} → ${compressFormatBytes(finalFile.size)} (${savedPct}% smaller)` })
        }
      } catch {
        // compression failed, use original
      } finally {
        setUploading(false)
      }
    }
    if (mediaPreviewUrl) URL.revokeObjectURL(mediaPreviewUrl)
    setMediaFile(finalFile)
    setMediaType(isVideo ? 'video' : 'image')
    setMediaPreviewUrl(URL.createObjectURL(finalFile))
  }

  function clearMedia() {
    if (mediaPreviewUrl) URL.revokeObjectURL(mediaPreviewUrl)
    setMediaFile(null)
    setMediaPreviewUrl(null)
    setMediaType(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  async function send() {
    const t = title.trim()
    const m = message.trim()
    if (!t || !m) {
      toast({ variant: 'destructive', title: 'Missing fields', description: 'Title and message are required' })
      return
    }
    setSending(true)
    setUploadProgress(0)
    try {
      let mediaUrl: string | null = null

      if (mediaFile) {
        // Try Vercel Blob client upload first (handles files up to 25MB+,
        // bypasses Vercel's 4.5MB API body limit).
        try {
          setUploading(true)
          const blob = await upload(mediaFile.name, mediaFile, {
            access: 'public',
            handleUploadUrl: '/api/blob-upload',
            onUploadProgress: (progress: any) => {
              setUploadProgress(Math.round((progress.percentage || 0)))
            },
          })
          mediaUrl = blob.url
          setUploading(false)
        } catch (blobErr: any) {
          setUploading(false)
          // Blob upload failed — maybe BLOB_READ_WRITE_TOKEN isn't set.
          // Fall back to FormData (works for files < 4.5MB on Vercel).
          if (mediaFile.size > 4.5 * 1024 * 1024) {
            toast({
              variant: 'destructive',
              title: 'Upload failed',
              description: 'Large file upload requires Vercel Blob storage. Connect Blob in Vercel → Storage → Create → Blob. For now, use a file under 4.5 MB.',
            })
            setSending(false)
            return
          }
          // Small file — will be sent via FormData below
        }
      }

      // Convert expiry option → ISO string (or "never")
      const expiresAtISO = expiryToISO(expiryKey)

      // Build the request: if we have a Blob URL, send JSON; otherwise FormData
      const token = getStoredToken()
      let res: Response
      if (mediaUrl) {
        // Blob URL — send as JSON (no body size issue)
        res = await fetch('/api/admin/broadcast', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ title: t, message: m, mediaUrl, expiresAt: expiresAtISO, isGift }),
        })
      } else {
        // FormData (small file or no file)
        const form = new FormData()
        form.append('title', t)
        form.append('message', m)
        if (expiresAtISO) form.append('expiresAt', expiresAtISO)
        else form.append('expiresAt', 'never')
        form.append('isGift', isGift ? 'true' : 'false')
        if (mediaFile) form.append('file', mediaFile)
        res = await fetch('/api/admin/broadcast', {
          method: 'POST',
          body: form,
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
      }

      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error((data as any)?.error || `Request failed (${res.status})`)

      toast({
        title: isGift ? 'Gift broadcast sent' : 'Broadcast sent',
        description: expiryKey === 'never'
          ? 'Push notifications are being delivered to all users.'
          : `Expires in ${EXPIRY_OPTIONS.find((o) => o.key === expiryKey)?.label}. Pushing to all users.`,
      })
      // Reset form
      setTitle('')
      setMessage('')
      clearMedia()
      setExpiryKey('never')
      setIsGift(false)
      setUploadProgress(0)
      await load({ silent: true })
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Failed to send', description: err.message })
    } finally {
      setSending(false)
      setUploading(false)
    }
  }

  function startEditExpiry(b: AdminBroadcast) {
    setEditingExpiry(b.id)
    // Determine current expiryKey from the broadcast's expiresAt
    if (!b.expiresAt) {
      setEditExpiryKey('never')
    } else {
      const ms = new Date(b.expiresAt).getTime() - Date.now()
      if (ms <= 0) setEditExpiryKey('1h') // already expired → default to 1h for new value
      else if (ms < 2 * 60 * 60 * 1000) setEditExpiryKey('1h')
      else if (ms < 2 * 24 * 60 * 60 * 1000) setEditExpiryKey('1d')
      else if (ms < 4 * 24 * 60 * 60 * 1000) setEditExpiryKey('3d')
      else if (ms < 8 * 24 * 60 * 60 * 1000) setEditExpiryKey('1w')
      else setEditExpiryKey('never')
    }
    setEditIsGift(!!b.isGift)
  }

  async function saveEditExpiry(b: AdminBroadcast) {
    setSavingExpiry(b.id)
    try {
      const expiresAtISO = expiryToISO(editExpiryKey)
      await apiFetch('/api/admin/broadcast/expiry', {
        method: 'PATCH',
        body: JSON.stringify({ id: b.id, expiresAt: expiresAtISO, isGift: editIsGift }),
      })
      toast({ title: 'Broadcast updated', description: editExpiryKey === 'never' ? 'Expires: never' : `Expires in ${EXPIRY_OPTIONS.find((o) => o.key === editExpiryKey)?.label}` })
      setEditingExpiry(null)
      await load({ silent: true })
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Failed to update', description: err.message })
    } finally {
      setSavingExpiry(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Compose card */}
      <div className="overflow-hidden glass-card rounded-2xl shadow-premium">
        <div className="flex items-center justify-between border-b border-border bg-secondary/30 px-5 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gold/15 text-gold">
              <Megaphone className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-bold">New Broadcast</div>
              <div className="text-[11px] text-muted-foreground">Send a message + optional video to ALL users</div>
            </div>
          </div>
        </div>
        <div className="space-y-4 p-5">
          <div className="space-y-1.5">
            <Label htmlFor="bc-title" className="text-xs text-muted-foreground">Title</Label>
            <Input
              id="bc-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder=""
              className="bg-secondary/40"
              maxLength={120}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bc-message" className="text-xs text-muted-foreground">Message</Label>
            <Textarea
              id="bc-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Write your announcement…"
              className="bg-secondary/40 min-h-[100px]"
              maxLength={1000}
            />
          </div>

          {/* Expiry + Gift controls */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="h-3.5 w-3.5" /> Expiry
              </Label>
              <div className="relative">
                <select
                  value={expiryKey}
                  onChange={(e) => setExpiryKey(e.target.value as ExpiryKey)}
                  className="w-full appearance-none rounded-lg border border-border bg-secondary/40 px-3 py-2 text-sm font-medium outline-none transition-colors hover:border-gold/40 focus:border-gold/60 focus:ring-1 focus:ring-gold/30"
                >
                  {EXPIRY_OPTIONS.map((o) => (
                    <option key={o.key} value={o.key} className="bg-background">{o.label}</option>
                  ))}
                </select>
                <svg className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Gift className="h-3.5 w-3.5" /> Gift Broadcast
              </Label>
              <button
                type="button"
                onClick={() => setIsGift((v) => !v)}
                className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-sm font-medium transition-all ${
                  isGift
                    ? 'border-gold/60 bg-gold/10 text-gold'
                    : 'border-border bg-secondary/40 text-muted-foreground hover:border-gold/30 hover:text-foreground'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <Gift className={`h-4 w-4 ${isGift ? 'fill-current' : ''}`} />
                  {isGift ? 'Gift — shows popup' : 'Regular broadcast'}
                </span>
                <span className={`relative h-5 w-9 rounded-full transition-colors ${isGift ? 'bg-gold' : 'bg-secondary'}`}>
                  <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${isGift ? 'translate-x-4' : 'translate-x-0.5'}`} />
                </span>
              </button>
            </div>
          </div>

          {/* Media upload + preview (video or image) */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Optional media (max 25 MB, video or image)</Label>
            <input
              ref={fileRef}
              type="file"
              accept="video/*,image/*,.heic,.heif,.avif"
              onChange={handleMediaSelect}
              className="hidden"
            />
            {!mediaFile ? (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-secondary/20 p-6 text-sm text-muted-foreground transition-colors hover:border-gold/40 hover:bg-gold/5 hover:text-gold"
              >
                {uploading ? <Loader2 className="h-6 w-6 animate-spin" /> : <Upload className="h-6 w-6" />}
                <span className="font-semibold">{uploading ? 'Compressing…' : 'Click to upload a video or image'}</span>
                <span className="text-[11px]">MP4, WebM, MOV, JPG, PNG, HEIC · up to 25 MB</span>
              </button>
            ) : (
              <div className="rounded-xl border border-border bg-secondary/20 p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2 text-xs">
                    {mediaType === 'video' ? <Film className="h-4 w-4 shrink-0 text-gold" /> : <ImageIcon className="h-4 w-4 shrink-0 text-gold" />}
                    <span className="truncate font-semibold">{mediaFile.name}</span>
                    <span className="shrink-0 text-muted-foreground">{formatBytes(mediaFile.size)}</span>
                  </div>
                  <Button size="sm" variant="ghost" className="h-7 px-2 text-muted-foreground hover:text-down" onClick={clearMedia}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                {mediaPreviewUrl && mediaType === 'video' && (
                  <video
                    src={mediaPreviewUrl}
                    controls
                    className="w-full max-h-[280px] rounded-lg bg-black/40"
                  />
                )}
                {mediaPreviewUrl && mediaType === 'image' && (
                  <img
                    src={mediaPreviewUrl}
                    alt="Preview"
                    className="w-full max-h-[280px] rounded-lg object-contain bg-black/20"
                  />
                )}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between border-t border-border pt-3">
            <div className="text-[11px] text-muted-foreground">
              {title || message || mediaFile ? 'Ready to send' : 'Fill in title + message to broadcast'}
            </div>
            <Button
              onClick={send}
              disabled={sending || uploading || !title.trim() || !message.trim()}
              className="bg-gold text-black hover:bg-gold/90"
            >
              {sending || uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : isGift ? <Gift className="h-4 w-4" /> : <Send className="h-4 w-4" />}
              {uploading ? `Uploading… ${uploadProgress}%` : sending ? 'Sending…' : isGift ? 'Send Gift to All Users' : 'Send to All Users'}
            </Button>
          </div>
        </div>
      </div>

      {/* Past broadcasts */}
      <div>
        <div className="mb-3 flex items-center gap-2">
          <Megaphone className="h-4 w-4 text-gold" />
          <h3 className="text-sm font-bold">Past Broadcasts</h3>
          {broadcasts.length > 0 && <span className="text-[11px] text-muted-foreground">({broadcasts.length})</span>}
        </div>

        {loading && broadcasts.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : broadcasts.length === 0 ? (
          <div className="overflow-hidden glass-card rounded-2xl shadow-premium">
            <div className="flex flex-col items-center justify-center py-12 text-center text-sm text-muted-foreground">
              <Inbox className="mb-2 h-8 w-8 opacity-30" />
              No broadcasts yet
            </div>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {broadcasts.map((b, i) => {
              const exp = describeExpiry(b.expiresAt)
              const expColor =
                exp.tone === 'expired' ? 'bg-down/15 text-down'
                : exp.tone === 'soon' ? 'bg-gold/15 text-gold'
                : exp.tone === 'never' ? 'bg-secondary/40 text-muted-foreground'
                : 'bg-up/15 text-up'
              const isEditing = editingExpiry === b.id
              return (
                <motion.div
                  key={b.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="overflow-hidden glass-card rounded-2xl shadow-premium"
                >
                  <div className="flex items-start justify-between gap-2 border-b border-border bg-secondary/30 px-4 py-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        {b.hasVideo && <Video className="h-3.5 w-3.5 shrink-0 text-gold" />}
                        {b.isGift && (
                          <span className="flex items-center gap-0.5 rounded bg-gold/20 px-1 py-0.5 text-[10px] font-bold text-gold">
                            <Gift className="h-3 w-3 fill-current" /> GIFT
                          </span>
                        )}
                        <span className="truncate text-sm font-bold">{b.title}</span>
                      </div>
                      <div className="text-[11px] text-muted-foreground">{timeAgo(b.createdAt)}</div>
                    </div>
                    {b.hasVideo && (
                      <span className="shrink-0 rounded bg-gold/15 px-1.5 py-0.5 text-[10px] font-bold text-gold">
                        VIDEO · {formatBytes(b.videoSize)}
                      </span>
                    )}
                  </div>
                  <div className="space-y-2 p-4">
                    <p className="line-clamp-3 text-xs text-muted-foreground">{b.message}</p>

                    {/* Expiry + edit panel */}
                    <div className="border-t border-border pt-2">
                      {isEditing ? (
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="relative">
                              <select
                                value={editExpiryKey}
                                onChange={(e) => setEditExpiryKey(e.target.value as ExpiryKey)}
                                className="appearance-none rounded-lg border border-border bg-secondary/40 px-2.5 py-1.5 text-xs font-medium outline-none hover:border-gold/40 focus:border-gold/60"
                              >
                                {EXPIRY_OPTIONS.map((o) => (
                                  <option key={o.key} value={o.key} className="bg-background">{o.label}</option>
                                ))}
                              </select>
                              <svg className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="6 9 12 15 18 9" />
                              </svg>
                            </div>
                            <button
                              type="button"
                              onClick={() => setEditIsGift((v) => !v)}
                              className={`flex items-center gap-1 rounded-lg border px-2 py-1.5 text-xs font-medium transition-colors ${
                                editIsGift ? 'border-gold/60 bg-gold/10 text-gold' : 'border-border bg-secondary/40 text-muted-foreground hover:text-foreground'
                              }`}
                            >
                              <Gift className={`h-3 w-3 ${editIsGift ? 'fill-current' : ''}`} />
                              {editIsGift ? 'Gift' : 'Regular'}
                            </button>
                            <div className="ml-auto flex items-center gap-1">
                              <Button
                                size="sm"
                                className="h-7 bg-gold px-2 text-xs text-black hover:bg-gold/90"
                                disabled={savingExpiry === b.id}
                                onClick={() => saveEditExpiry(b)}
                              >
                                {savingExpiry === b.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                                Save
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 px-2 text-xs"
                                onClick={() => setEditingExpiry(null)}
                                disabled={savingExpiry === b.id}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-2">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${expColor}`}>
                            <Clock className="h-3 w-3" />
                            {exp.text}
                          </span>
                          <button
                            type="button"
                            onClick={() => startEditExpiry(b)}
                            disabled={!!savingExpiry}
                            className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-gold"
                          >
                            <Pencil className="h-3 w-3" />
                            Edit expiry
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-4 border-t border-border pt-2 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Heart className="h-3.5 w-3.5 text-down" /> {b.reactionCount} reactions
                      </span>
                      <span>{b.seenCount} seen</span>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
