'use client'

import { motion, AnimatePresence } from 'framer-motion'

interface HandshakeFinaleProps {
  /** When true, the 3D handshake effect plays. */
  active: boolean
  /** Called when the effect completes. */
  onComplete?: () => void
}

/**
 * 3D handshake finale — the robot's hand dramatically stretches forward in
 * 3D perspective, appearing to break out of the flat screen toward the user.
 *
 * Uses CSS perspective + scale + translateZ to create the illusion of depth.
 * This is the last thing the user sees before being logged into the dashboard.
 */
export function HandshakeFinale({ active, onComplete }: HandshakeFinaleProps) {
  return (
    <AnimatePresence onExitComplete={onComplete}>
      {active && (
        <motion.div
          className="fixed inset-0 z-[200] pointer-events-none flex items-center justify-center"
          style={{ perspective: '1000px' }}
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
        >
          {/* Dark cinematic backdrop */}
          <motion.div
            className="absolute inset-0 bg-background"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.85, 0.95] }}
            transition={{ duration: 0.6 }}
          />

          {/* Radial glow behind the hand */}
          <motion.div
            className="absolute rounded-full"
            style={{
              width: 300,
              height: 300,
              background: 'radial-gradient(circle, rgba(0,224,143,0.4) 0%, rgba(255,200,61,0.2) 40%, transparent 70%)',
            }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: [0, 1.5, 3], opacity: [0, 1, 0.6] }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
          />

          {/* The robot hand reaching out in 3D */}
          <motion.div
            className="relative"
            style={{ transformStyle: 'preserve-3d' }}
            initial={{ scale: 0.2, opacity: 0, z: -800, rotateX: 20 }}
            animate={{
              scale: [0.2, 0.6, 1, 1.8, 2.5],
              opacity: [0, 1, 1, 1, 1],
              z: [-800, -400, 0, 200, 500],
              rotateX: [20, 10, 0, -10, -20],
            }}
            transition={{
              duration: 1.6,
              ease: [0.22, 1, 0.36, 1],
              times: [0, 0.25, 0.5, 0.75, 1],
            }}
          >
            <img
              src="/mascot/robot-handshake.png"
              alt="Robot handshake"
              className="w-64 h-64 object-contain drop-shadow-[0_0_30px_rgba(0,224,143,0.6)]"
              draggable={false}
            />
          </motion.div>

          {/* Golden particle trail behind the hand */}
          {Array.from({ length: 20 }).map((_, i) => (
            <motion.div
              key={`trail-${i}`}
              className="absolute rounded-full"
              style={{
                width: 3 + Math.random() * 6,
                height: 3 + Math.random() * 6,
                background: i % 2 === 0 ? '#FFC83D' : '#00E08F',
                boxShadow: `0 0 8px ${i % 2 === 0 ? 'rgba(255,200,61,0.8)' : 'rgba(0,224,143,0.8)'}`,
              }}
              initial={{
                x: (Math.random() - 0.5) * 400,
                y: (Math.random() - 0.5) * 400,
                scale: 0,
                opacity: 0,
              }}
              animate={{
                x: 0,
                y: 0,
                scale: [0, 1.5, 0],
                opacity: [0, 1, 0],
              }}
              transition={{
                duration: 1.2,
                delay: 0.3 + i * 0.04,
                ease: 'easeIn',
              }}
            />
          ))}

          {/* "Welcome" text that fades in at the end */}
          <motion.div
            className="absolute bottom-1/4 text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: [0, 0, 1], y: [20, 0, 0] }}
            transition={{ duration: 1.6, times: [0, 0.6, 1] }}
          >
            <div className="text-3xl font-extrabold text-gold-gradient sm:text-5xl">
              Welcome to Habesha Exchange
            </div>
            <div className="mt-2 text-sm text-muted-foreground">
              Your account is ready…
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
