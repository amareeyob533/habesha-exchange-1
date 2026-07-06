'use client'

import { useState, useEffect } from 'react'
import { usePushNotifications } from '@/hooks/use-push-notifications'
import { Button } from '@/components/ui/button'
import { Bell, X, Loader2, CheckCircle2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

const DISMISS_KEY = 'habesha-push-dismissed'

/**
 * Push notification permission banner.
 * Shows a small dismissible banner at the bottom of the dashboard asking the
 * user to enable push notifications. Once granted (or permanently dismissed),
 * the banner disappears.
 */
export function PushPermissionBanner() {
  const { permission, loading, subscribe } = usePushNotifications()
  const [dismissed, setDismissed] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    try {
      // One-shot hydration of the dismiss flag from localStorage. The
      // set-state-in-effect rule is intentionally disabled here because this
      // is the canonical "read browser-only storage on mount" pattern and the
      // value cannot be known during SSR.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDismissed(localStorage.getItem(DISMISS_KEY) === '1')
    } catch {
      // ignore
    }
  }, [])

  // Don't show: unsupported browsers, already granted/denied, or dismissed.
  if (permission === 'unsupported') return null
  if (permission === 'granted') return null
  if (permission === 'denied') return null
  if (dismissed) return null
  if (done) return null

  function dismiss() {
    try { localStorage.setItem(DISMISS_KEY, '1') } catch {}
    setDismissed(true)
  }

  async function handleEnable() {
    const ok = await subscribe()
    if (ok) {
      setDone(true)
      setTimeout(() => setDismissed(true), 2500)
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
        <div className="glass-strong border border-primary/30 rounded-2xl p-4 shadow-premium">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
              {done ? <CheckCircle2 className="h-5 w-5" /> : <Bell className="h-5 w-5" />}
            </div>
            <div className="flex-1">
              <div className="text-sm font-bold">
                {done ? 'Notifications enabled!' : 'Enable push notifications'}
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {done
                  ? "You'll now receive notifications on your phone when your deposit, withdrawal, or buy order is approved."
                  : 'Get notified on your phone when your deposit, withdrawal, or buy order is approved — even when the app is closed.'}
              </p>
              <div className="mt-3 flex gap-2">
                {!done && (
                  <Button size="sm" className="h-8 bg-primary font-semibold text-primary-foreground" disabled={loading} onClick={handleEnable}>
                    {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Bell className="h-3.5 w-3.5" />}
                    Enable
                  </Button>
                )}
                {!done && (
                  <Button size="sm" variant="outline" className="h-8" onClick={dismiss}>
                    Not now
                  </Button>
                )}
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
