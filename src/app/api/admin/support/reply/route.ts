import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/api'
import { isAdminEmail } from '@/lib/deposit-actions'

/** POST /api/admin/support/reply { ticketId, message } — admin replies to a ticket */
export async function POST(req: NextRequest) {
  try {
    const { user, response } = await requireAuth()
    if (!user) return response!
    if (!isAdminEmail(user.email)) return NextResponse.json({ error: 'Admin only' }, { status: 403 })
    const { ticketId, message } = await req.json()
    if (!ticketId || !message?.trim()) {
      return NextResponse.json({ error: 'ticketId and message required' }, { status: 400 })
    }
    const ticket = await db.supportMessage.findUnique({ where: { id: ticketId } })
    if (!ticket) return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })

    const reply = await db.supportReply.create({
      data: { ticketId, senderId: user.id, senderRole: 'admin', message: message.trim() },
    })
    // Notify the user
    await db.notification.create({
      data: {
        userId: ticket.userId,
        title: 'Support Reply',
        message: `Admin replied to your ticket: ${ticket.subject}`,
        type: 'success',
      },
    })
    return NextResponse.json({ ok: true, reply })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message }, { status: 500 })
  }
}
