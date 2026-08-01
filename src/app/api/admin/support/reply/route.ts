import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/api'
import { isAdminEmail } from '@/lib/deposit-actions'
import { sendPushNotification } from '@/lib/push'

/** POST /api/admin/support/reply { ticketId, message, voiceData, voiceMime, voiceDuration } — admin replies to a ticket */
export async function POST(req: NextRequest) {
  try {
    const { user, response } = await requireAuth()
    if (!user) return response!
    if (!isAdminEmail(user.email)) return NextResponse.json({ error: 'Admin only' }, { status: 403 })
    const { ticketId, message, voiceData, voiceMime, voiceDuration } = await req.json()
    if (!ticketId || (!message?.trim() && !voiceData)) {
      return NextResponse.json({ error: 'ticketId and message or voiceData required' }, { status: 400 })
    }
    const ticket = await db.supportMessage.findUnique({ where: { id: ticketId } })
    if (!ticket) return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })

    // Derive mime type from the data URL prefix if not explicitly provided.
    let mime: string | null = voiceMime || null
    if (voiceData && !mime) {
      const match = String(voiceData).match(/^data:([^;,]+)/)
      if (match) mime = match[1]
    }
    const reply = await db.supportReply.create({
      data: {
        ticketId,
        senderId: user.id,
        senderRole: 'admin',
        message: message?.trim() || '',
        voiceData: voiceData || null,
        voiceMime: mime,
        voiceDuration: voiceDuration != null ? Number(voiceDuration) : null,
      },
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
    await sendPushNotification(ticket.userId, { title: 'Support Reply', body: `Admin replied to your ticket: ${ticket.subject}` }).catch(() => {})
    return NextResponse.json({ ok: true, reply })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message }, { status: 500 })
  }
}
