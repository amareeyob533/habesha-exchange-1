'use client'

import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useSyncExternalStore } from 'react'
import { motion } from 'framer-motion'

// Hydration-safe mounted flag without setState-in-effect.
const emptySubscribe = () => () => {}
function useMounted() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true, // client
    () => false, // server
  )
}

export function ThemeToggle({ className = '' }: { className?: string }) {
  const { theme, setTheme } = useTheme()
  const mounted = useMounted()
  const isDark = theme === 'dark'

  return (
    <button
      aria-label="Toggle theme"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className={`relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-secondary/60 text-foreground transition-colors hover:border-gold/60 hover:text-gold ${className}`}
    >
      {mounted ? (
        <motion.span
          key={isDark ? 'moon' : 'sun'}
          initial={{ rotate: -90, opacity: 0, scale: 0.6 }}
          animate={{ rotate: 0, opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        >
          {isDark ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
        </motion.span>
      ) : (
        <span className="h-4 w-4" />
      )}
    </button>
  )
}
