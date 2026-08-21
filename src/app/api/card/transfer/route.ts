import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/api'

/**
 * POST /api/card/transfer { token, amount }
 * Transfers funds from the user's token wallet balance to their Habesha Card balance.
 * - Deducts from the token balance (USDT only)
 * - Credits to cardBalance
 * - Creates a transaction record
 */
export async function POST(req: NextRequest) {
  try {
    const { user, response } = await requireAuth()
    if (!user) return response!

    const { token, amount } = await req.json()
    const amt = Number(amount)

    if (!token || !amt || amt <= 0) {
      return NextResponse.json({ error: 'Enter a valid amount' }, { status: 400 })
    }
    if (token !== 'USDT') {
      return NextResponse.json({ error: 'Only USDT can be transferred to the card' }, { status: 400 })
    }

    // Get current USDT balance with retry
    let bal = null
    try {
      bal = await db.balance.findUnique({
        where: { userId_token: { userId: user.id, token: 'USDT' } },
      })
    } catch {
      await new Promise((r) => setTimeout(r, 500))
      bal = await db.balance.findUnique({
        where: { userId_token: { userId: user.id, token: 'USDT' } },
      })
    }

    if (!bal || bal.amount < amt) {
      return NextResponse.json({ error: `Insufficient USDT balance. You have ${bal?.amount || 0} USDT.` }, { status: 400 })
    }

    // Transfer: deduct from wallet, credit to cardBalance
    await db.$transaction(async (tx) => {
      // Deduct from USDT wallet
      await tx.balance.update({
        where: { id: bal.id },
        data: { amount: bal.amount - amt },
      })
      // Credit to cardBalance
      await db.user.update({
        where: { id: user.id },
        data: { cardBalance: { increment: amt } },
      })
      // Record transaction
      await tx.transaction.create({
        data: {
          userId: user.id,
          type: 'card_transfer',
          token: 'USDT',
          amount: amt,
          status: 'completed',
          note: 'Transfer to Habesha Card',
        },
      })
      // Notification
      await tx.notification.create({
        data: {
          userId: user.id,
          title: 'Card Top-Up ✓',
          message: `${amt} USDT transferred to your Habesha Card. New card balance: $${(user.cardBalance || 0 + amt).toFixed(2)}`,
          type: 'success',
        },
      })
    }, { timeout: 15000 })

    return NextResponse.json({ ok: true, message: `${amt} USDT transferred to your Habesha Card` })
  } catch (err: any) {
    console.error('card transfer error:', err)
    return NextResponse.json({ error: err?.message || 'Transfer failed' }, { status: 500 })
  }
}
