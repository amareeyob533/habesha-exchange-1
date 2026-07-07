import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/api'
import { isAdminEmail } from '@/lib/deposit-actions'
import { getToken } from '@/lib/tokens'
import { sendPushNotification } from '@/lib/push'

/** POST /api/admin/users/reward { userId, token, amount, note? } — admin credits a token to a user */
export async function POST(req: NextRequest) {
  try {
    const { user, response } = await requireAuth()
    if (!user) return response!
    if (!isAdminEmail(user.email)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }
    const { userId, token, amount, note } = await req.json()
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })
    const tk = getToken(token)
    if (!tk) return NextResponse.json({ error: 'Invalid token' }, { status: 400 })
    const amt = Number(amount)
    if (!amt || amt <= 0) return NextResponse.json({ error: 'Enter a valid amount' }, { status: 400 })

    const target = await db.user.findUnique({ where: { id: userId }, select: { id: true, uid: true } })
    if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    await db.$transaction(async (tx) => {
      const bal = await tx.balance.findUnique({ where: { userId_token: { userId, token } } })
      if (bal) {
        await tx.balance.update({ where: { id: bal.id }, data: { amount: bal.amount + amt } })
      } else {
        await tx.balance.create({ data: { userId, token, amount: amt } })
      }
      await tx.transaction.create({
        data: {
          userId,
          type: 'reward',
          token,
          amount: amt,
          status: 'completed',
          note: note?.trim() || 'Admin reward',
        },
      })
      await tx.notification.create({
        data: {
          userId,
          title: '🎁 You received a reward!',
          message: `The admin has credited your account with ${amt} ${token}.${note ? ` Note: ${note}` : ''}`,
          type: 'success',
        },
      })
    }, { timeout: 15000 })

    // Push notification AFTER the transaction commits.
    await sendPushNotification(userId, { title: '🎁 You received a reward!', body: `The admin has credited your account with ${amt} ${token}.${note ? ` Note: ${note}` : ''}` }).catch(() => {})

    return NextResponse.json({ ok: true, message: `Rewarded ${amt} ${token} to user.` })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed' }, { status: 500 })
  }
}
