'use client'

import { useUI, type ViewKey } from '@/hooks/use-ui'
import { cn } from '@/lib/utils'
import { LayoutDashboard, LineChart, ArrowLeftRight, Wallet } from 'lucide-react'
import { motion } from 'framer-motion'

const ITEMS: { key: ViewKey; icon: any; label: string; color: string }[] = [
  { key: 'overview', icon: LayoutDashboard, label: 'Home', color: '#00E08F' },
  { key: 'markets', icon: LineChart, label: 'Markets', color: '#22D3EE' },
  { key: 'exchange', icon: ArrowLeftRight, label: 'Trade', color: '#FFC83D' },
  { key: 'wallet', icon: Wallet, label: 'Wallet', color: '#B47AFF' },
]

/**
 * Liquid circular bottom navigation.
 * Each icon sits inside a circle. When active, a liquid "water fill" animates
 * inside the circle (SVG wave). Inactive circles are plain outlines.
 */
export function BottomNav() {
  const { view, setView } = useUI()

  return (
    <nav
      aria-label="Quick navigation"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border/40 glass-strong lg:hidden"
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
              {/* Liquid circle */}
              <LiquidCircle active={active} color={item.color}>
                <Icon
                  className={cn(
                    'relative h-5 w-5 transition-colors',
                    active ? 'text-primary-foreground' : 'text-muted-foreground',
                  )}
                  strokeWidth={active ? 2.5 : 2}
                />
              </LiquidCircle>
              {/* Label */}
              <span
                className={cn(
                  'text-[9px] font-semibold transition-colors',
                  active ? 'text-foreground' : 'text-muted-foreground',
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

/**
 * A circle with an animated liquid water fill.
 * When active, gold-tinted liquid waves fill ~70% of the circle.
 * When inactive, it's a plain bordered circle.
 */
function LiquidCircle({ active, color, children }: { active: boolean; color: string; children: React.ReactNode }) {
  const size = 48
  const fillLevel = 0.72 // how full the liquid is

  return (
    <div
      className={cn(
        'relative flex items-center justify-center rounded-full transition-all',
        active ? 'shadow-gold' : '',
      )}
      style={{ width: size, height: size }}
    >
      {active ? (
        <>
          {/* Filled circle background */}
          <div
            className="absolute inset-0 rounded-full"
            style={{ background: `linear-gradient(135deg, ${color}, ${color}dd)` }}
          />
          {/* Liquid wave overlay */}
          <svg
            className="absolute inset-0 h-full w-full"
            viewBox="0 0 48 48"
            fill="none"
            style={{ borderRadius: '50%' }}
          >
            <defs>
              <clipPath id={`circle-clip-${color.replace('#', '')}`}>
                <circle cx="24" cy="24" r="24" />
              </clipPath>
            </defs>
            <g clipPath={`url(#circle-clip-${color.replace('#', '')})`}>
              {/* Wave 1 — slower, more transparent */}
              <motion.path
                d="M 0 24 Q 12 20 24 24 T 48 24 L 48 48 L 0 48 Z"
                fill="rgba(255,255,255,0.15)"
                animate={{
                  d: [
                    'M 0 24 Q 12 20 24 24 T 48 24 L 48 48 L 0 48 Z',
                    'M 0 24 Q 12 28 24 24 T 48 24 L 48 48 L 0 48 Z',
                    'M 0 24 Q 12 20 24 24 T 48 24 L 48 48 L 0 48 Z',
                  ],
                }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                style={{ transform: `translateY(${(1 - fillLevel) * 48 - 12}px)` }}
              />
              {/* Wave 2 — faster, brighter */}
              <motion.path
                d="M 0 26 Q 16 22 24 26 T 48 26 L 48 48 L 0 48 Z"
                fill="rgba(255,255,255,0.1)"
                animate={{
                  d: [
                    'M 0 26 Q 16 22 24 26 T 48 26 L 48 48 L 0 48 Z',
                    'M 0 26 Q 16 30 24 26 T 48 26 L 48 48 L 0 48 Z',
                    'M 0 26 Q 16 22 24 26 T 48 26 L 48 48 L 0 48 Z',
                  ],
                }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                style={{ transform: `translateY(${(1 - fillLevel) * 48 - 10}px)` }}
              />
            </g>
          </svg>
          {/* Ring */}
          <div className="absolute inset-0 rounded-full ring-2 ring-white/20" />
          {/* Glow */}
          <div
            className="absolute inset-0 rounded-full opacity-50 blur-md"
            style={{ background: color }}
          />
        </>
      ) : (
        /* Inactive: plain bordered circle */
        <div className="absolute inset-0 rounded-full border border-border bg-secondary/30" />
      )}
      {/* Icon on top */}
      <div className="relative z-10">{children}</div>
    </div>
  )
}
