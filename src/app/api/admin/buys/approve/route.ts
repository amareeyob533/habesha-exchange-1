import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/api'
import { isAdminEmail } from '@/lib/deposit-actions'

/** POST /api/admin/buys/approve { orderId } — admin credits USDT to the buyer */
export async function POST(req: NextRequest) {
  try {
    const { user, response } = await requireAuth()
    if (!user) return response!
    if (!isAdminEmail(user.email)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }
    const { orderId } = await req.json()
    if (!orderId) return NextResponse.json({ error: 'orderId required' }, { status: 400 })

    const order = await db.buyOrder.findUnique({ where: { id: orderId }, include: { user: true } })
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    if (order.status === 'approved') return NextResponse.json({ ok: true, message: 'Already approved.' })
    if (order.status === 'rejected') return NextResponse.json({ error: 'Order was rejected.' }, { status: 400 })

    await db.$transaction(async (tx) => {
      await tx.buyOrder.update({ where: { id: order.id }, data: { status: 'approved', screenshotUrl: null } })
      // Credit USDT to the buyer
      const bal = await tx.balance.findUnique({ where: { userId_token: { userId: order.userId, token: 'USDT' } } })
      if (bal) {
        await tx.balance.update({ where: { id: bal.id }, data: { amount: bal.amount + order.usdtAmount } })
      } else {
        await tx.balance.create({ data: { userId: order.userId, token: 'USDT', amount: order.usdtAmount } })
      }
      await tx.transaction.create({
        data: {
          userId: order.userId,
          type: 'buy',
          token: 'USDT',
          amount: order.usdtAmount,
          status: 'completed',
          note: `Buy order approved — ${order.birrAmount} ETB via ${order.bank}`,
        },
      })
      await tx.notification.create({
        data: {
          userId: order.userId,
          title: 'Buy Order Approved ✓',
          message: `Your buy order for ${order.usdtAmount} USDT has been approved. The USDT is now in your wallet.`,
          type: 'success',
        },
      })
    })

    // AUTO-DELETE: Remove the payment screenshot from the database so it
    // doesn't fill up storage. The order record (text only) is kept for history.
    try {
      await db.paymentProof.deleteMany({ where: { userId: order.userId } })
    } catch {
      // best-effort delete
    }

    return NextResponse.json({ ok: true, message: `Approved. ${order.usdtAmount} USDT credited to user.` })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed' }, { status: 500 })
  }
}
