import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/api'

/** POST /api/support/reply — user replies to their own ticket */
export async function POST(req: NextRequest) {
  try {
    const { user, response } = await requireAuth()
    if (!user) return response!
    const { ticketId, message } = await req.json()
    if (!ticketId || !message?.trim()) {
      return NextResponse.json({ error: 'ticketId and message required' }, { status: 400 })
    }
    const ticket = await db.supportMessage.findUnique({ where: { id: ticketId } })
    if (!ticket || ticket.userId !== user.id) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    }
    if (ticket.status === 'resolved') {
      return NextResponse.json({ error: 'This ticket is resolved' }, { status: 400 })
    }
    const reply = await db.supportReply.create({
      data: { ticketId, senderId: user.id, senderRole: 'user', message: message.trim() },
    })
    // Notify admin
    try {
      const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'amareeyob533@gmail.com'
      const admin = await db.user.findUnique({ where: { email: adminEmail }, select: { id: true } })
      if (admin) {
        await db.notification.create({
          data: {
            userId: admin.id,
            title: 'Support Reply',
            message: `${user.name || user.email} replied to: ${ticket.subject}`,
            type: 'info',
          },
        })
      }
    } catch (e) { /* not critical */ }
    return NextResponse.json({ ok: true, reply })
  } catch (err: any) {
    console.error('Reply error:', err)
    return NextResponse.json({ error: err?.message || 'Failed to reply' }, { status: 500 })
  }
}
