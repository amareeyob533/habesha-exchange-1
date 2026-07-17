'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useMemo } from 'react'

interface ParticleExplosionProps {
  /** When true, the explosion plays. */
  active: boolean
  /** Called when the explosion animation completes. */
  onComplete?: () => void
}

/**
 * Cinematic golden crypto particle explosion overlay.
 *
 * When `active`, bursts ~50 golden particles + digital data streams outward
 * from the center of the screen, swirls them, then clears to reveal whatever
 * is underneath. Used to transition from the landing page "Create Free
 * Account" button into the Sign Up modal.
 *
 * Particles are deterministic (useMemo) so they don't reshuffle on re-render.
 */
export function ParticleExplosion({ active, onComplete }: ParticleExplosionProps) {
  // Generate particle data once.
  const particles = useMemo(
    () =>
      Array.from({ length: 50 }, (_, i) => {
        const angle = (i / 50) * Math.PI * 2 + Math.random() * 0.3
        const distance = 200 + Math.random() * 400
        const size = 4 + Math.random() * 10
        const isCoin = Math.random() > 0.4
        return {
          id: i,
          x: Math.cos(angle) * distance,
          y: Math.sin(angle) * distance,
          size,
          isCoin,
          delay: Math.random() * 0.1,
          rotate: Math.random() * 720 - 360,
        }
      }),
    [],
  )

  // Digital data stream lines.
  const streams = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => ({
        id: i,
        angle: (i / 12) * 360,
        length: 300 + Math.random() * 200,
        delay: Math.random() * 0.15,
      })),
    [],
  )

  return (
    <AnimatePresence onExitComplete={onComplete}>
      {active && (
        <motion.div
          className="fixed inset-0 z-[200] pointer-events-none flex items-center justify-center overflow-hidden"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Bright flash at the start */}
          <motion.div
            className="absolute inset-0 bg-white"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.8, 0] }}
            transition={{ duration: 0.4, times: [0, 0.2, 1] }}
          />

          {/* Golden radial burst */}
          <motion.div
            className="absolute rounded-full"
            style={{
              width: 100,
              height: 100,
              background: 'radial-gradient(circle, rgba(255,200,61,0.9) 0%, rgba(240,185,11,0.4) 40%, transparent 70%)',
            }}
            initial={{ scale: 0, opacity: 1 }}
            animate={{ scale: [0, 8, 12], opacity: [1, 0.6, 0] }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />

          {/* Digital data streams (lines shooting outward) */}
          {streams.map((s) => (
            <motion.div
              key={`stream-${s.id}`}
              className="absolute origin-center"
              style={{
                width: 2,
                height: s.length,
                background: 'linear-gradient(to bottom, transparent, rgba(0,224,143,0.8), transparent)',
                transform: `rotate(${s.angle}deg)`,
              }}
              initial={{ scaleY: 0, opacity: 0 }}
              animate={{ scaleY: [0, 1, 0], opacity: [0, 1, 0] }}
              transition={{ duration: 0.7, delay: s.delay, ease: 'easeOut' }}
            />
          ))}

          {/* Golden crypto particles */}
          {particles.map((p) => (
            <motion.div
              key={`p-${p.id}`}
              className="absolute"
              style={{
                width: p.size,
                height: p.size,
              }}
              initial={{ x: 0, y: 0, scale: 0, opacity: 0 }}
              animate={{
                x: [0, p.x * 0.6, p.x],
                y: [0, p.y * 0.6, p.y],
                scale: [0, 1.2, 0.8],
                opacity: [0, 1, 0],
                rotate: p.rotate,
              }}
              transition={{
                duration: 0.9,
                delay: p.delay,
                ease: 'easeOut',
              }}
            >
              {p.isCoin ? (
                // Golden coin particle
                <div
                  className="w-full h-full rounded-full"
                  style={{
                    background: 'radial-gradient(circle at 30% 30%, #FFE082, #FFC83D 50%, #D49B0A)',
                    boxShadow: '0 0 8px rgba(255,200,61,0.8)',
                  }}
                />
              ) : (
                // Emerald data particle
                <div
                  className="w-full h-full rounded-sm"
                  style={{
                    background: 'linear-gradient(135deg, #00E08F, #00B96B)',
                    boxShadow: '0 0 6px rgba(0,224,143,0.8)',
                  }}
                />
              )}
            </motion.div>
          ))}

          {/* Swirl overlay — a rotating ring that clears the screen */}
          <motion.div
            className="absolute rounded-full border-4 border-gold/40"
            style={{ width: 200, height: 200 }}
            initial={{ scale: 0, rotate: 0, opacity: 0.8 }}
            animate={{ scale: [0, 6, 10], rotate: 360, opacity: [0.8, 0.4, 0] }}
            transition={{ duration: 0.9, ease: 'easeOut' }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  )
}
