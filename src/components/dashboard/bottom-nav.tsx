'use client'

import { useUI, type ViewKey } from '@/hooks/use-ui'
import { cn } from '@/lib/utils'
import { LayoutDashboard, LineChart, ArrowLeftRight, Wallet } from 'lucide-react'

const ITEMS: { key: ViewKey; icon: any; label: string; color: string }[] = [
  { key: 'overview', icon: LayoutDashboard, label: 'Home', color: '#F0B90B' },
  { key: 'markets', icon: LineChart, label: 'Markets', color: '#F0B90B' },
  { key: 'exchange', icon: ArrowLeftRight, label: 'Trade', color: '#F0B90B' },
  { key: 'wallet', icon: Wallet, label: 'Wallet', color: '#F0B90B' },
]

/**
 * Bottom navigation — Binance style.
 * Flat dark bar with gold active icon.
 */
export function BottomNav() {
  const { view, setView } = useUI()

  return (
    <nav
      aria-label="Quick navigation"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border glass-strong lg:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="mx-auto flex max-w-md items-center justify-around px-2 py-2">
        {ITEMS.map((item) => {
          const active = view === item.key
          const Icon = item.icon
          return (
            <button
              key={item.key}
              onClick={() => setView(item.key)}
              aria-label={item.label}
              aria-current={active ? 'page' : undefined}
              className="relative flex flex-col items-center justify-center gap-1.5"
            >
              <div
                className={`relative flex h-10 w-10 items-center justify-center rounded-full transition-all ${active ? 'scale-110' : ''}`}
                style={active ? { background: `${item.color}20` } : {}}
              >
                <Icon
                  className={cn(
                    'relative h-5 w-5 transition-colors',
                    active ? 'text-gold' : 'text-muted-foreground',
                  )}
                  strokeWidth={active ? 2.5 : 2}
                />
              </div>
              <span
                className={cn(
                  'text-[9px] font-semibold transition-colors',
                  active ? 'text-gold' : 'text-muted-foreground',
                )}
              >
                {item.label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
