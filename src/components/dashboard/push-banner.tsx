'use client'

import { useState, useEffect } from 'react'
import { usePushNotifications } from '@/hooks/use-push-notifications'
import { Button } from '@/components/ui/button'
import { Bell, X, Loader2, CheckCircle2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

/**
 * Push notification permission banner.
 * Shows EVERY TIME a user opens the dashboard if they haven't enabled
 * push notifications yet. Cannot be permanently dismissed — only hidden
 * for the current session.
 */
export function PushPermissionBanner() {
  const { permission, loading, subscribe } = usePushNotifications()
  const [sessionDismissed, setSessionDismissed] = useState(false)
  const [done, setDone] = useState(false)

  // Auto-request permission after 5 seconds (shows native browser prompt)
  useEffect(() => {
    if (permission === 'default' && !sessionDismissed && !done) {
      const timer = setTimeout(() => {
        Notification.requestPermission().then((perm) => {
          if (perm === 'granted') {
            // If user grants via auto-prompt, try to subscribe
            subscribe()
          }
        })
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [permission, sessionDismissed, done, subscribe])

  // Don't show: unsupported browsers, already granted
  if (permission === 'unsupported') return null
  if (permission === 'granted') return null
  if (permission === 'denied') return null
  if (sessionDismissed) return null
  if (done) return null

  function dismiss() {
    setSessionDismissed(true)
  }

  async function handleEnable() {
    const ok = await subscribe()
    if (ok) {
      setDone(true)
      setTimeout(() => setSessionDismissed(true), 2500)
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="fixed bottom-20 left-1/2 z-40 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 lg:bottom-6"
      >
        <div className="glass-strong border border-gold/30 rounded-2xl p-4 shadow-premium">
          <div className="flex items-start gap-3">
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold/10 text-gold ring-1 ring-gold/20"
            >
              <Bell className="h-5 w-5" />
            </motion.div>
            <div className="flex-1">
              <div className="text-sm font-bold">
                Enable Push Notifications
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Get instant alerts on your phone when your deposit, withdrawal, or buy order is approved — even when the app is closed.
              </p>
              <div className="mt-3 flex gap-2">
                <Button size="sm" className="h-8 bg-gold-gradient font-semibold text-primary-foreground" disabled={loading} onClick={handleEnable}>
                  {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Bell className="h-3.5 w-3.5" />}
                  Enable Notifications
                </Button>
                <Button size="sm" variant="outline" className="h-8" onClick={dismiss}>
                  Not now
                </Button>
              </div>
            </div>
            <button onClick={dismiss} className="text-muted-foreground hover:text-foreground" aria-label="Dismiss">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
