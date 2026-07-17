'use client'

import { motion } from 'framer-motion'
import { LogoWord } from '@/components/common/logo'
import { useUI, type ViewKey } from '@/hooks/use-ui'
import { useAuth } from '@/hooks/use-auth'
import { cn } from '@/lib/utils'
import { LayoutDashboard, LineChart, Wallet, ArrowLeftRight, Receipt, LifeBuoy, User, Settings, X, ShieldAlert } from 'lucide-react'

const NAV: { key: ViewKey; label: string; icon: any }[] = [
  { key: 'overview', label: 'Overview', icon: LayoutDashboard },
  { key: 'markets', label: 'Markets', icon: LineChart },
  { key: 'wallet', label: 'Wallet', icon: Wallet },
  { key: 'exchange', label: 'Exchange', icon: ArrowLeftRight },
  { key: 'transactions', label: 'Transactions', icon: Receipt },
  { key: 'support', label: 'Support', icon: LifeBuoy },
  { key: 'profile', label: 'Profile', icon: User },
  { key: 'settings', label: 'Settings', icon: Settings },
]

const ADMIN_NAV = { key: 'admin' as ViewKey, label: 'Admin · Approvals', icon: ShieldAlert }

export function Sidebar() {
  const { view, setView, sidebarOpen, setSidebarOpen } = useUI()
  const { user } = useAuth()
  const isAdmin = user?.email?.toLowerCase() === (process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'amareeyob533@gmail.com').toLowerCase()
  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-background/70 backdrop-blur-sm lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-border/40 glass-strong transition-transform duration-300 lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-16 items-center justify-between px-5">
          <LogoWord />
          <button className="text-muted-foreground lg:hidden" onClick={() => setSidebarOpen(false)}>
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-4">
          {/* Admin users only see admin + support nav */}
          {(isAdmin ? [] : NAV).map((item) => {
            const active = view === item.key
            return (
              <button
                key={item.key}
                onClick={() => setView(item.key)}
                className={cn(
                  'group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                  active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60',
                )}
              >
                {active && (
                  <motion.div
                    layoutId="sidebar-active"
                    className="absolute inset-0 rounded-xl border border-primary/30 bg-primary/10"
                    transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                  />
                )}
                <item.icon className={cn('relative h-[18px] w-[18px]', active && 'text-primary')} />
                <span className="relative">{item.label}</span>
              </button>
            )
          })}
          {isAdmin && (
            <>
              <div className="my-2 border-t border-border/60" />
              <div className="px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-wider text-primary">Admin Tools</div>
              <AdminNavItem item={ADMIN_NAV} active={view === ADMIN_NAV.key} onClick={() => setView(ADMIN_NAV.key)} />
              <AdminNavItem item={{ key: 'support' as ViewKey, label: 'Support Chat', icon: LifeBuoy }} active={view === 'support'} onClick={() => setView('support')} />
            </>
          )}
        </nav>
        <div className="border-t border-border p-4">
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground">
            <div className="font-semibold text-primary">Need help?</div>
            <p className="mt-1">Contact our 24/7 support team anytime.</p>
            <button onClick={() => setView('support')} className="mt-2 font-semibold text-primary hover:underline">
              Open support →
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}

function AdminNavItem({ item, active, onClick }: { item: { key: ViewKey; label: string; icon: any }; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
        active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60',
      )}
    >
      {active && (
        <motion.div
          layoutId="sidebar-active"
          className="absolute inset-0 rounded-xl border border-primary/40 bg-primary/10"
          transition={{ type: 'spring', stiffness: 400, damping: 32 }}
        />
      )}
      <item.icon className={cn('relative h-[18px] w-[18px]', active ? 'text-primary' : 'text-primary/70')} />
      <span className="relative">{item.label}</span>
    </button>
  )
}
