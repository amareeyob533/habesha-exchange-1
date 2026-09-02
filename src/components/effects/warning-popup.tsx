'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useState } from 'react'
import { apiFetch } from '@/lib/api-client'
import { Button } from '@/components/ui/button'

interface WarningData {
  id: string
  title: string
  message: string
}

const SEEN_KEY = 'habesha-warning-seen'

/**
 * Warning popup — shows when admin sends a per-user warning.
 * Full-screen ⚠️ popup with bounce animation, similar to the gift box but
 * with a warning emoji instead. Shows once per warning (tracked in localStorage).
 */
export function WarningPopup() {
  const [warning, setWarning] = useState<WarningData | null>(null)
  const [showMessage, setShowMessage] = useState(false)

  useEffect(() => {
    // Check for unread warning_popup notifications
    const checkWarnings = async () => {
      try {
        // Fetch notifications and look for warning_popup type
        const data = await apiFetch<{ notifications: any[] }>('/api/notifications')
        const warningNotif = data.notifications?.find((n: any) => n.type === 'warning_popup' && !n.read)
        if (warningNotif) {
          // Check if already seen this session
          const seenIds: string[] = JSON.parse(localStorage.getItem(SEEN_KEY) || '[]')
          if (!seenIds.includes(warningNotif.id)) {
            setWarning({
              id: warningNotif.id,
              title: warningNotif.title.replace(/^⚠️\s*/, ''),
              message: warningNotif.message,
            })
          }
        }
      } catch {}
    }

    // Check on mount
    checkWarnings()
    // Check every 10 seconds
    const id = setInterval(checkWarnings, 10000)
    return () => clearInterval(id)
  }, [])

  function dismiss() {
    if (warning) {
      const seenIds: string[] = JSON.parse(localStorage.getItem(SEEN_KEY) || '[]')
      seenIds.push(warning.id)
      localStorage.setItem(SEEN_KEY, JSON.stringify(seenIds))
    }
    setWarning(null)
    setShowMessage(false)
  }

  return (
    <AnimatePresence>
      {warning && (
        <motion.div
          className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={showMessage ? dismiss : undefined}
        >
          {/* Background glow */}
          <motion.div
            className="absolute rounded-full"
            style={{
              width: 300,
              height: 300,
              background: 'radial-gradient(circle, rgba(255, 77, 109, 0.3), transparent 70%)',
            }}
            animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0.8, 0.5] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          />

          {!showMessage ? (
            <>
              {/* Warning emoji */}
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 200, damping: 12 }}
                className="relative"
              >
                <motion.div
                  animate={{ y: [0, -15, 0], rotate: [-5, 5, -5] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                  className="text-7xl"
                >
                  ⚠️
                </motion.div>
              </motion.div>

              {/* Title */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="mt-6 text-center"
              >
                <div className="text-xl font-extrabold text-down">{warning.title}</div>
                <div className="mt-2 text-sm text-muted-foreground">Tap to read</div>
              </motion.div>

              {/* Tap to open */}
              <Button
                variant="outline"
                className="mt-5 border-down/40 text-down hover:bg-down/10"
                onClick={() => setShowMessage(true)}
              >
                Read Message
              </Button>
            </>
          ) : (
            /* Message panel */
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="relative mx-4 max-w-md rounded-2xl border border-down/30 bg-card p-6 shadow-premium"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-3 flex items-center gap-2">
                <span className="text-3xl">⚠️</span>
                <h3 className="text-lg font-bold text-down">{warning.title}</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{warning.message}</p>
              <Button className="mt-5 w-full bg-down/90 text-white hover:bg-down" onClick={dismiss}>
                I Understand
              </Button>
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
