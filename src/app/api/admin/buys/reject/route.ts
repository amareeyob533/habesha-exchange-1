import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/api'
import { isAdminEmail } from '@/lib/deposit-actions'
import { sendPushNotification } from '@/lib/push'

/** POST /api/admin/buys/reject { orderId } — admin rejects a buy order */
export async function POST(req: NextRequest) {
  try {
    const { user, response } = await requireAuth()
    if (!user) return response!
    if (!isAdminEmail(user.email)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }
    const { orderId } = await req.json()
    if (!orderId) return NextResponse.json({ error: 'orderId required' }, { status: 400 })

    const order = await db.buyOrder.findUnique({ where: { id: orderId } })
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    if (order.status === 'rejected') return NextResponse.json({ ok: true, message: 'Already rejected.' })
    if (order.status === 'approved') return NextResponse.json({ error: 'Order was already approved.' }, { status: 400 })

    await db.$transaction(async (tx) => {
      await tx.buyOrder.update({ where: { id: order.id }, data: { status: 'rejected', screenshotUrl: null } })
      await tx.notification.create({
        data: {
          userId: order.userId,
          title: 'Buy Order Rejected',
          message: `Your buy order for ${order.usdtAmount} USDT was rejected. If you believe this is an error, please contact support.`,
          type: 'warning',
        },
      })
      await sendPushNotification(order.userId, { title: 'Buy Order Rejected', body: `Your buy order for ${order.usdtAmount} USDT was rejected. If you believe this is an error, please contact support.` }).catch(() => {})
    })

    // AUTO-DELETE: Remove the payment screenshot from the database so it
    // doesn't fill up storage. The order record (text only) is kept for history.
    try {
      await db.paymentProof.deleteMany({ where: { userId: order.userId } })
    } catch {
      // best-effort delete
    }

    return NextResponse.json({ ok: true, message: 'Buy order rejected. User notified.' })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed' }, { status: 500 })
  }
}
