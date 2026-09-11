'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Heart, Loader2, Sparkles } from 'lucide-react'
import { apiFetch } from '@/lib/api-client'

export interface NewYearBroadcast {
  id: string
  title: string
  message: string
  createdAt: string
  seen: boolean
  reaction: string | null
  reactionCount: number
}

interface NewYearPopupProps {
  broadcast: NewYearBroadcast | null
  onClose: () => void
}

const seenKey = (id: string) => `newyear-seen-${id}`

/**
 * Ethiopian New Year (Enkutatash 🌼) popup.
 *
 * Shows a beautiful Adey Abeba (yellow daisy) flower animation when the admin
 * sends a "New Year" broadcast. The flower blooms in with golden petals, then
 * a "Tap the flower" prompt appears. On click, the flower bursts into petals
 * and the Ethiopian New Year message is revealed in a festive gold panel.
 *
 * The Adey Abeba (አደይ አበባ) is the traditional flower of Ethiopian New Year —
 * it blooms in September right around Enkutatash.
 */
export function NewYearPopup({ broadcast, onClose }: NewYearPopupProps) {
  const [opened, setOpened] = useState(false)
  const [reacting, setReacting] = useState(false)
  const [reaction, setReaction] = useState<string | null>(null)
  const [reactionCount, setReactionCount] = useState(0)

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
    if (!broadcast.seen) {
      apiFetch('/api/broadcasts/seen', {
        method: 'POST',
        body: JSON.stringify({ broadcastId: broadcast.id }),
      }).catch(() => {})
    }
  }, [broadcast])

  // Generate flower petal particles for the bloom-burst on open.
  const petals = useMemo(
    () =>
      Array.from({ length: 24 }, (_, i) => {
        const angle = (i / 24) * Math.PI * 2 + Math.random() * 0.3
        const distance = 160 + Math.random() * 220
        const yellows = ['#FFD93D', '#FFC83D', '#F0B90B', '#FFE873', '#FFB347', '#FFFFFF']
        return {
          id: i,
          x: Math.cos(angle) * distance,
          y: Math.sin(angle) * distance + 80, // gravity pull
          color: yellows[i % yellows.length],
          size: 10 + Math.random() * 12,
          delay: Math.random() * 0.18,
          rotate: Math.random() * 720 - 360,
        }
      }),
    [opened, broadcast?.id],
  )

  async function handleOpen() {
    if (opened || !broadcast) return
    setOpened(true)
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
      setReactionCount((c) => (res.reacted ? Math.max(c, prevCount + 1) : Math.max(0, prevCount - 1)))
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
          className="fixed inset-0 z-[185] flex items-center justify-center overflow-hidden p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
        >
          {/* Festive dimmed backdrop with warm golden tint */}
          <motion.div
            className="absolute inset-0"
            style={{
              background: 'radial-gradient(circle at 50% 40%, rgba(240,185,11,0.18) 0%, rgba(0,0,0,0.82) 60%)',
              backdropFilter: 'blur(8px)',
            }}
            onClick={() => !opened && onClose()}
          />

          {/* Close (X) button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 z-50 flex h-10 w-10 items-center justify-center rounded-full bg-secondary/60 text-muted-foreground transition-colors hover:bg-secondary/80 hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Falling flower petals decoration (continuous ambient) */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            {Array.from({ length: 14 }).map((_, i) => (
              <motion.div
                key={`fall-${i}`}
                className="absolute text-2xl"
                style={{ left: `${(i * 7.5 + 5) % 100}%`, top: '-5%' }}
                animate={{
                  y: ['0vh', '110vh'],
                  x: [0, Math.sin(i) * 40, 0],
                  rotate: [0, 360],
                  opacity: [0, 0.8, 0.8, 0],
                }}
                transition={{
                  duration: 8 + (i % 4) * 2,
                  repeat: Infinity,
                  delay: i * 0.8,
                  ease: 'easeInOut',
                }}
              >
                🌼
              </motion.div>
            ))}
          </div>

          {/* Bloom-burst petals (only after opening) */}
          {opened && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              {petals.map((p) => (
                <motion.div
                  key={p.id}
                  className="absolute"
                  style={{ width: p.size, height: p.size }}
                  initial={{ x: 0, y: 0, scale: 0, opacity: 0, rotate: 0 }}
                  animate={{
                    x: [0, p.x * 0.5, p.x],
                    y: [0, p.y * 0.5, p.y],
                    scale: [0, 1.5, 0.6],
                    opacity: [0, 1, 0],
                    rotate: p.rotate,
                  }}
                  transition={{ duration: 1.8, delay: p.delay, ease: 'easeOut' }}
                >
                  {/* Daisy petal shape */}
                  <div
                    className="h-full w-full rounded-full"
                    style={{
                      background: `radial-gradient(circle, ${p.color} 0%, ${p.color}cc 60%, transparent 100%)`,
                      boxShadow: `0 0 12px ${p.color}99`,
                    }}
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
                exit={{ scale: 0.4, opacity: 0, transition: { duration: 0.3 } }}
                transition={{ type: 'spring', stiffness: 200, damping: 14 }}
              >
                {/* Warm golden halo behind the flower */}
                <motion.div
                  className="absolute -z-10 rounded-full"
                  style={{
                    width: 420,
                    height: 420,
                    background:
                      'radial-gradient(circle, rgba(240,185,11,0.5) 0%, rgba(255,213,61,0.2) 40%, transparent 70%)',
                  }}
                  animate={{ scale: [1, 1.18, 1], opacity: [0.6, 0.95, 0.6] }}
                  transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
                />

                {/* Orbiting sparkles around the flower */}
                <div className="absolute -z-10 h-80 w-80">
                  {Array.from({ length: 10 }).map((_, i) => {
                    const angle = (i / 10) * Math.PI * 2
                    const r = 145
                    return (
                      <motion.div
                        key={i}
                        className="absolute"
                        style={{ left: '50%', top: '50%' }}
                        animate={{
                          x: [Math.cos(angle) * r * 0.7, Math.cos(angle) * r, Math.cos(angle) * r * 0.7],
                          y: [Math.sin(angle) * r * 0.7, Math.sin(angle) * r, Math.sin(angle) * r * 0.7],
                          opacity: [0.3, 1, 0.3],
                          scale: [0.5, 1.1, 0.5],
                        }}
                        transition={{
                          duration: 2.6,
                          repeat: Infinity,
                          ease: 'easeInOut',
                          delay: i * 0.18,
                        }}
                      >
                        <Sparkles className="h-3 w-3 text-gold" style={{ filter: 'drop-shadow(0 0 6px rgba(240,185,11,0.9))' }} />
                      </motion.div>
                    )
                  })}
                </div>

                {/* The Adey Abeba flower (clickable) */}
                <motion.button
                  type="button"
                  onClick={handleOpen}
                  className="relative cursor-pointer select-none focus:outline-none"
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.92 }}
                  animate={{ y: [0, -14, 0], rotate: [0, 3, 0, -3, 0] }}
                  transition={{
                    y: { duration: 2.8, repeat: Infinity, ease: 'easeInOut' },
                    rotate: { duration: 6, repeat: Infinity, ease: 'easeInOut' },
                  }}
                >
                  {/* Big Adey Abeba (yellow daisy) emoji with golden glow */}
                  <span
                    className="block text-[130px] leading-none sm:text-[180px]"
                    style={{
                      filter:
                        'drop-shadow(0 10px 40px rgba(240,185,11,0.7)) drop-shadow(0 0 16px rgba(255,213,61,0.6))',
                    }}
                  >
                    🌼
                  </span>
                  {/* Pulsing glow overlay */}
                  <motion.div
                    className="absolute inset-0 rounded-full"
                    style={{ background: 'radial-gradient(circle, rgba(240,185,11,0.4) 0%, transparent 60%)' }}
                    animate={{ opacity: [0.4, 0.85, 0.4], scale: [0.9, 1.15, 0.9] }}
                    transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                  />
                </motion.button>

                {/* "Enkutatash" label */}
                <motion.div
                  className="mt-6 max-w-md px-4"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35 }}
                >
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-base">🌼</span>
                    <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-gold">
                      Enkutatash
                    </span>
                    <span className="text-base">🌼</span>
                  </div>
                  <h2 className="mt-2 bg-gradient-to-r from-gold via-yellow-300 to-gold bg-clip-text text-2xl font-extrabold text-transparent sm:text-3xl">
                    {broadcast.title}
                  </h2>
                </motion.div>

                {/* "Tap the flower" prompt */}
                <motion.div
                  className="mt-5"
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 1.7, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <span className="text-sm font-semibold text-muted-foreground">
                    Tap the flower to open your message 🌼
                  </span>
                </motion.div>
              </motion.div>
            ) : (
              <motion.div
                key="opened"
                className="relative w-full max-w-md"
                initial={{ scale: 0.7, opacity: 0, y: 30 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 200, damping: 18, delay: 0.2 }}
              >
                {/* Festive message card */}
                <div className="overflow-hidden rounded-3xl border border-gold/50 bg-card shadow-[0_8px_70px_rgba(240,185,11,0.45)]">
                  {/* Header with gold gradient */}
                  <div className="relative flex items-center gap-2 border-b border-gold/30 bg-gradient-to-r from-gold/25 via-gold/10 to-gold/25 px-5 py-4">
                    <motion.div
                      initial={{ rotate: -25, scale: 0.5 }}
                      animate={{ rotate: 0, scale: 1 }}
                      transition={{ type: 'spring', stiffness: 260, damping: 10, delay: 0.25 }}
                      className="text-2xl"
                    >
                      🌼
                    </motion.div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-gold">
                        Habesha Exchange
                      </div>
                      <div className="truncate text-base font-bold text-gold-gradient">
                        {broadcast.title}
                      </div>
                    </div>
                  </div>

                  {/* Body — the Ethiopian New Year message */}
                  <div className="space-y-3 p-6">
                    {/* Festive divider with flowers */}
                    <div className="flex items-center justify-center gap-2 text-gold">
                      <span>🌼</span>
                      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gold/40 to-transparent" />
                      <span>🌼</span>
                    </div>

                    <p className="whitespace-pre-wrap break-words text-center text-base leading-relaxed text-foreground">
                      {broadcast.message}
                    </p>

                    {/* Festive divider with flowers */}
                    <div className="flex items-center justify-center gap-2 text-gold">
                      <span>🌼</span>
                      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gold/40 to-transparent" />
                      <span>🌼</span>
                    </div>

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
                      <button
                        type="button"
                        onClick={onClose}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-gold px-4 py-2 text-sm font-bold text-black transition-colors hover:bg-gold/90"
                      >
                        <span className="text-base">🌼</span>
                        Thank you!
                      </button>
                    </div>
                  </div>
                </div>

                {/* Floating flower decorations around the opened card */}
                {Array.from({ length: 6 }).map((_, i) => (
                  <motion.div
                    key={`flower-${i}`}
                    className="absolute text-xl"
                    style={{ left: `${8 + i * 17}%`, top: `${-22 + (i % 2) * 8}%` }}
                    animate={{
                      y: [0, -18, 0],
                      opacity: [0.4, 1, 0.4],
                      scale: [0.7, 1.2, 0.7],
                      rotate: [0, 15, -15, 0],
                    }}
                    transition={{
                      duration: 2.4 + i * 0.3,
                      repeat: Infinity,
                      ease: 'easeInOut',
                      delay: i * 0.22,
                    }}
                  >
                    🌼
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

/** Returns true if this New Year broadcast has been seen (in localStorage). */
export function isNewYearSeen(broadcastId: string): boolean {
  if (typeof window === 'undefined') return false
  try {
    return localStorage.getItem(seenKey(broadcastId)) !== null
  } catch {
    return false
  }
}

/**
 * Find the first unseen New Year broadcast from a list.
 * A New Year broadcast is detected by its title containing "New Year" or
 * "Enkutatash" or "ዓመት" (case-insensitive), OR by the message containing
 * the Adey Abeba flower emoji 🌼.
 */
export function pickUnseenNewYearBroadcast(broadcasts: NewYearBroadcast[]): NewYearBroadcast | null {
  const NEW_YEAR_RE = /new year|enkutatash|ዓመት|ማዕለ|መለወጫ/i
  for (const b of broadcasts) {
    const isNY =
      NEW_YEAR_RE.test(b.title) ||
      NEW_YEAR_RE.test(b.message) ||
      b.message.includes('🌼')
    if (!isNY) continue
    if (isNewYearSeen(b.id)) continue
    return b
  }
  return null
}
