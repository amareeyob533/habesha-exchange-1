'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { apiFetch, getStoredToken } from '@/lib/api-client'
import { useToast } from '@/hooks/use-toast'
import { timeAgo } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { motion } from 'framer-motion'
import { Megaphone, Send, Loader2, Inbox, Video, Heart, Film, X, Upload } from 'lucide-react'

interface AdminBroadcast {
  id: string
  title: string
  message: string
  hasVideo: boolean
  videoMime: string | null
  videoSize: number
  createdAt: string
  reactionCount: number
  seenCount: number
}

const MAX_VIDEO_BYTES = 10 * 1024 * 1024 // 10 MB

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

export function BroadcastAdmin({ refreshKey }: { refreshKey: number }) {
  const { toast } = useToast()
  const [broadcasts, setBroadcasts] = useState<AdminBroadcast[]>([])
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)

  // Compose form state
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

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

  // Clean up preview URL when video changes / unmounts.
  useEffect(() => {
    return () => {
      if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl)
    }
  }, [videoPreviewUrl])

  function handleVideoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('video/')) {
      toast({ variant: 'destructive', title: 'Invalid file', description: 'Please select a video file' })
      e.target.value = ''
      return
    }
    if (file.size > MAX_VIDEO_BYTES) {
      toast({ variant: 'destructive', title: 'Video too large', description: 'Max 10 MB' })
      e.target.value = ''
      return
    }
    if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl)
    setVideoFile(file)
    setVideoPreviewUrl(URL.createObjectURL(file))
  }

  function clearVideo() {
    if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl)
    setVideoFile(null)
    setVideoPreviewUrl(null)
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
    try {
      // Build multipart form with title + message + optional video file.
      const form = new FormData()
      form.append('title', t)
      form.append('message', m)
      if (videoFile) form.append('file', videoFile)

      // We bypass apiFetch here because it hard-codes Content-Type: application/json.
      // FormData needs the browser to set its own multipart boundary.
      const token = getStoredToken()
      const res = await fetch('/api/admin/broadcast', {
        method: 'POST',
        body: form,
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error((data as any)?.error || `Request failed (${res.status})`)

      toast({ title: 'Broadcast sent', description: 'Push notifications are being delivered to all users.' })
      // Reset form
      setTitle('')
      setMessage('')
      clearVideo()
      await load({ silent: true })
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Failed to send', description: err.message })
    } finally {
      setSending(false)
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
              placeholder="e.g. New Listing: BTC Trading Now Live"
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

          {/* Video upload + preview */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Optional video (max 10 MB, any video type)</Label>
            <input
              ref={fileRef}
              type="file"
              accept="video/*"
              onChange={handleVideoSelect}
              className="hidden"
            />
            {!videoFile ? (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-secondary/20 p-6 text-sm text-muted-foreground transition-colors hover:border-gold/40 hover:bg-gold/5 hover:text-gold"
              >
                <Upload className="h-6 w-6" />
                <span className="font-semibold">Click to upload a video</span>
                <span className="text-[11px]">MP4, WebM, MOV · up to 10 MB</span>
              </button>
            ) : (
              <div className="rounded-xl border border-border bg-secondary/20 p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2 text-xs">
                    <Film className="h-4 w-4 shrink-0 text-gold" />
                    <span className="truncate font-semibold">{videoFile.name}</span>
                    <span className="shrink-0 text-muted-foreground">{formatBytes(videoFile.size)}</span>
                  </div>
                  <Button size="sm" variant="ghost" className="h-7 px-2 text-muted-foreground hover:text-down" onClick={clearVideo}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                {videoPreviewUrl && (
                  <video
                    src={videoPreviewUrl}
                    controls
                    className="w-full max-h-[280px] rounded-lg bg-black/40"
                  />
                )}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between border-t border-border pt-3">
            <div className="text-[11px] text-muted-foreground">
              {title || message || videoFile ? 'Ready to send' : 'Fill in title + message to broadcast'}
            </div>
            <Button
              onClick={send}
              disabled={sending || !title.trim() || !message.trim()}
              className="bg-gold text-black hover:bg-gold/90"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {sending ? 'Sending…' : 'Send to All Users'}
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
            {broadcasts.map((b, i) => (
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
                  <div className="flex items-center gap-4 border-t border-border pt-2 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Heart className="h-3.5 w-3.5 text-down" /> {b.reactionCount} reactions
                    </span>
                    <span>{b.seenCount} seen</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
