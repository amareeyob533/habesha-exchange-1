import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/api'
import { sendPushNotification } from '@/lib/push'

/** GET /api/support/ticket — list user's tickets with replies */
export async function GET() {
  try {
    const { user, response } = await requireAuth()
    if (!user) return response!
    try {
      const tickets = await db.supportMessage.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        include: { replies: { orderBy: { createdAt: 'asc' } } },
      })
      return NextResponse.json({ tickets })
    } catch (dbErr: any) {
      console.error('Support ticket DB error:', dbErr?.message)
      // If table doesn't exist yet, return empty
      if (dbErr?.message?.includes('does not exist') || dbErr?.code === 'P2021') {
        return NextResponse.json({ tickets: [] })
      }
      throw dbErr
    }
  } catch (err: any) {
    console.error('Support ticket error:', err)
    return NextResponse.json({ tickets: [], error: err?.message }, { status: 500 })
  }
}

/** POST /api/support/ticket — create a new support ticket */
export async function POST(req: NextRequest) {
  try {
    const { user, response } = await requireAuth()
    if (!user) return response!
    const { subject, message } = await req.json()
    if (!subject?.trim() || !message?.trim()) {
      return NextResponse.json({ error: 'Subject and message required' }, { status: 400 })
    }
    const ticket = await db.supportMessage.create({
      data: { userId: user.id, subject: subject.trim(), message: message.trim(), status: 'open' },
    })
    // Notify admin
    const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'amareeyob533@gmail.com'
    try {
      const admin = await db.user.findUnique({ where: { email: adminEmail }, select: { id: true } })
      if (admin) {
        await db.notification.create({
          data: {
            userId: admin.id,
            title: 'New Support Ticket',
            message: `${user.name || user.email}: ${subject.trim()}`,
            type: 'info',
          },
        })
        await sendPushNotification(admin.id, { title: 'New Support Ticket', body: `${user.name || user.email}: ${subject.trim()}` }).catch(() => {})
      }
    } catch (e) { /* notification not critical */ }
    return NextResponse.json({ ok: true, ticket })
  } catch (err: any) {
    console.error('Create ticket error:', err)
    return NextResponse.json({ error: err?.message || 'Failed to create ticket' }, { status: 500 })
  }
}
