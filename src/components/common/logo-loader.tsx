'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { LogoMark } from '@/components/common/logo'

/**
 * Clean static splash screen — Binance style.
 * Just the logo + "HABESHA EXCHANGE" text in gold on the dark background.
 * No spinning rings, no shimmer, no glow pulse. Simple fade in/out.
 */
export function LogoLoader({ visible }: { visible: boolean; label?: string }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-background"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
        >
          <LogoMark className="h-20 w-20 rounded-2xl" />
          <div className="mt-6 text-xl font-extrabold tracking-tight">
            <span className="text-gold-gradient">HABESHA</span>{' '}
            <span className="text-foreground">EXCHANGE</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/**
 * Full-screen brand intro shown on first load.
 * Clean static splash — just logo + name, fades out after 1.2s.
 */
export function BrandIntro({ onDone }: { onDone: () => void }) {
  // Simple timer — no complex animation logic
  if (typeof window !== 'undefined') {
    setTimeout(onDone, 1200)
  }
  return (
    <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-background">
      <LogoMark className="h-20 w-20 rounded-2xl" />
      <div className="mt-6 text-xl font-extrabold tracking-tight">
        <span className="text-gold-gradient">HABESHA</span>{' '}
        <span className="text-foreground">EXCHANGE</span>
      </div>
    </div>
  )
}
