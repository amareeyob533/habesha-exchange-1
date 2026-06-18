import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/api'
import { isAdminEmail } from '@/lib/deposit-actions'

/** POST /api/admin/users/notify { userId, title, message } — admin sends a notification to a user */
export async function POST(req: NextRequest) {
  try {
    const { user, response } = await requireAuth()
    if (!user) return response!
    if (!isAdminEmail(user.email)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }
    const { userId, title, message } = await req.json()
    if (!userId || !title?.trim() || !message?.trim()) {
      return NextResponse.json({ error: 'userId, title and message are required' }, { status: 400 })
    }
    const target = await db.user.findUnique({ where: { id: userId }, select: { id: true } })
    if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    await db.notification.create({
      data: {
        userId,
        title: title.trim(),
        message: message.trim(),
        type: 'info',
      },
    })
    return NextResponse.json({ ok: true, message: 'Notification sent.' })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed' }, { status: 500 })
  }
}
