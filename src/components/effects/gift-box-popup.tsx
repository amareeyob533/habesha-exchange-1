'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Gift, X, Clock, Heart, Loader2 } from 'lucide-react'
import { apiFetch, getStoredToken } from '@/lib/api-client'
import { timeAgo } from '@/lib/format'

export interface GiftBroadcast {
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

interface GiftBoxPopupProps {
  /** The gift broadcast to display. Pass null to hide. */
  broadcast: GiftBroadcast | null
  /** Called when the user dismisses the popup (closed without opening, or after opening). */
  onClose: () => void
}

/** localStorage key tracking which gift broadcasts the user has seen this session/permanently. */
const seenKey = (id: string) => `gift-seen-${id}`

/**
 * Premium gift box popup — shown when a gift broadcast is available and the
 * user hasn't seen it yet (tracked via localStorage).
 *
 * UX:
 *  1. Full-screen dim + blur backdrop.
 *  2. Big gift box emoji 🎁 floats in with a bouncy spring animation.
 *  3. Title appears in gold below the box.
 *  4. "Tap to open" prompt pulses below.
 *  5. On click → box "opens" with a confetti burst, then the message is
 *     revealed in a styled panel.
 *  6. Confetti pieces fly outward (pure CSS / framer-motion, no libraries).
 */
export function GiftBoxPopup({ broadcast, onClose }: GiftBoxPopupProps) {
  const [opened, setOpened] = useState(false)
  const [reacting, setReacting] = useState(false)
  const [reaction, setReaction] = useState<string | null>(null)
  const [reactionCount, setReactionCount] = useState(0)

  // Keep the latest reaction state in sync when the broadcast prop changes.
  useEffect(() => {
    setReaction(broadcast?.reaction || null)
    setReactionCount(broadcast?.reactionCount || 0)
    setOpened(false)
  }, [broadcast?.id, broadcast?.reaction, broadcast?.reactionCount])

  // Mark as seen the moment we display the popup (so it only shows once).
  useEffect(() => {
    if (!broadcast) return
    try {
      localStorage.setItem(seenKey(broadcast.id), String(Date.now()))
    } catch {
      // ignore
    }
    // Also fire-and-forget the "seen" POST so the server stops re-pushing.
    if (!broadcast.seen) {
      apiFetch('/api/broadcasts/seen', {
        method: 'POST',
        body: JSON.stringify({ broadcastId: broadcast.id }),
      }).catch(() => {})
    }
  }, [broadcast])

  // Generate confetti particles once per open.
  const confetti = useMemo(
    () =>
      Array.from({ length: 60 }, (_, i) => {
        const angle = (i / 60) * Math.PI * 2 + Math.random() * 0.4
        const distance = 180 + Math.random() * 280
        const colors = ['#FFC83D', '#F0B90B', '#0ECB81', '#F6465D', '#A78BFA', '#60A5FA', '#FFFFFF']
        const size = 6 + Math.random() * 8
        return {
          id: i,
          x: Math.cos(angle) * distance,
          y: Math.sin(angle) * distance,
          color: colors[i % colors.length],
          size,
          delay: Math.random() * 0.15,
          rotate: Math.random() * 720 - 360,
          isCircle: Math.random() > 0.5,
        }
      }),
    // re-generate when the popup is opened for a new broadcast
    [opened, broadcast?.id],
  )

  const expiresSoon = (() => {
    if (!broadcast?.expiresAt) return null
    const ms = new Date(broadcast.expiresAt).getTime() - Date.now()
    if (ms <= 0) return null
    const mins = Math.floor(ms / 60000)
    if (mins < 60) return `${mins}m`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h`
    return `${Math.floor(hrs / 24)}d`
  })()

  async function handleOpen() {
    if (opened) return
    if (!broadcast) return
    setOpened(true)
    // Wait for the open animation to play, then keep the message panel visible.
  }

  async function toggleReact() {
    if (!broadcast) return
    const prevReacted = !!reaction
    const prevCount = reactionCount
    setReaction(prevReacted ? null : 'like')
    setReactionCount(prevReacted ? Math.max(0, prevCount - 1) : prevCount + 1)
    setReacting(true)
    try {
      const res = await apiFetch<{ ok: boolean; reacted: boolean }>('/api/broadcasts/react', {
        method: 'POST',
        body: JSON.stringify({ broadcastId: broadcast.id, type: 'like' }),
      })
      setReaction(res.reacted ? 'like' : null)
      setReactionCount(res.reacted ? Math.max(prevCount, prevCount + (prevReacted ? 0 : 1)) : Math.max(0, prevCount - (prevReacted ? 1 : 0)))
    } catch {
      setReaction(prevReacted ? 'like' : null)
      setReactionCount(prevCount)
    } finally {
      setReacting(false)
    }
  }

  return (
    <AnimatePresence>
      {broadcast && (
        <motion.div
          className="fixed inset-0 z-[180] flex items-center justify-center overflow-hidden p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Dimmed + blurred backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/70 backdrop-blur-md"
            onClick={() => !opened && onClose()}
          />

          {/* Close (X) button — top-right */}
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 z-50 flex h-10 w-10 items-center justify-center rounded-full bg-secondary/60 text-muted-foreground transition-colors hover:bg-secondary/80 hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Confetti pieces (only after opening) */}
          {opened && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              {confetti.map((p) => (
                <motion.div
                  key={p.id}
                  className="absolute"
                  style={{ width: p.size, height: p.size }}
                  initial={{ x: 0, y: 0, scale: 0, opacity: 0, rotate: 0 }}
                  animate={{
                    x: [0, p.x * 0.6, p.x],
                    y: [0, p.y * 0.6, p.y + 100],
                    scale: [0, 1.4, 0.8],
                    opacity: [0, 1, 0],
                    rotate: p.rotate,
                  }}
                  transition={{
                    duration: 1.6,
                    delay: p.delay,
                    ease: 'easeOut',
                  }}
                >
                  <div
                    className={p.isCircle ? 'h-full w-full rounded-full' : 'h-full w-full rounded-sm'}
                    style={{ background: p.color, boxShadow: `0 0 8px ${p.color}80` }}
                  />
                </motion.div>
              ))}
            </div>
          )}

          {/* Main content */}
          <AnimatePresence mode="wait">
            {!opened ? (
              <motion.div
                key="closed"
                className="relative flex flex-col items-center text-center"
                initial={{ y: 80, opacity: 0, scale: 0.6 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ scale: 0.4, opacity: 0, transition: { duration: 0.25 } }}
                transition={{ type: 'spring', stiffness: 220, damping: 14 }}
              >
                {/* Radial golden glow behind the box */}
                <motion.div
                  className="absolute -z-10 rounded-full"
                  style={{
                    width: 380,
                    height: 380,
                    background: 'radial-gradient(circle, rgba(240,185,11,0.45) 0%, rgba(255,200,61,0.18) 40%, transparent 70%)',
                  }}
                  animate={{ scale: [1, 1.15, 1], opacity: [0.6, 0.9, 0.6] }}
                  transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                />

                {/* Floating ring of sparkles around the box */}
                <div className="absolute -z-10 h-72 w-72">
                  {Array.from({ length: 8 }).map((_, i) => {
                    const angle = (i / 8) * Math.PI * 2
                    const r = 130
                    return (
                      <motion.div
                        key={i}
                        className="absolute h-2 w-2 rounded-full bg-gold"
                        style={{
                          left: '50%',
                          top: '50%',
                          boxShadow: '0 0 10px rgba(240,185,11,0.9)',
                        }}
                        animate={{
                          x: [Math.cos(angle) * r * 0.7, Math.cos(angle) * r, Math.cos(angle) * r * 0.7],
                          y: [Math.sin(angle) * r * 0.7, Math.sin(angle) * r, Math.sin(angle) * r * 0.7],
                          opacity: [0.4, 1, 0.4],
                          scale: [0.6, 1, 0.6],
                        }}
                        transition={{
                          duration: 2.4,
                          repeat: Infinity,
                          ease: 'easeInOut',
                          delay: i * 0.15,
                        }}
                      />
                    )
                  })}
                </div>

                {/* The gift box (clickable) */}
                <motion.button
                  type="button"
                  onClick={handleOpen}
                  className="relative cursor-pointer select-none focus:outline-none"
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.92 }}
                  animate={{ y: [0, -12, 0] }}
                  transition={{
                    y: { duration: 2.6, repeat: Infinity, ease: 'easeInOut' },
                  }}
                >
                  {/* Big gift emoji with glow */}
                  <span
                    className="block text-[120px] leading-none sm:text-[160px]"
                    style={{
                      filter: 'drop-shadow(0 8px 32px rgba(240,185,11,0.65)) drop-shadow(0 0 12px rgba(255,200,61,0.5))',
                    }}
                  >
                    🎁
                  </span>
                  {/* Ribbon glow overlay */}
                  <motion.div
                    className="absolute inset-0 rounded-full"
                    style={{
                      background: 'radial-gradient(circle, rgba(240,185,11,0.35) 0%, transparent 60%)',
                    }}
                    animate={{ opacity: [0.4, 0.8, 0.4], scale: [0.9, 1.1, 0.9] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                  />
                </motion.button>

                {/* Title in gold */}
                <motion.div
                  className="mt-6 max-w-md px-4"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <div className="flex items-center justify-center gap-2">
                    <Gift className="h-5 w-5 fill-gold text-gold" />
                    <span className="text-[11px] font-bold uppercase tracking-wider text-gold">You received a gift</span>
                    <Gift className="h-5 w-5 fill-gold text-gold" />
                  </div>
                  <h2 className="mt-2 text-2xl font-extrabold text-gold-gradient sm:text-3xl">
                    {broadcast.title}
                  </h2>
                  {expiresSoon && (
                    <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-gold/15 px-2.5 py-0.5 text-[11px] font-bold text-gold">
                      <Clock className="h-3 w-3" />
                      Expires in {expiresSoon}
                    </div>
                  )}
                </motion.div>

                {/* "Tap to open" prompt */}
                <motion.div
                  className="mt-5"
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <span className="text-sm font-semibold text-muted-foreground">Tap to open</span>
                </motion.div>
              </motion.div>
            ) : (
              <motion.div
                key="opened"
                className="relative w-full max-w-md"
                initial={{ scale: 0.7, opacity: 0, y: 30 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 200, damping: 18, delay: 0.15 }}
              >
                {/* Opened gift message panel */}
                <div className="overflow-hidden rounded-3xl border border-gold/40 bg-card shadow-[0_8px_60px_rgba(240,185,11,0.35)]">
                  {/* Header */}
                  <div className="flex items-center gap-2 border-b border-border bg-gradient-to-r from-gold/20 via-gold/10 to-gold/20 px-5 py-4">
                    <motion.div
                      initial={{ rotate: -20, scale: 0.5 }}
                      animate={{ rotate: 0, scale: 1 }}
                      transition={{ type: 'spring', stiffness: 260, damping: 10, delay: 0.2 }}
                    >
                      <Gift className="h-6 w-6 fill-gold text-gold" />
                    </motion.div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-gold">Gift from Habesha</div>
                      <div className="truncate text-base font-bold">{broadcast.title}</div>
                    </div>
                    <span className="shrink-0 text-[10px] text-muted-foreground">{timeAgo(broadcast.createdAt)}</span>
                  </div>

                  {/* Body */}
                  <div className="space-y-3 p-5">
                    <p className="whitespace-pre-wrap break-words text-sm text-foreground">{broadcast.message}</p>

                    {/* Media (video or image) */}
                    {broadcast.hasVideo && (
                      <div className="overflow-hidden rounded-xl border border-border bg-black/30">
                        {broadcast.videoMime && broadcast.videoMime.startsWith('image/') ? (
                          <img
                            src={`/api/broadcasts/video?id=${broadcast.id}${getStoredToken() ? `&token=${getStoredToken()}` : ''}`}
                            alt={broadcast.title}
                            className="w-full max-h-[320px] object-contain"
                          />
                        ) : (
                          <video
                            src={`/api/broadcasts/video?id=${broadcast.id}${getStoredToken() ? `&token=${getStoredToken()}` : ''}`}
                            controls
                            playsInline
                            preload="metadata"
                            className="w-full max-h-[320px]"
                          />
                        )}
                      </div>
                    )}

                    {/* Action row */}
                    <div className="flex items-center justify-between border-t border-border pt-3">
                      <button
                        type="button"
                        onClick={toggleReact}
                        disabled={reacting}
                        className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
                          reaction
                            ? 'bg-down/15 text-down'
                            : 'bg-secondary/40 text-muted-foreground hover:bg-secondary/60 hover:text-foreground'
                        }`}
                      >
                        {reacting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Heart className={`h-3.5 w-3.5 ${reaction ? 'fill-current' : ''}`} />}
                        {reactionCount > 0 ? reactionCount : 'Like'}
                      </button>
                      <Button onClick={onClose} className="bg-gold text-black hover:bg-gold/90">
                        <Gift className="h-4 w-4" />
                        Thanks!
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Decorative floating sparkles */}
                {Array.from({ length: 6 }).map((_, i) => (
                  <motion.div
                    key={`spark-${i}`}
                    className="absolute text-gold"
                    style={{
                      left: `${10 + i * 16}%`,
                      top: `${-20 + (i % 2) * 6}%`,
                    }}
                    animate={{
                      y: [0, -16, 0],
                      opacity: [0.4, 1, 0.4],
                      scale: [0.8, 1.2, 0.8],
                    }}
                    transition={{
                      duration: 2 + i * 0.3,
                      repeat: Infinity,
                      ease: 'easeInOut',
                      delay: i * 0.2,
                    }}
                  >
                    ✨
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/** Inline Button-like component for the "Thanks!" action. */
function Button({ children, onClick, className }: { children: React.ReactNode; onClick?: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-bold transition-colors ${className || ''}`}
    >
      {children}
    </button>
  )
}

/**
 * Helper: returns true if this gift broadcast has been seen (in localStorage).
 */
export function isGiftSeen(broadcastId: string): boolean {
  if (typeof window === 'undefined') return false
  try {
    return localStorage.getItem(seenKey(broadcastId)) !== null
  } catch {
    return false
  }
}

/**
 * Find the first unseen, non-expired gift broadcast from a list.
 * Returns null if none.
 */
export function pickUnseenGiftBroadcast(broadcasts: GiftBroadcast[]): GiftBroadcast | null {
  const now = Date.now()
  for (const b of broadcasts) {
    if (!b.isGift) continue
    // Skip expired
    if (b.expiresAt && new Date(b.expiresAt).getTime() <= now) continue
    if (isGiftSeen(b.id)) continue
    return b
  }
  return null
}
