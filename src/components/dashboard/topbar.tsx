'use client'

import { useState } from 'react'
import { Menu, Bell, LogOut, ChevronDown, ShieldAlert, ShieldCheck, Clock, AlertCircle, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/theme/theme-toggle'
import { useAuth } from '@/hooks/use-auth'
import { useUI } from '@/hooks/use-ui'
import { formatUsd } from '@/lib/format'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
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
  const { setSidebarOpen, openNotif, setView, openKyc } = useUI()
  const unread = notifications.filter((n) => !n.read).length
  const initials = (user?.name || user?.email || 'U').slice(0, 2).toUpperCase()
  const isAdmin = user?.email?.toLowerCase() === (process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'amareeyob533@gmail.com').toLowerCase()
  const [balanceHidden, setBalanceHidden] = useState(false)

  // KYC status for the reminder banner (only for non-admin users).
  const kycStatus = user?.kycStatus || 'none'
  const showKycBanner = !isAdmin && kycStatus !== 'approved'

  return (
    <header className="sticky top-0 z-30 glass-strong border-b border-border/40">
      <div className="flex min-h-[72px] items-center gap-3 px-4 sm:px-6">
        <button className="lg:hidden" onClick={() => setSidebarOpen(true)} aria-label="Open menu">
          <Menu className="h-5 w-5" />
        </button>

        {/* Admin sees "Admin Panel" label, users see their balance */}
        <div className="flex items-center gap-2">
          {isAdmin ? (
            <div className="flex items-center gap-2 text-sm font-bold text-primary">
              <ShieldAlert className="h-4 w-4" /> Admin Panel
            </div>
          ) : (
            <>
              <div className="hidden flex-col leading-none sm:flex">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Total Balance</span>
              </div>
              <motion.div
                key={`${totalUsd}-${balanceHidden}`}
                initial={{ opacity: 0.5, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-2xl font-extrabold tracking-tight tabular-nums sm:text-3xl"
              >
                <span className="text-foreground">
                  {balanceHidden ? '••••••' : formatUsd(totalUsd)}
                </span>
              </motion.div>
              <button
                onClick={() => setBalanceHidden((v) => !v)}
                aria-label={balanceHidden ? 'Show balance' : 'Hide balance'}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground"
              >
                {balanceHidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </>
          )}
        </div>

        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
          {!isAdmin && (
            <Button
              variant="outline"
              size="sm"
              className="hidden border-primary/40 text-primary hover:bg-primary/10 sm:inline-flex"
              onClick={() => useUI.getState().openDeposit('USDT')}
            >
              Deposit
            </Button>
          )}
          {!isAdmin && (
            <Button
              size="sm"
              className="hidden bg-emerald-gradient font-semibold text-primary-foreground hover:opacity-95 sm:inline-flex"
              onClick={() => useUI.getState().openBuy()}
            >
              Buy
            </Button>
          )}

          <GlowingNotifBell unread={unread} onClick={openNotif} notifications={notifications} />

          <ThemeToggle />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 rounded-full border border-border bg-secondary/60 py-1 pl-1 pr-2 transition-colors hover:border-primary/60">
                <Avatar className="h-7 w-7">
                  <AvatarFallback className="bg-primary/15 text-[11px] font-bold text-primary">{initials}</AvatarFallback>
                </Avatar>
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="text-xs">
                <div className="font-semibold text-foreground">{user?.name || 'User'}</div>
                <div className="text-muted-foreground">{user?.email}</div>
                <div className="mt-1 inline-flex items-center gap-1 rounded bg-primary/15 px-1.5 py-0.5 font-bold text-primary">
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
      </div>

      {/* KYC reminder banner — sits above the balance bar for non-admin users */}
      {showKycBanner && (
        <button
          onClick={openKyc}
          className="flex w-full items-center gap-2 border-t border-border/40 bg-primary/5 px-4 py-1.5 text-left text-xs transition-colors hover:bg-primary/10 sm:px-6"
        >
          {kycStatus === 'pending' ? (
            <>
              <Clock className="h-3.5 w-3.5 shrink-0 text-primary" />
              <span className="font-semibold text-primary">Under Review</span>
              <span className="truncate text-muted-foreground">Your KYC is being reviewed. We'll notify you once the admin approves or rejects it.</span>
            </>
          ) : kycStatus === 'rejected' ? (
            <>
              <AlertCircle className="h-3.5 w-3.5 shrink-0 text-down" />
              <span className="font-semibold text-down">KYC Rejected</span>
              <span className="truncate text-muted-foreground">Tap to re-submit your verification and unlock unlimited deposits.</span>
            </>
          ) : (
            <>
              <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-primary" />
              <span className="font-semibold text-primary">Verify your identity (KYC)</span>
              <span className="truncate text-muted-foreground">Deposits are capped at $500 without verification. Tap to verify & unlock unlimited.</span>
            </>
          )}
          <span className="ml-auto hidden shrink-0 font-semibold text-primary sm:inline">→</span>
        </button>
      )}
    </header>
  )
}

interface NotifItem {
  id: string
  title: string
  message: string
  type: string // info | success | warning
  read: boolean
  createdAt: string
}

/**
 * Notification bell that glows based on the most urgent unread notification:
 * - Yellow glow: pending/submitted messages (type: info)
 * - Green glow: approved/reward/support messages (type: success)
 * - Red glow: rejected/negative messages (type: warning)
 */
function GlowingNotifBell({ unread, onClick, notifications }: { unread: number; onClick: () => void; notifications: NotifItem[] }) {
  // Determine glow color from unread notifications
  const unreadNotifs = notifications.filter((n) => !n.read)
  let glowColor: string | null = null
  if (unreadNotifs.length > 0) {
    // Priority: warning (red) > success (green) > info (yellow)
    if (unreadNotifs.some((n) => n.type === 'warning')) glowColor = '#FF4D6D' // red
    else if (unreadNotifs.some((n) => n.type === 'success')) glowColor = '#00E08F' // emerald
    else glowColor = '#FFC83D' // brand gold (info/pending)
  }

  return (
    <button
      onClick={onClick}
      className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-secondary/60 transition-colors hover:border-primary/60"
      aria-label="Notifications"
    >
      {/* Glowing ring */}
      {glowColor && (
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{
            background: glowColor,
            padding: '2px',
            WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
            WebkitMaskComposite: 'xor',
            maskComposite: 'exclude',
          }}
          animate={{ opacity: [0.4, 1, 0.4], boxShadow: [`0 0 6px ${glowColor}40`, `0 0 16px ${glowColor}80`, `0 0 6px ${glowColor}40`] }}
          transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
        />
      )}

      <Bell className="relative h-4 w-4" style={glowColor ? { color: glowColor } : undefined} />

      {/* Unread count badge */}
      {unread > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-down px-1 text-[9px] font-bold text-white">
          {unread > 9 ? '9+' : unread}
        </span>
      )}
    </button>
  )
}
