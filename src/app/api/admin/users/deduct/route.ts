import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/api'
import { isAdminEmail } from '@/lib/deposit-actions'
import { sendPushNotification } from '@/lib/push'

/**
 * POST /api/admin/users/deduct { userId, token, amount, note }
 *
 * Admin deducts (removes) funds from a user's balance.
 * - Deducts from the specified token balance
 * - Creates a 'deduction' transaction record
 * - Sends a notification to the user
 * - Sends a push notification to the user's phone
 * - Does NOT affect pending deposits/withdrawals/buys (completely separate)
 */
export async function POST(req: NextRequest) {
  try {
    const { user, response } = await requireAuth()
    if (!user) return response!
    if (!isAdminEmail(user.email)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { userId, token, amount, note } = await req.json()
    const amt = Number(amount)

    if (!userId || !token || !amt || amt <= 0) {
      return NextResponse.json({ error: 'userId, token, and a valid amount are required' }, { status: 400 })
    }

    // Get current balance with retry
    let bal = null
    try {
      bal = await db.balance.findUnique({
        where: { userId_token: { userId, token } },
      })
    } catch {
      await new Promise((r) => setTimeout(r, 500))
      bal = await db.balance.findUnique({
        where: { userId_token: { userId, token } },
      })
    }

    if (!bal || bal.amount < amt) {
      return NextResponse.json({
        error: `Insufficient balance. User has ${bal?.amount || 0} ${token}, tried to deduct ${amt}.`
      }, { status: 400 })
    }

    // Deduct the amount + create transaction + notify (all in one transaction)
    await db.$transaction(async (tx) => {
      await tx.balance.update({
        where: { id: bal.id },
        data: { amount: bal.amount - amt },
      })
      await tx.transaction.create({
        data: {
          userId,
          type: 'deduction',
          token,
          amount: amt,
          status: 'completed',
          note: note?.trim() || 'Admin deduction',
        },
      })
      await tx.notification.create({
        data: {
          userId,
          title: '⚠️ Balance Deducted',
          message: `${amt} ${token} has been deducted from your account.${note ? ` Reason: ${note}` : ''}`,
          type: 'warning',
        },
      })
    }, { timeout: 15000 })

    // Push notification AFTER transaction commits (never inside — prevents timeout)
    await sendPushNotification(userId, {
      title: '⚠️ Balance Deducted',
      body: `${amt} ${token} deducted from your account.${note ? ` Reason: ${note}` : ''}`,
    }).catch(() => {})

    return NextResponse.json({ ok: true, message: `${amt} ${token} deducted from user. New balance: ${bal.amount - amt} ${token}` })
  } catch (err: any) {
    console.error('deduct error:', err)
    return NextResponse.json({ error: err?.message || 'Deduction failed' }, { status: 500 })
  }
}
