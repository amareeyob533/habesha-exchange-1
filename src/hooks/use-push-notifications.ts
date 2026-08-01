'use client'

import { useState, useEffect, useCallback } from 'react'
import { apiFetch } from '@/lib/api-client'

// Browser-only push notification subscription helper.
// Returns the current permission state + a subscribe() function that asks
// the user for permission and registers the service worker + push subscription.

type Permission = 'default' | 'granted' | 'denied' | 'unsupported'

export function usePushNotifications() {
  const [permission, setPermission] = useState<Permission>('default')
  const [subscribed, setSubscribed] = useState(false)
  const [loading, setLoading] = useState(false)

  // Sync the initial permission state on mount.
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      setPermission('unsupported')
      return
    }
    setPermission(Notification.permission as Permission)
  }, [])

  /**
   * Ask the user for notification permission, register the service worker,
   * subscribe to push, and send the subscription to the server.
   */
  const subscribe = useCallback(async () => {
    if (typeof window === 'undefined') return false
    if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      return false
    }
    setLoading(true)
    try {
      // 1. Ask permission
      const perm = await Notification.requestPermission()
      setPermission(perm as Permission)
      if (perm !== 'granted') return false

      // 2. Register service worker (scope '/')
      const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' })
      // Wait for it to be ready
      await navigator.serviceWorker.ready

      // 3. Get the VAPID public key from the server
      const { publicKey } = await apiFetch<{ publicKey: string }>('/api/push/vapid')
      if (!publicKey) return false

      // 4. Subscribe to push
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      })

      // 5. Send the subscription to the server
      const subJson = sub.toJSON()
      await apiFetch('/api/push/subscribe', {
        method: 'POST',
        body: JSON.stringify({
          endpoint: subJson.endpoint,
          keys: subJson.keys,
        }),
      })

      setSubscribed(true)
      return true
    } catch (err) {
      console.error('push subscribe error:', err)
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  return { permission, subscribed, loading, subscribe }
}

// Convert a base64url VAPID public key to a Uint8Array (required by PushManager).
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = typeof window !== 'undefined' ? window.atob(base64) : Buffer.from(base64, 'base64').toString('binary')
  const output = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    output[i] = rawData.charCodeAt(i)
  }
  return output
}
