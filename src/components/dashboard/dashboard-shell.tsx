'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { Sidebar } from '@/components/dashboard/sidebar'
import { Topbar } from '@/components/dashboard/topbar'
import { OverviewView } from '@/components/dashboard/views/overview'
import { WalletView } from '@/components/dashboard/views/wallet'
import { MarketsView } from '@/components/dashboard/views/markets'
import { ExchangeView } from '@/components/dashboard/views/exchange'
import { TransactionsView } from '@/components/dashboard/views/transactions'
import { SupportView } from '@/components/dashboard/views/support-view'
import { ProfileView } from '@/components/dashboard/views/profile'
import { SettingsView } from '@/components/dashboard/views/settings'
import { AdminView } from '@/components/dashboard/views/admin'
import { CardView } from '@/components/dashboard/views/card'
import { DepositModal } from '@/components/modals/deposit-modal'
import { WithdrawModal } from '@/components/modals/withdraw-modal'
import { BuyModal } from '@/components/modals/buy-modal'
import { SupportModal } from '@/components/modals/support-modal'
import { KycModal } from '@/components/modals/kyc-modal'
import { NotificationPanel } from '@/components/dashboard/notification-panel'
import { BottomNav } from '@/components/dashboard/bottom-nav'
import { PushPermissionBanner } from '@/components/dashboard/push-banner'
import { GiftBoxPopup, pickUnseenGiftBroadcast, type GiftBroadcast } from '@/components/effects/gift-box-popup'
import { NewYearPopup, pickUnseenNewYearBroadcast, type NewYearBroadcast } from '@/components/effects/new-year-popup'
import { WarningPopup } from '@/components/effects/warning-popup'
import { useUI } from '@/hooks/use-ui'
import { useAuth } from '@/hooks/use-auth'
import { apiFetch, getStoredToken } from '@/lib/api-client'
import { motion, AnimatePresence } from 'framer-motion'
import { LogoMark } from '@/components/common/logo'

export function DashboardShell() {
  const { view, setView } = useUI()
  const { fetchMe, user } = useAuth()
  const [giftBroadcast, setGiftBroadcast] = useState<GiftBroadcast | null>(null)
  const [newYearBroadcast, setNewYearBroadcast] = useState<NewYearBroadcast | null>(null)
  // Ensures we only call the New Year auto-seed route once per session.
  const newYearSeededRef = useRef(false)

  const isAdmin = user?.email?.toLowerCase() === (process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'amareeyob533@gmail.com').toLowerCase()

  // If admin, force to admin view (clean admin-only dashboard)
  useEffect(() => {
    if (isAdmin && view !== 'admin' && view !== 'support') {
      setView('admin')
    }
  }, [isAdmin, view, setView])

  // Periodic refresh — every 5s, only when tab is visible.
  // Fast refresh so notifications (deposit approved, KYC status change) show up quickly.
  useEffect(() => {
    let id: ReturnType<typeof setInterval> | null = null
    const start = () => { if (!id) id = setInterval(() => fetchMe(), 3000) }
    const stop = () => { if (id) { clearInterval(id); id = null } }
    const onVis = () => { document.hidden ? stop() : start() }
    start()
    document.addEventListener('visibilitychange', onVis)
    return () => { stop(); document.removeEventListener('visibilitychange', onVis) }
  }, [fetchMe])

  // Check for unseen gift + New Year broadcasts (only for non-admin users,
  // since admins don't want to receive their own popups).
  const checkGiftBroadcasts = useCallback(async () => {
    if (isAdmin) return
    if (!getStoredToken()) return
    // Don't re-check if either popup is already showing.
    if (giftBroadcast || newYearBroadcast) return
    try {
      // One-time auto-seed: ensure the New Year broadcast exists in the DB.
      // This is what makes the popup work on production without the admin
      // having to manually send the broadcast. Idempotent — only creates
      // the broadcast if it doesn't already exist. Called once per session.
      if (!newYearSeededRef.current) {
        newYearSeededRef.current = true
        try {
          await apiFetch('/api/broadcasts/new-year', { method: 'POST' })
        } catch {
          // soft fail — the broadcast check below still works
        }
      }
      const data = await apiFetch<{ broadcasts: (GiftBroadcast & NewYearBroadcast)[] }>('/api/broadcasts')
      const list = data.broadcasts || []
      // New Year popup takes priority (festive occasion).
      if (!newYearBroadcast) {
        const unseenNY = pickUnseenNewYearBroadcast(list)
        if (unseenNY) {
          setNewYearBroadcast(unseenNY)
          return
        }
      }
      if (!giftBroadcast) {
        const unseenGift = pickUnseenGiftBroadcast(list)
        if (unseenGift) {
          setGiftBroadcast(unseenGift)
        }
      }
    } catch {
      // soft fail
    }
  }, [isAdmin, giftBroadcast, newYearBroadcast])

  // Check on mount + every 15s for new gift broadcasts.
  // Initial check is deferred to a microtask so we don't trigger a cascading
  // render in the effect body (react-hooks/set-state-in-effect).
  useEffect(() => {
    const t = setTimeout(() => { checkGiftBroadcasts() }, 0)
    let id: ReturnType<typeof setInterval> | null = null
    const start = () => { if (!id) id = setInterval(() => checkGiftBroadcasts(), 15000) }
    const stop = () => { if (id) { clearInterval(id); id = null } }
    const onVis = () => { document.hidden ? stop() : start() }
    start()
    document.addEventListener('visibilitychange', onVis)
    return () => { clearTimeout(t); stop(); document.removeEventListener('visibilitychange', onVis) }
  }, [checkGiftBroadcasts])

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="lg:pl-64">
        <Topbar />
        <main className="mx-auto max-w-7xl px-4 py-6 pb-24 sm:px-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={view}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            >
              {view === 'overview' && <OverviewView />}
              {view === 'wallet' && <WalletView />}
              {view === 'markets' && <MarketsView />}
              {view === 'exchange' && <ExchangeView />}
              {view === 'transactions' && <TransactionsView />}
              {view === 'support' && <SupportView />}
              {view === 'profile' && <ProfileView />}
              {view === 'settings' && <SettingsView />}
              {view === 'admin' && <AdminView />}
              {view === 'card' && <CardView />}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Footer */}
      <footer className="border-t border-border/40 glass-strong pb-20 lg:pl-64 lg:pb-0">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-2 px-4 py-5 sm:flex-row sm:justify-between sm:px-6">
          <div className="flex items-center gap-2">
            <LogoMark className="h-6 w-6 rounded" />
            <span className="text-xs text-muted-foreground">© {new Date().getFullYear()} Habesha Exchange · All rights reserved</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <a href="#" className="hover:text-foreground">Terms</a>
            <a href="#" className="hover:text-foreground">Privacy</a>
            <button onClick={() => useUI.getState().setView('support')} className="hover:text-foreground">Support</button>
          </div>
        </div>
      </footer>

      {/* Mobile bottom navigation (icons) */}
      <BottomNav />

      {/* Modals */}
      <DepositModal />
      <WithdrawModal />
      <BuyModal />
      <SupportModal />
      <KycModal />
      <NotificationPanel />
      <PushPermissionBanner />

      {/* Gift box popup — shows when an unseen gift broadcast is available */}
      <GiftBoxPopup broadcast={giftBroadcast} onClose={() => setGiftBroadcast(null)} />
      {/* Ethiopian New Year popup — shows when an unseen New Year broadcast is available */}
      <NewYearPopup broadcast={newYearBroadcast} onClose={() => setNewYearBroadcast(null)} />
      <WarningPopup />
    </div>
  )
}
