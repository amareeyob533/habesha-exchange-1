'use client'

import { Menu, Bell, LogOut, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/theme/theme-toggle'
import { useAuth } from '@/hooks/use-auth'
import { useUI } from '@/hooks/use-ui'
import { formatUsd } from '@/lib/format'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { PendingIcon } from '@/components/dashboard/pending-icon'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { motion } from 'framer-motion'

export function Topbar() {
  const { user, totalUsd, notifications, logout } = useAuth()
  const { setSidebarOpen, openNotif, setView } = useUI()
  const unread = notifications.filter((n) => !n.read).length
  const initials = (user?.name || user?.email || 'U').slice(0, 2).toUpperCase()

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border/40 glass-strong px-4 sm:px-6">
      <button className="lg:hidden" onClick={() => setSidebarOpen(true)} aria-label="Open menu">
        <Menu className="h-5 w-5" />
      </button>

      <div className="flex items-center gap-2">
        <div className="hidden text-xs text-muted-foreground sm:block">Total Balance</div>
        <motion.div
          key={totalUsd}
          initial={{ opacity: 0.5, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-lg font-extrabold tracking-tight tabular-nums"
        >
          <span className="text-foreground">{formatUsd(totalUsd)}</span>
        </motion.div>
      </div>

      <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
        <Button
          variant="outline"
          size="sm"
          className="hidden border-gold/40 text-gold hover:bg-gold/10 sm:inline-flex"
          onClick={() => useUI.getState().openDeposit('USDT')}
        >
          Deposit
        </Button>
        <Button
          size="sm"
          className="hidden bg-gold-gradient font-semibold text-primary-foreground hover:opacity-95 sm:inline-flex"
          onClick={() => useUI.getState().openBuy()}
        >
          Buy
        </Button>

        <PendingIcon />

        <button
          onClick={openNotif}
          className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-secondary/60 transition-colors hover:border-gold/60"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-down px-1 text-[9px] font-bold text-white">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </button>

        <ThemeToggle />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-full border border-border bg-secondary/60 py-1 pl-1 pr-2 transition-colors hover:border-gold/60">
              <Avatar className="h-7 w-7">
                <AvatarFallback className="bg-gold/15 text-[11px] font-bold text-gold">{initials}</AvatarFallback>
              </Avatar>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="text-xs">
              <div className="font-semibold text-foreground">{user?.name || 'User'}</div>
              <div className="text-muted-foreground">{user?.email}</div>
              <div className="mt-1 inline-flex items-center gap-1 rounded bg-gold/15 px-1.5 py-0.5 font-bold text-gold">
                UID {user?.uid}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setView('profile')}>Profile</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setView('settings')}>Settings</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setView('support')}>Support</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-down focus:text-down" onClick={logout}>
              <LogOut className="mr-2 h-4 w-4" /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
