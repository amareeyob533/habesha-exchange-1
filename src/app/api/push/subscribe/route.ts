import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/api'

/**
 * POST /api/push/subscribe
 * Body: { endpoint, keys: { p256dh, auth } }
 *
 * Stores (or refreshes) a push subscription for the current user. Each
 * user can have multiple subscriptions (one per device/browser). If the
 * endpoint already exists it's updated; otherwise created.
 */
export async function POST(req: NextRequest) {
  try {
    const { user, response } = await requireAuth()
    if (!user) return response!

    const { endpoint, keys } = await req.json()
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return NextResponse.json({ error: 'endpoint, keys.p256dh and keys.auth are required' }, { status: 400 })
    }

    // Upsert by endpoint (unique) so re-subscribing doesn't duplicate.
    await db.pushSubscription.upsert({
      where: { endpoint },
      create: {
        userId: user.id,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
      },
      update: {
        userId: user.id,
        p256dh: keys.p256dh,
        auth: keys.auth,
      },
    })

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed' }, { status: 500 })
  }
}
