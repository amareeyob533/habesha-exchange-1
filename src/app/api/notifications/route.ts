import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/api'

export async function GET() {
  try {
    const { user, response } = await requireAuth()
    if (!user) return response!
    const notifications = await db.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 30,
    })
    const unread = notifications.filter((n) => !n.read).length
    return NextResponse.json({ notifications, unread })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message }, { status: 500 })
  }
}

export async function POST() {
  try {
    const { user, response } = await requireAuth()
    if (!user) return response!
    await db.notification.updateMany({
      where: { userId: user.id, read: false },
      data: { read: true },
    })
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message }, { status: 500 })
  }
}
