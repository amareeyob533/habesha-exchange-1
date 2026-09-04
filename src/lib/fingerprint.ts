'use client'

/**
 * Client-side device fingerprinting using ThumbmarkJS.
 *
 * Generates a stable `visitorId` that uniquely identifies the browser/device.
 * Used at signup to:
 *   1. Block signup if this device is banned (server checks banned_devices).
 *   2. Attach the visitorId to the new user's record for tracking.
 *
 * ThumbmarkJS is free + open-source and produces a fingerprint from browser
 * signals (canvas, fonts, audio, WebGL, etc.). The id is stable across
 * page reloads on the same browser/device.
 *
 * The result is memoized per session so we only compute it once.
 */

import type { ThumbmarkJS } from '@thumbmarkjs/thumbmarkjs'

let cachedVisitorId: string | null = null
let inflight: Promise<string> | null = null

/**
 * Get the device visitorId. Returns an empty string if fingerprinting
 * fails or is unavailable (the server will treat '' as "not banned" —
 * fail-open for UX).
 */
export async function getVisitorId(): Promise<string> {
  if (cachedVisitorId) return cachedVisitorId
  if (inflight) return inflight

  inflight = (async () => {
    try {
      if (typeof window === 'undefined') return ''
      const mod = await import('@thumbmarkjs/thumbmarkjs')
      const TJS: typeof ThumbmarkJS = mod.ThumbmarkJS || (mod as any).default?.ThumbmarkJS || (mod as any).default
      if (!TJS) return ''
      const result = await TJS.get()
      const id = (result?.visitorId || '').toString().trim()
      cachedVisitorId = id
      return id
    } catch (err) {
      console.warn('Fingerprint generation failed:', err)
      return ''
    } finally {
      inflight = null
    }
  })()

  return inflight
}
