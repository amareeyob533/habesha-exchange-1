'use client'

import { useUI, type ViewKey } from '@/hooks/use-ui'
import { cn } from '@/lib/utils'
import { LayoutDashboard, LineChart, ArrowLeftRight, Wallet } from 'lucide-react'
import { motion } from 'framer-motion'

const ITEMS: { key: ViewKey; icon: any; label: string }[] = [
  { key: 'overview', icon: LayoutDashboard, label: 'Home' },
  { key: 'markets', icon: LineChart, label: 'Markets' },
  { key: 'exchange', icon: ArrowLeftRight, label: 'Trade' },
  { key: 'wallet', icon: Wallet, label: 'Wallet' },
]

/**
 * Mobile bottom navigation bar (icon-only), like Binance's mobile app.
 * Visible on screens below lg (where the sidebar takes over on desktop).
 */
export function BottomNav() {
  const { view, setView } = useUI()

  return (
    <nav
      aria-label="Quick navigation"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur-xl lg:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="mx-auto flex max-w-md items-stretch justify-around">
        {ITEMS.map((item) => {
          const active = view === item.key
          const Icon = item.icon
          return (
            <button
              key={item.key}
              onClick={() => setView(item.key)}
              aria-label={item.label}
              aria-current={active ? 'page' : undefined}
              className="relative flex flex-1 flex-col items-center justify-center gap-1 py-2.5"
            >
              {/* Active indicator pill behind icon */}
              {active && (
                <motion.div
                  layoutId="bottomnav-active"
                  className="absolute top-1.5 h-9 w-12 rounded-2xl bg-gold/15"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <Icon
                className={cn(
                  'relative h-[22px] w-[22px] transition-colors',
                  active ? 'text-gold' : 'text-muted-foreground',
                )}
                strokeWidth={active ? 2.4 : 2}
              />
              {/* Small dot indicator under active icon */}
              {active && (
                <motion.span
                  layoutId="bottomnav-dot"
                  className="relative h-1 w-1 rounded-full bg-gold"
                />
              )}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
