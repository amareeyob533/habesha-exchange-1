'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useState } from 'react'

type Pose = 'idle' | 'point' | 'thumbsup' | 'handshake'

interface RobotMascotProps {
  pose?: Pose
  size?: number
  className?: string
  /** When true, play the initial jump + backflip entrance animation. */
  playEntrance?: boolean
  /** Blink the eyes periodically. */
  blink?: boolean
  /** Optional inline style override. */
  style?: React.CSSProperties
}

/**
 * Cinematic robot mascot for Habesha Exchange.
 *
 * The robot's face is the animated {H} diamond logo. It can:
 *  - Jump onto the screen + backflip (entrance)
 *  - Point at a target (e.g. the "Create Free Account" button)
 *  - Give a thumbs-up
 *  - Reach out for a 3D handshake
 *
 * Uses 4 pre-rendered PNGs so it loads instantly and looks consistent.
 */
export function RobotMascot({
  pose = 'idle',
  size = 80,
  className = '',
  playEntrance = false,
  blink = true,
  style,
}: RobotMascotProps) {
  const [entered, setEntered] = useState(!playEntrance)
  const [blinking, setBlinking] = useState(false)

  // Entrance: jump in + backflip, then land.
  useEffect(() => {
    if (!playEntrance) return
    const t = setTimeout(() => setEntered(true), 50)
    return () => clearTimeout(t)
  }, [playEntrance])

  // Periodic blink.
  useEffect(() => {
    if (!blink) return
    const id = setInterval(() => {
      setBlinking(true)
      setTimeout(() => setBlinking(false), 140)
    }, 2800 + Math.random() * 1200)
    return () => clearInterval(id)
  }, [blink])

  const img = `/mascot/robot-${pose}.png`

  return (
    <div className={`relative inline-block ${className}`} style={{ width: size, height: size, ...style }}>
      {/* Glow under the robot */}
      <div
        className="absolute bottom-0 left-1/2 -translate-x-1/2 rounded-full bg-primary/30 blur-xl"
        style={{ width: size * 0.7, height: size * 0.2 }}
      />
      <AnimatePresence mode="wait">
        <motion.img
          key={pose}
          src={img}
          alt="Habesha Exchange robot mascot"
          className="relative z-10 w-full h-full object-contain select-none pointer-events-none"
          draggable={false}
          initial={playEntrance && !entered ? {
            y: -400,
            x: -200,
            scale: 0.3,
            rotate: -720,
            opacity: 0,
          } : { scale: 0.8, opacity: 0 }}
          animate={{
            y: 0,
            x: 0,
            scale: 1,
            rotate: 0,
            opacity: 1,
          }}
          exit={{ scale: 0.8, opacity: 0 }}
          transition={{
            duration: playEntrance && !entered ? 1.4 : 0.5,
            ease: playEntrance && !entered ? [0.22, 1, 0.36, 1] : 'easeOut',
            type: playEntrance && !entered ? 'spring' : 'tween',
            stiffness: 200,
            damping: 12,
          }}
        />
      </AnimatePresence>
      {/* Blink overlay (subtle scale on the face area) */}
      {blink && blinking && (
        <div
          className="absolute z-20 rounded-full bg-primary/60 blur-sm"
          style={{
            width: size * 0.18,
            height: size * 0.06,
            top: size * 0.32,
            left: '50%',
            transform: 'translateX(-50%)',
          }}
        />
      )}
    </div>
  )
}
