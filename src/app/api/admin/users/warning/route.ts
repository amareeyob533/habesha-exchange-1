import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/api'
import { isAdminEmail } from '@/lib/deposit-actions'
import { sendPushNotification } from '@/lib/push'

/**
 * POST /api/admin/users/warning { userId, title, message }
 * Admin sends a warning popup to a specific user.
 * The user sees a ⚠️ popup animation when they open the website.
 */
export async function POST(req: NextRequest) {
  try {
    const { user, response } = await requireAuth()
    if (!user) return response!
    if (!isAdminEmail(user.email)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { userId, title, message } = await req.json()
    if (!userId || !title || !message) {
      return NextResponse.json({ error: 'userId, title, and message are required' }, { status: 400 })
    }

    // Create a notification with type 'warning_popup' so the frontend knows to show the popup
    await db.notification.create({
      data: {
        userId,
        title: `⚠️ ${title}`,
        message,
        type: 'warning_popup',
      },
    })

    // Also send a push notification
    await sendPushNotification(userId, {
      title: `⚠️ ${title}`,
      body: message,
    }).catch(() => {})

    return NextResponse.json({ ok: true, message: 'Warning sent to user' })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed' }, { status: 500 })
  }
}
