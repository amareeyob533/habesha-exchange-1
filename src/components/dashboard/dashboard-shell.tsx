'use client'

import { useEffect } from 'react'
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
import { DepositModal } from '@/components/modals/deposit-modal'
import { WithdrawModal } from '@/components/modals/withdraw-modal'
import { BuyModal } from '@/components/modals/buy-modal'
import { SupportModal } from '@/components/modals/support-modal'
import { KycModal } from '@/components/modals/kyc-modal'
import { NotificationPanel } from '@/components/dashboard/notification-panel'
import { BottomNav } from '@/components/dashboard/bottom-nav'
import { PushPermissionBanner } from '@/components/dashboard/push-banner'
import { useUI } from '@/hooks/use-ui'
import { useAuth } from '@/hooks/use-auth'
import { motion, AnimatePresence } from 'framer-motion'
import { LogoMark } from '@/components/common/logo'

export function DashboardShell() {
  const { view, setView } = useUI()
  const { fetchMe, user } = useAuth()

  const isAdmin = user?.email?.toLowerCase() === (process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'amareeyob533@gmail.com').toLowerCase()

  // If admin, force to admin view (clean admin-only dashboard)
  useEffect(() => {
    if (isAdmin && view !== 'admin' && view !== 'support') {
      setView('admin')
    }
  }, [isAdmin, view, setView])

  // Periodic refresh — every 10s, only when tab is visible.
  // Faster refresh so KYC status changes (admin approve/reject) show up quickly.
  useEffect(() => {
    let id: ReturnType<typeof setInterval> | null = null
    const start = () => { if (!id) id = setInterval(() => fetchMe(), 10000) }
    const stop = () => { if (id) { clearInterval(id); id = null } }
    const onVis = () => { document.hidden ? stop() : start() }
    start()
    document.addEventListener('visibilitychange', onVis)
    return () => { stop(); document.removeEventListener('visibilitychange', onVis) }
  }, [fetchMe])

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
    </div>
  )
}
