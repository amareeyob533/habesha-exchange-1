import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/api'
import { sendPushNotification } from '@/lib/push'

/** POST /api/support/reply — user replies to their own ticket (text and/or voice) */
export async function POST(req: NextRequest) {
  try {
    const { user, response } = await requireAuth()
    if (!user) return response!
    const { ticketId, message, voiceData, voiceMime, voiceDuration } = await req.json()
    if (!ticketId || (!message?.trim() && !voiceData)) {
      return NextResponse.json({ error: 'ticketId and message or voiceData required' }, { status: 400 })
    }
    const ticket = await db.supportMessage.findUnique({ where: { id: ticketId } })
    if (!ticket || ticket.userId !== user.id) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    }
    if (ticket.status === 'resolved') {
      return NextResponse.json({ error: 'This ticket is resolved' }, { status: 400 })
    }
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
        senderRole: 'user',
        message: message?.trim() || '',
        voiceData: voiceData || null,
        voiceMime: mime,
        voiceDuration: voiceDuration != null ? Number(voiceDuration) : null,
      },
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
        await sendPushNotification(admin.id, { title: 'Support Reply', body: `${user.name || user.email} replied to: ${ticket.subject}` }).catch(() => {})
      }
    } catch (e) { /* not critical */ }
    return NextResponse.json({ ok: true, reply })
  } catch (err: any) {
    console.error('Reply error:', err)
    return NextResponse.json({ error: err?.message || 'Failed to reply' }, { status: 500 })
  }
}
