import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/api'
import { isAdminEmail } from '@/lib/deposit-actions'

/** POST /api/admin/support/resolve { ticketId } — admin marks ticket as resolved */
export async function POST(req: NextRequest) {
  try {
    const { user, response } = await requireAuth()
    if (!user) return response!
    if (!isAdminEmail(user.email)) return NextResponse.json({ error: 'Admin only' }, { status: 403 })
    const { ticketId } = await req.json()
    if (!ticketId) return NextResponse.json({ error: 'ticketId required' }, { status: 400 })

    await db.supportMessage.update({ where: { id: ticketId }, data: { status: 'resolved' } })
    const ticket = await db.supportMessage.findUnique({ where: { id: ticketId } })
    if (ticket) {
      await db.notification.create({
        data: {
          userId: ticket.userId,
          title: 'Ticket Resolved',
          message: `Your support ticket "${ticket.subject}" has been marked as resolved. If you need more help, please open a new ticket.`,
          type: 'info',
        },
      })
    }
    return NextResponse.json({ ok: true, message: 'Ticket resolved' })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message }, { status: 500 })
  }
}
