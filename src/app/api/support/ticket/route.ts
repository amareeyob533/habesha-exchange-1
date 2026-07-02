import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/api'

/** GET /api/support/ticket — list user's tickets with replies */
export async function GET() {
  try {
    const { user, response } = await requireAuth()
    if (!user) return response!
    const tickets = await db.supportMessage.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      include: { replies: { orderBy: { createdAt: 'asc' } } },
    })
    return NextResponse.json({ tickets })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message }, { status: 500 })
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
    }
    return NextResponse.json({ ok: true, ticket })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message }, { status: 500 })
  }
}
