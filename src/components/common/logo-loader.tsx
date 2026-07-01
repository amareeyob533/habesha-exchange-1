'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useState } from 'react'
import { LogoMark } from '@/components/common/logo'

export function LogoLoader({ visible, label = 'Loading Habesha Exchange' }: { visible: boolean; label?: string }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-background"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
        >
          <div className="bg-gold-glow absolute h-[420px] w-[420px] animate-glow-pulse rounded-full" />
          <div className="relative flex h-40 w-40 items-center justify-center">
            {/* Rotating gold rings */}
            <motion.div
              className="absolute inset-0 rounded-full border-2 border-transparent"
              style={{
                borderTopColor: 'var(--gold)',
                borderRightColor: 'color-mix(in srgb, var(--gold) 40%, transparent)',
              }}
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1.1, ease: 'linear' }}
            />
            <motion.div
              className="absolute inset-3 rounded-full border-2 border-transparent"
              style={{
                borderBottomColor: 'color-mix(in srgb, var(--gold) 60%, transparent)',
                borderLeftColor: 'color-mix(in srgb, var(--gold) 25%, transparent)',
              }}
              animate={{ rotate: -360 }}
              transition={{ repeat: Infinity, duration: 1.6, ease: 'linear' }}
            />
            {/* Pulsing mark */}
            <motion.div
              animate={{ scale: [1, 1.06, 1] }}
              transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
              className="relative"
            >
              <LogoMark className="h-20 w-20 rounded-2xl shadow-[0_0_40px_rgba(240,185,11,0.45)] ring-2 ring-gold/30" />
            </motion.div>
          </div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-8 text-center"
          >
            <div className="text-xl font-extrabold tracking-tight">
              <span className="text-gold-gradient">HABESHA</span>{' '}
              <span className="text-foreground">EXCHANGE</span>
            </div>
            <ShimmerText text={label} />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function ShimmerText({ text }: { text: string }) {
  const [dots, setDots] = useState('')
  useEffect(() => {
    const id = setInterval(() => {
      setDots((d) => (d.length >= 3 ? '' : d + '.'))
    }, 400)
    return () => clearInterval(id)
  }, [])
  return <div className="mt-2 text-xs tracking-[0.25em] text-muted-foreground">{text}{dots}</div>
}

/** Full-screen brand intro shown on first load. */
export function BrandIntro({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 1900)
    return () => clearTimeout(t)
  }, [onDone])
  return <LogoLoader visible label="Securing your session" />
}
