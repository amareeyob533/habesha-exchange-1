import webpush from 'web-push'
import { db } from '@/lib/db'

// VAPID keys for web push notifications.
// These are the ONLY keys used — no fallback keys.
// Set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY in your Vercel environment variables.
// If they're not set, push notifications simply won't work (no silent failures,
// no mismatched keys).
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || ''
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || ''

// Configure web-push once.
let configured = false
function configure() {
  if (configured) return
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    console.warn('Push notifications: VAPID_PUBLIC_KEY or VAPID_PRIVATE_KEY not set. Push will be skipped.')
    configured = true
    return
  }
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
 * This function NEVER throws and NEVER breaks the calling route.
 * It is completely fire-and-forget.
 */
export async function sendPushNotification(userId: string, payload: PushPayload): Promise<void> {
  try {
    configure()
    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return // skip if no keys

    // Get all subscriptions for this user
    let subs: any[] = []
    try {
      subs = await db.pushSubscription.findMany({ where: { userId } })
    } catch {
      return // DB error — skip push, don't break the route
    }
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

    // Send to all devices — each one is independent
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
          // 404 / 410 = subscription expired → remove it
          const status = err?.statusCode
          if (status === 404 || status === 410) {
            deadEndpoints.push(sub.endpoint)
          }
          // Any other error (429, 500, network) — just skip, don't fail
        }
      }),
    )

    // Clean up dead subscriptions (best-effort)
    if (deadEndpoints.length > 0) {
      try {
        await db.pushSubscription.deleteMany({
          where: { endpoint: { in: deadEndpoints } },
        })
      } catch {
        // ignore cleanup errors
      }
    }
  } catch {
    // NEVER let push failures break the calling route.
    // This is the most important catch — it ensures deposits/withdrawals
    // always succeed even if push fails completely.
  }
}
