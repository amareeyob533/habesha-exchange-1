import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/api'

/**
 * POST /api/card/transfer/wallet { amount }
 * Transfers funds from the user's Habesha Card balance back to their USDT wallet.
 */
export async function POST(req: NextRequest) {
  try {
    const { user, response } = await requireAuth()
    if (!user) return response!

    const { amount } = await req.json()
    const amt = Number(amount)

    if (!amt || amt <= 0) {
      return NextResponse.json({ error: 'Enter a valid amount' }, { status: 400 })
    }

    // Get current card balance with retry
    let fullUser = null
    try {
      fullUser = await db.user.findUnique({ where: { id: user.id }, select: { cardBalance: true } })
    } catch {
      await new Promise((r) => setTimeout(r, 500))
      fullUser = await db.user.findUnique({ where: { id: user.id }, select: { cardBalance: true } })
    }

    if (!fullUser || fullUser.cardBalance < amt) {
      return NextResponse.json({ error: `Insufficient card balance. Available: $${fullUser?.cardBalance || 0}` }, { status: 400 })
    }

    // Transfer: deduct from cardBalance, credit to USDT wallet
    await db.$transaction(async (tx) => {
      // Deduct from card
      await tx.user.update({
        where: { id: user.id },
        data: { cardBalance: { decrement: amt } },
      })
      // Credit to USDT wallet
      const bal = await tx.balance.findUnique({
        where: { userId_token: { userId: user.id, token: 'USDT' } },
      })
      if (bal) {
        await tx.balance.update({
          where: { id: bal.id },
          data: { amount: bal.amount + amt },
        })
      } else {
        await tx.balance.create({ data: { userId: user.id, token: 'USDT', amount: amt } })
      }
      // Record transaction
      await tx.transaction.create({
        data: {
          userId: user.id,
          type: 'card_to_wallet',
          token: 'USDT',
          amount: amt,
          status: 'completed',
          note: 'Transfer from Habesha Card to wallet',
        },
      })
      // Notification
      await tx.notification.create({
        data: {
          userId: user.id,
          title: 'Card to Wallet ✓',
          message: `$${amt} transferred from your Habesha Card to your USDT wallet.`,
          type: 'success',
        },
      })
    }, { timeout: 15000 })

    return NextResponse.json({ ok: true, message: `$${amt} transferred to wallet` })
  } catch (err: any) {
    console.error('card to wallet error:', err)
    return NextResponse.json({ error: err?.message || 'Transfer failed' }, { status: 500 })
  }
}
