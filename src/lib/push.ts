import webpush from 'web-push'
import { db } from '@/lib/db'

// VAPID keys for web push.
// In production set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY env vars.
// For demo/dev we fall back to a generated pair so push works out of the box.
const FALLBACK_PUBLIC = 'BJhylL4OHXNmmXVLylmnJYgsnPpa8f5BjTx4ADwsqtEDu2rDdcR8w_7VwXWSZkEGQg0FMc8okPb9wUXZGf0qQjg'
const FALLBACK_PRIVATE = 'DAvSCuXolFeH5AHYL5er-BujtYrKjHQXVk2jXKCSW3I'

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || FALLBACK_PUBLIC
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || FALLBACK_PRIVATE

// Configure web-push once.
let configured = false
function configure() {
  if (configured) return
  webpush.setVapidDetails(
    'mailto:' + (process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'noreply@habesha.exchange'),
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY,
  )
  configured = true
}

export function getVapidPublicKey(): string {
  return VAPID_PUBLIC_KEY
}

export interface PushPayload {
  title: string
  body: string
  url?: string
  tag?: string
}

/**
 * Send a web push notification to ALL of a user's subscribed devices.
 * Silently skips if the user has no subscriptions or if push fails (so it
 * never breaks the calling API route).
 */
export async function sendPushNotification(userId: string, payload: PushPayload): Promise<void> {
  try {
    configure()
    const subs = await db.pushSubscription.findMany({ where: { userId } })
    if (subs.length === 0) return

    const message = JSON.stringify({
      title: payload.title,
      body: payload.body,
      url: payload.url || '/',
      tag: payload.tag || 'habesha-notification',
      icon: '/habesha-mark.jpg',
      badge: '/habesha-mark.jpg',
    })

    const deadEndpoints: string[] = []

    await Promise.all(
      subs.map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            },
            message,
          )
        } catch (err: any) {
          // 404 / 410 = subscription expired/unsubscribed → remove it.
          const status = err?.statusCode
          if (status === 404 || status === 410) {
            deadEndpoints.push(sub.endpoint)
          }
          // Otherwise (transient error) just skip — don't fail the request.
        }
      }),
    )

    // Clean up dead subscriptions.
    if (deadEndpoints.length > 0) {
      await db.pushSubscription.deleteMany({
        where: { endpoint: { in: deadEndpoints } },
      })
    }
  } catch {
    // Never let push failures break the calling route.
  }
}
