import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/api'

export async function POST(req: NextRequest) {
  try {
    const { user, response } = await requireAuth()
    if (!user) return response!
    const { subject, message } = await req.json()
    if (!subject?.trim() || !message?.trim()) {
      return NextResponse.json({ error: 'Subject and message are required' }, { status: 400 })
    }
    await db.supportMessage.create({
      data: { userId: user.id, subject: subject.trim(), message: message.trim(), status: 'open' },
    })
    await db.notification.create({
      data: {
        userId: user.id,
        title: 'Support Ticket Received',
        message: 'We received your message. For urgent matters, contact us on WhatsApp.',
        type: 'info',
      },
    })
    return NextResponse.json({
      ok: true,
      whatsapp: process.env.NEXT_PUBLIC_WHATSAPP || '+251900000000',
    })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message }, { status: 500 })
  }
}

export async function GET() {
  try {
    const { user, response } = await requireAuth()
    if (!user) return response!
    const messages = await db.supportMessage.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({ messages })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message }, { status: 500 })
  }
}
