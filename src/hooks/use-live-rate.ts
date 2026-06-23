'use client'

import { useState, useEffect, useRef } from 'react'

// The USDT/ETB rate fluctuates between 190.99534 and 192.76.
// Update intervals vary: sometimes 2 min, sometimes 10 min, sometimes 30 min.
const RATE_MIN = 190.99534
const RATE_MAX = 192.76
const INTERVALS = [2 * 60 * 1000, 10 * 60 * 1000, 30 * 60 * 1000] // 2min, 10min, 30min

function randomRate(): number {
  return RATE_MIN + Math.random() * (RATE_MAX - RATE_MIN)
}

function randomInterval(): number {
  return INTERVALS[Math.floor(Math.random() * INTERVALS.length)]
}

export interface LiveRate {
  rate: number
  prevRate: number
  direction: 'up' | 'down' | 'stable'
  history: { t: number; rate: number }[]
  lastUpdate: number
  nextUpdateIn: number
}

/**
 * Hook that provides a fluctuating USDT/ETB rate.
 * The rate changes at random intervals (2/10/30 min) within the 190.99–192.76 range.
 * Also emits a sub-tick every 5s for smooth animation of the "next update" timer.
 */
export function useLiveRate(): LiveRate {
  const [state, setState] = useState<LiveRate>(() => ({
    rate: randomRate(),
    prevRate: 0,
    direction: 'stable',
    history: [{ t: Date.now(), rate: 0 }],
    lastUpdate: Date.now(),
    nextUpdateIn: 0,
  }))
  const nextIntervalRef = useRef(randomInterval())
  const intervalEndRef = useRef(Date.now() + nextIntervalRef.current)

  useEffect(() => {
    // Initialize with a real first value
    const startRate = randomRate()
    setState({
      rate: startRate,
      prevRate: startRate,
      direction: 'stable',
      history: [{ t: Date.now(), rate: startRate }],
      lastUpdate: Date.now(),
      nextUpdateIn: nextIntervalRef.current,
    })

    const tick = () => {
      const now = Date.now()
      const remaining = intervalEndRef.current - now

      if (remaining <= 0) {
        // Time for a new rate
        const newRate = randomRate()
        setState((prev) => {
          const direction = newRate > prev.rate ? 'up' : newRate < prev.rate ? 'down' : 'stable'
          const history = [...prev.history, { t: now, rate: newRate }].slice(-30)
          return {
            rate: newRate,
            prevRate: prev.rate,
            direction,
            history,
            lastUpdate: now,
            nextUpdateIn: nextIntervalRef.current,
          }
        })
        // Schedule next interval
        nextIntervalRef.current = randomInterval()
        intervalEndRef.current = now + nextIntervalRef.current
      } else {
        // Just update the countdown
        setState((prev) => ({ ...prev, nextUpdateIn: remaining }))
      }
    }

    // Tick every 5 seconds for smooth countdown
    const id = setInterval(tick, 5000)
    tick() // initial
    return () => clearInterval(id)
  }, [])

  return state
}
