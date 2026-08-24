'use client'

import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { useUI, type ViewKey } from '@/hooks/use-ui'
import { useAuth } from '@/hooks/use-auth'
import { apiFetch, getStoredToken } from '@/lib/api-client'
import { timeAgo } from '@/lib/format'
import { Bell, CheckCircle2, Info, AlertTriangle, ArrowRight, Megaphone, Heart, Loader2, Video, Gift } from 'lucide-react'
import { useEffect, useState, useCallback, useRef } from 'react'

const ICON: Record<string, any> = { success: CheckCircle2, info: Info, warning: AlertTriangle }
const COLOR: Record<string, string> = { success: 'text-up', info: 'text-gold', warning: 'text-down' }

interface Broadcast {
  id: string
  title: string
  message: string
  hasVideo: boolean
  videoMime: string | null
  videoSize: number
  createdAt: string
  expiresAt: string | null
  isGift: boolean
  seen: boolean
  reaction: string | null
  reactionCount: number
}

/**
 * Map a notification to the view it should navigate to when clicked.
 * Returns null if the notification isn't clickable.
 */
function getNotificationTarget(title: string): ViewKey | null {
  const t = title.toLowerCase()
  if (t.includes('deposit') || t.includes('withdraw') || t.includes('buy order') || t.includes('transfer') || t.includes('reward') || t.includes('exchange')) {
    return 'transactions'
  }
  if (t.includes('kyc') || t.includes('verification') || t.includes('verified')) {
    return 'profile'
  }
  if (t.includes('support') || t.includes('ticket')) {
    return 'support'
  }
  return 'transactions'
}

export function NotificationPanel() {
  const { notifOpen, setView } = useUI()
  const { notifications, fetchMe } = useAuth()
  const [tab, setTab] = useState<'notifications' | 'broadcasts'>('notifications')
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([])
  const [loadingBc, setLoadingBc] = useState(false)
  const [reacting, setReacting] = useState<string | null>(null)
  // Track which broadcasts we've already marked as seen this session so we
  // don't fire the same seen POST repeatedly while polling.
  const markedSeenRef = useRef<Set<string>>(new Set())

  // Mark notifications as read when the panel is opened with unread items.
  useEffect(() => {
    if (notifOpen && tab === 'notifications' && notifications.some((n) => !n.read)) {
      apiFetch('/api/notifications', { method: 'POST' }).then(() => fetchMe()).catch(() => {})
    }
    // notifications intentionally excluded to avoid re-firing
  }, [notifOpen, tab])

  // Load broadcasts when the panel opens on the Broadcasts tab.
  const loadBroadcasts = useCallback(async (opts?: { silent?: boolean }) => {
    if (!getStoredToken()) return
    if (!opts?.silent) setLoadingBc(true)
    try {
      const data = await apiFetch<{ broadcasts: Broadcast[] }>('/api/broadcasts')
      const next = data.broadcasts || []
      setBroadcasts((prev) => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next))

      // Auto-mark every visible broadcast as seen (lazy, fire-and-forget).
      // We only POST for ones we haven't already marked this session.
      for (const b of next) {
        if (!b.seen && !markedSeenRef.current.has(b.id)) {
          markedSeenRef.current.add(b.id)
          apiFetch('/api/broadcasts/seen', {
            method: 'POST',
            body: JSON.stringify({ broadcastId: b.id }),
          }).catch(() => {})
        }
      }
    } catch (err: any) {
      const msg = String(err?.message || '')
      if (msg.includes('401') || msg.toLowerCase().includes('unauthorized')) return
      if (!opts?.silent) {
        // soft fail
      }
    } finally {
      if (!opts?.silent) setLoadingBc(false)
    }
  }, [])

  useEffect(() => {
    if (notifOpen && tab === 'broadcasts') {
      loadBroadcasts()
    }
  }, [notifOpen, tab, loadBroadcasts])

  // Poll for new broadcasts every 5s while the panel is open on the Broadcasts tab.
  useEffect(() => {
    if (!notifOpen || tab !== 'broadcasts') return
    let id: ReturnType<typeof setInterval> | null = null
    const start = () => { if (!id) id = setInterval(() => loadBroadcasts({ silent: true }), 5000) }
    const stop = () => { if (id) { clearInterval(id); id = null } }
    const onVis = () => { document.hidden ? stop() : start() }
    start()
    document.addEventListener('visibilitychange', onVis)
    return () => { stop(); document.removeEventListener('visibilitychange', onVis) }
  }, [notifOpen, tab, loadBroadcasts])

  // Reset the "marked seen" memory when the panel closes so reopening re-marks.
  useEffect(() => {
    if (!notifOpen) markedSeenRef.current = new Set()
  }, [notifOpen])

  function close() {
    useUI.setState({ notifOpen: false })
  }

  function handleClick(title: string) {
    const target = getNotificationTarget(title)
    if (target) {
      close()
      setView(target)
    }
  }

  async function toggleReact(b: Broadcast) {
    // Optimistic update
    const prevReacted = !!b.reaction
    const prevCount = b.reactionCount
    setBroadcasts((prev) =>
      prev.map((x) =>
        x.id === b.id
          ? {
              ...x,
              reaction: prevReacted ? null : 'like',
              reactionCount: prevReacted ? Math.max(0, x.reactionCount - 1) : x.reactionCount + 1,
            }
          : x,
      ),
    )
    setReacting(b.id)
    try {
      const res = await apiFetch<{ ok: boolean; reacted: boolean }>('/api/broadcasts/react', {
        method: 'POST',
        body: JSON.stringify({ broadcastId: b.id, type: 'like' }),
      })
      // Reconcile with server response
      setBroadcasts((prev) =>
        prev.map((x) =>
          x.id === b.id
            ? {
                ...x,
                reaction: res.reacted ? 'like' : null,
                reactionCount: res.reacted
                  ? Math.max(prevCount, prevCount + (prevReacted ? 0 : 1))
                  : Math.max(0, prevCount - (prevReacted ? 1 : 0)),
              }
            : x,
        ),
      )
    } catch {
      // Revert on failure
      setBroadcasts((prev) =>
        prev.map((x) =>
          x.id === b.id
            ? { ...x, reaction: prevReacted ? 'like' : null, reactionCount: prevCount }
            : x,
        ),
      )
    } finally {
      setReacting(null)
    }
  }

  // Count unseen broadcasts for the badge
  const unseenBroadcasts = broadcasts.filter((b) => !b.seen).length
  const unreadNotifications = notifications.filter((n) => !n.read).length

  // Sort broadcasts so that unseen gift broadcasts appear at the top.
  // Order: 1) unseen gift, 2) seen gift, 3) unseen regular, 4) seen regular.
  // Within each group, preserve the API's createdAt desc order.
  const sortedBroadcasts = [...broadcasts].sort((a, b) => {
    const aRank = (a.isGift ? 2 : 0) + (a.seen ? 0 : 1)
    const bRank = (b.isGift ? 2 : 0) + (b.seen ? 0 : 1)
    if (aRank !== bRank) return bRank - aRank
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })

  return (
    <Sheet open={notifOpen} onOpenChange={(v) => !v && close()}>
      <SheetContent className="w-full border-border bg-card sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-gold" /> Notifications
          </SheetTitle>
        </SheetHeader>

        {/* Tab switcher with unread counts + glow */}
        <div className="mt-3 flex gap-1 rounded-xl bg-secondary/40 p-1">
          <button
            onClick={() => setTab('notifications')}
            className={`relative flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition-all ${
              tab === 'notifications' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Bell className="h-3.5 w-3.5" /> Notifications
            {unreadNotifications > 0 && tab !== 'notifications' && (
              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-down px-1 text-[9px] font-bold text-white">
                {unreadNotifications > 9 ? '9+' : unreadNotifications}
              </span>
            )}
          </button>
          <button
            onClick={() => setTab('broadcasts')}
            className={`relative flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition-all ${
              tab === 'broadcasts' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            } ${unseenBroadcasts > 0 && tab !== 'broadcasts' ? 'ring-2 ring-primary/50 animate-pulse' : ''}`}
          >
            <Megaphone className="h-3.5 w-3.5" /> Broadcasts
            {unseenBroadcasts > 0 && (
              <span className={`flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold text-white ${
                tab !== 'broadcasts' ? 'bg-primary' : 'bg-primary/60'
              }`}>
                {unseenBroadcasts > 9 ? '9+' : unseenBroadcasts}
              </span>
            )}
          </button>
        </div>

        {/* Content */}
        <div className="mt-3 max-h-[calc(100vh-11rem)] space-y-2 overflow-y-auto custom-scroll pr-1">
          {tab === 'notifications' ? (
            notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center text-sm text-muted-foreground">
                <Bell className="mb-2 h-8 w-8 opacity-40" />
                No notifications yet
              </div>
            ) : (
              notifications.map((n) => {
                const Icon = ICON[n.type] || Info
                const target = getNotificationTarget(n.title)
                return (
                  <button
                    key={n.id}
                    onClick={() => handleClick(n.title)}
                    className={`group flex w-full items-start gap-2.5 rounded-xl border p-3 text-left transition-all hover:shadow-premium ${
                      n.read ? 'border-border bg-secondary/20' : 'border-gold/30 bg-gold/5'
                    } ${target ? 'cursor-pointer hover:border-primary/40 hover:bg-primary/5' : 'cursor-default'}`}
                  >
                    <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${COLOR[n.type] || 'text-gold'}`} />
                    <div className="flex-1">
                      <div className="flex items-center gap-1">
                        <span className="text-sm font-semibold">{n.title}</span>
                        {target && <ArrowRight className="ml-auto h-3 w-3 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />}
                      </div>
                      <div className="mt-0.5 text-xs text-muted-foreground">{n.message}</div>
                      <div className="mt-1.5 text-[10px] text-muted-foreground">{timeAgo(n.createdAt)}</div>
                    </div>
                  </button>
                )
              })
            )
          ) : loadingBc && broadcasts.length === 0 ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : broadcasts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-sm text-muted-foreground">
              <Megaphone className="mb-2 h-8 w-8 opacity-40" />
              No broadcasts yet
            </div>
          ) : (
            sortedBroadcasts.map((b) => (
              <div
                key={b.id}
                className={`rounded-xl border p-3 transition-all ${
                  b.isGift
                    ? 'border-gold/50 bg-gradient-to-br from-gold/10 to-gold/5 shadow-[0_0_20px_-8px_rgba(240,185,11,0.45)]'
                    : b.seen ? 'border-border bg-secondary/20' : 'border-gold/30 bg-gold/5'
                }`}
              >
                {/* Header: title + date */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-1.5">
                    {b.isGift && (
                      <span className="flex h-5 w-5 items-center justify-center rounded-md bg-gold/20 text-gold" title="Gift broadcast">
                        <Gift className="h-3.5 w-3.5 fill-gold" />
                      </span>
                    )}
                    {b.hasVideo && <Video className="h-3.5 w-3.5 shrink-0 text-gold" />}
                    {b.isGift ? (
                      <span className="truncate text-sm font-extrabold text-gold-gradient">{b.title}</span>
                    ) : (
                      <span className="truncate text-sm font-bold">{b.title}</span>
                    )}
                  </div>
                  <span className="shrink-0 text-[10px] text-muted-foreground">{timeAgo(b.createdAt)}</span>
                </div>
                {/* Message */}
                {b.message && <p className="mt-1 text-xs text-muted-foreground">{b.message}</p>}

                {/* Media player (video or image) */}
                {b.hasVideo && (
                  <div className="mt-2 overflow-hidden rounded-lg border border-border bg-black/30">
                    {b.videoMime && b.videoMime.startsWith('image/') ? (
                      <img
                        src={`/api/broadcasts/video?id=${b.id}${getStoredToken() ? `&token=${getStoredToken()}` : ''}`}
                        alt={b.title}
                        className="w-full max-h-[300px] object-contain"
                      />
                    ) : (
                      <video
                        src={`/api/broadcasts/video?id=${b.id}${getStoredToken() ? `&token=${getStoredToken()}` : ''}`}
                        controls
                        playsInline
                        preload="metadata"
                        className="w-full max-h-[300px]"
                      />
                    )}
                  </div>
                )}

                {/* Like button */}
                <div className="mt-2 flex items-center justify-between border-t border-border/50 pt-2">
                  <button
                    onClick={() => toggleReact(b)}
                    disabled={reacting === b.id}
                    className={`flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-bold transition-colors ${
                      b.reaction
                        ? 'bg-down/15 text-down'
                        : 'bg-secondary/40 text-muted-foreground hover:bg-secondary/60 hover:text-foreground'
                    }`}
                  >
                    {reacting === b.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Heart className={`h-3.5 w-3.5 ${b.reaction ? 'fill-current' : ''}`} />
                    )}
                    {b.reactionCount > 0 ? b.reactionCount : 'Like'}
                  </button>
                  {!b.seen && (
                    <span className={`text-[10px] font-bold ${b.isGift ? 'text-gold' : 'text-gold'}`}>
                      {b.isGift ? '🎁 NEW GIFT' : 'NEW'}
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
