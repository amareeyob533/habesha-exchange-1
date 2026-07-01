'use client'

import { useState, useEffect, useRef } from 'react'

// The USDT/ETB rate fluctuates between 185 and 187.
// Update intervals vary: sometimes 2 min, sometimes 10 min, sometimes 30 min.
const RATE_MIN = 185
const RATE_MAX = 187
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
 * The rate changes at random intervals (2/10/30 min) within the 185–187 range.
 * Also emits a sub-tick every 5s for smooth animation.
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
        nextIntervalRef.current = randomInterval()
        intervalEndRef.current = now + nextIntervalRef.current
      } else {
        setState((prev) => ({ ...prev, nextUpdateIn: remaining }))
      }
    }

    const id = setInterval(tick, 5000)
    tick()
    return () => clearInterval(id)
  }, [])

  return state
}
