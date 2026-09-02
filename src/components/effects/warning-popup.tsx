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
 * Full-screen ⚠️ popup with bounce animation. The title appears below
 * the warning emoji. When clicked, shows the full message in a panel.
 * Shows once per warning (tracked in localStorage).
 */
export function WarningPopup() {
  const [warning, setWarning] = useState<WarningData | null>(null)
  const [showMessage, setShowMessage] = useState(false)

  useEffect(() => {
    const checkWarnings = async () => {
      try {
        // Fetch user data which includes notifications
        const data = await apiFetch<{ notifications: any[] }>('/api/notifications')
        const notifs = data.notifications || []
        // Find unread warning_popup notifications
        const warningNotif = notifs.find((n: any) => n.type === 'warning_popup' && !n.read)
        if (warningNotif) {
          // Check if already seen this session
          let seenIds: string[] = []
          try {
            seenIds = JSON.parse(localStorage.getItem(SEEN_KEY) || '[]')
          } catch {}
          if (!seenIds.includes(warningNotif.id)) {
            // Use setTimeout to avoid setState-in-effect lint
            setTimeout(() => {
              setWarning({
                id: warningNotif.id,
                title: warningNotif.title.replace(/^⚠️\s*/, ''),
                message: warningNotif.message,
              })
            }, 0)
          }
        }
      } catch {
        // ignore fetch errors
      }
    }

    // Check on mount
    checkWarnings()
    // Check every 10 seconds
    const id = setInterval(checkWarnings, 10000)
    return () => clearInterval(id)
  }, [])

  function dismiss() {
    if (warning) {
      let seenIds: string[] = []
      try {
        seenIds = JSON.parse(localStorage.getItem(SEEN_KEY) || '[]')
      } catch {}
      seenIds.push(warning.id)
      try {
        localStorage.setItem(SEEN_KEY, JSON.stringify(seenIds))
      } catch {}
    }
    setWarning(null)
    setShowMessage(false)
  }

  return (
    <AnimatePresence>
      {warning && (
        <motion.div
          className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-black/85 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Pulsing red glow */}
          <motion.div
            className="absolute rounded-full"
            style={{
              width: 350,
              height: 350,
              background: 'radial-gradient(circle, rgba(255, 77, 109, 0.35), transparent 70%)',
            }}
            animate={{ scale: [1, 1.3, 1], opacity: [0.4, 0.8, 0.4] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          />

          {!showMessage ? (
            <>
              {/* Warning emoji with bounce + rotate */}
              <motion.div
                initial={{ scale: 0, rotate: -180, y: -100 }}
                animate={{ scale: 1, rotate: 0, y: 0 }}
                transition={{ type: 'spring', stiffness: 200, damping: 12, delay: 0.1 }}
                className="relative cursor-pointer"
                onClick={() => setShowMessage(true)}
              >
                <motion.div
                  animate={{ y: [0, -15, 0], rotate: [-5, 5, -5] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                  className="text-8xl drop-shadow-[0_0_30px_rgba(255,77,109,0.5)]"
                >
                  ⚠️
                </motion.div>
              </motion.div>

              {/* Warning title */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="mt-6 max-w-xs text-center"
              >
                <div className="text-xl font-extrabold text-down">{warning.title}</div>
              </motion.div>

              {/* Tap to read */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
              >
                <Button
                  variant="outline"
                  className="mt-5 border-down/40 text-down hover:bg-down/10"
                  onClick={() => setShowMessage(true)}
                >
                  Read Message
                </Button>
              </motion.div>
            </>
          ) : (
            /* Full message panel — like the gift box */
            <motion.div
              initial={{ scale: 0.8, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 20 }}
              className="relative mx-4 max-w-md rounded-2xl border border-down/30 bg-card p-6 shadow-premium"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="mb-4 flex items-center gap-3 border-b border-border pb-3">
                <span className="text-4xl">⚠️</span>
                <div>
                  <h3 className="text-lg font-bold text-down">{warning.title}</h3>
                  <p className="text-[11px] text-muted-foreground">Warning from Admin</p>
                </div>
              </div>

              {/* Full message text */}
              <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{warning.message}</p>

              {/* Dismiss button */}
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
