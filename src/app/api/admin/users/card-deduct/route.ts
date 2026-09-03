import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/api'
import { isAdminEmail } from '@/lib/deposit-actions'
import { sendPushNotification } from '@/lib/push'

/**
 * POST /api/admin/users/card-deduct { userId, amount, note }
 * Admin deducts funds from a user's Habesha Card balance.
 */
export async function POST(req: NextRequest) {
  try {
    const { user, response } = await requireAuth()
    if (!user) return response!
    if (!isAdminEmail(user.email)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { userId, amount, note } = await req.json()
    const amt = Number(amount)

    if (!userId || !amt || amt <= 0) {
      return NextResponse.json({ error: 'userId and valid amount required' }, { status: 400 })
    }

    // Get current card balance
    let fullUser = null
    try {
      fullUser = await db.user.findUnique({ where: { id: userId }, select: { cardBalance: true, kycFullName: true } })
    } catch {
      await new Promise((r) => setTimeout(r, 500))
      fullUser = await db.user.findUnique({ where: { id: userId }, select: { cardBalance: true, kycFullName: true } })
    }

    if (!fullUser || fullUser.cardBalance < amt) {
      return NextResponse.json({
        error: `Insufficient card balance. Card has $${fullUser?.cardBalance || 0}, tried to deduct $${amt}.`
      }, { status: 400 })
    }

    await db.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { cardBalance: { decrement: amt } },
      })
      await tx.transaction.create({
        data: {
          userId,
          type: 'card_deduction',
          token: 'USDT',
          amount: amt,
          status: 'completed',
          note: note?.trim() || 'Admin card deduction',
        },
      })
      await tx.notification.create({
        data: {
          userId,
          title: '⚠️ Card Balance Deducted',
          message: `$${amt} has been deducted from your Habesha Card.${note ? ` Reason: ${note}` : ''}`,
          type: 'warning',
        },
      })
    }, { timeout: 15000 })

    await sendPushNotification(userId, {
      title: '⚠️ Card Balance Deducted',
      body: `$${amt} deducted from your Habesha Card.${note ? ` Reason: ${note}` : ''}`,
    }).catch(() => {})

    return NextResponse.json({ ok: true, message: `$${amt} deducted from card. New card balance: $${fullUser.cardBalance - amt}` })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed' }, { status: 500 })
  }
}
