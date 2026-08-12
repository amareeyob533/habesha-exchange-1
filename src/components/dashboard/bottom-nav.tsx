'use client'

import { useUI, type ViewKey } from '@/hooks/use-ui'
import { cn } from '@/lib/utils'
import { LayoutDashboard, LineChart, ArrowLeftRight, Wallet } from 'lucide-react'
import { motion } from 'framer-motion'

const ITEMS: { key: ViewKey; icon: any; label: string; color: string }[] = [
  { key: 'overview', icon: LayoutDashboard, label: 'Home', color: '#00D4FF' },
  { key: 'markets', icon: LineChart, label: 'Markets', color: '#00D4FF' },
  { key: 'exchange', icon: ArrowLeftRight, label: 'Trade', color: '#00D4FF' },
  { key: 'wallet', icon: Wallet, label: 'Wallet', color: '#00D4FF' },
]

/**
 * Floating glass bottom navigation.
 * A floating glass panel with soft glow on the active icon.
 */
export function BottomNav() {
  const { view, setView } = useUI()

  return (
    <nav
      aria-label="Quick navigation"
      className="fixed inset-x-0 bottom-0 z-40 lg:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="mx-auto max-w-md px-4 pb-3">
        <div className="flex items-center justify-around rounded-2xl glass-strong px-2 py-2 shadow-premium">
          {ITEMS.map((item) => {
            const active = view === item.key
            const Icon = item.icon
            return (
              <button
                key={item.key}
                onClick={() => setView(item.key)}
                aria-label={item.label}
                aria-current={active ? 'page' : undefined}
                className="relative flex flex-col items-center justify-center gap-1"
              >
                {/* Soft glow on active */}
                {active && (
                  <div
                    className="absolute -inset-1 rounded-full blur-md"
                    style={{ background: `${item.color}30` }}
                  />
                )}
                <div
                  className={`relative flex h-10 w-10 items-center justify-center rounded-full transition-all ${active ? 'scale-110' : ''}`}
                  style={active ? { background: `${item.color}20` } : {}}
                >
                  <Icon
                    className={cn(
                      'relative h-5 w-5 transition-colors',
                      active ? 'text-primary' : 'text-muted-foreground',
                    )}
                    strokeWidth={active ? 2.5 : 2}
                  />
                </div>
                <span
                  className={cn(
                    'text-[9px] font-semibold transition-colors',
                    active ? 'text-primary' : 'text-muted-foreground',
                  )}
                >
                  {item.label}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
