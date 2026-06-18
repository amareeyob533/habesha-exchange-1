import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/api'
import { getToken } from '@/lib/tokens'

/**
 * Swap (exchange) one token for another at the current fixed prices.
 * POST /api/swap { fromToken, toToken, amount }
 * Deducts `amount` of fromToken, credits the USD-equivalent of toToken.
 */
export async function POST(req: NextRequest) {
  try {
    const { user, response } = await requireAuth()
    if (!user) return response!

    const { fromToken, toToken, amount } = await req.json()
    if (!fromToken || !toToken) {
      return NextResponse.json({ error: 'fromToken and toToken are required' }, { status: 400 })
    }
    if (fromToken === toToken) {
      return NextResponse.json({ error: 'Cannot swap a token for itself' }, { status: 400 })
    }
    const from = getToken(fromToken)
    const to = getToken(toToken)
    if (!from || !to) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 400 })
    }
    // Habesha Token is NOT publicly listed yet, so it can only be RECEIVED
    // (swapped TO), never swapped FROM into other tokens.
    if (from.internalOnly) {
      return NextResponse.json(
        {
          error:
            'Habesha Token is not listed yet and cannot be exchanged into other tokens. You can only receive HABESHA (by swapping other tokens into it) or transfer it internally between Habesha Exchange users.',
        },
        { status: 400 },
      )
    }
    const amt = Number(amount)
    if (!amt || amt <= 0) {
      return NextResponse.json({ error: 'Enter a valid amount' }, { status: 400 })
    }

    // Check balance
    const bal = await db.balance.findUnique({
      where: { userId_token: { userId: user.id, token: fromToken } },
    })
    const available = bal?.amount ?? 0
    if (amt > available) {
      return NextResponse.json({ error: `Insufficient ${fromToken} balance` }, { status: 400 })
    }

    // Compute USD value, then convert to target token at its price.
    const usdValue = amt * from.price
    const received = to.price > 0 ? usdValue / to.price : 0

    await db.$transaction(async (tx) => {
      // Debit source
      await tx.balance.update({
        where: { userId_token: { userId: user.id, token: fromToken } },
        data: { amount: available - amt },
      })
      // Credit target
      const toBal = await tx.balance.findUnique({
        where: { userId_token: { userId: user.id, token: toToken } },
      })
      if (toBal) {
        await tx.balance.update({
          where: { id: toBal.id },
          data: { amount: toBal.amount + received },
        })
      } else {
        await tx.balance.create({ data: { userId: user.id, token: toToken, amount: received } })
      }
      // Records (swap out + swap in)
      await tx.transaction.create({
        data: {
          userId: user.id,
          type: 'swap_out',
          token: fromToken,
          amount: amt,
          status: 'completed',
          note: `Swapped to ${toToken}`,
        },
      })
      await tx.transaction.create({
        data: {
          userId: user.id,
          type: 'swap_in',
          token: toToken,
          amount: received,
          status: 'completed',
          note: `Swapped from ${fromToken}`,
        },
      })
      await tx.notification.create({
        data: {
          userId: user.id,
          title: 'Exchange Complete',
          message: `You swapped ${amt} ${fromToken} for ${received.toFixed(6)} ${toToken} (≈ $${usdValue.toFixed(2)}).`,
          type: 'success',
        },
      })
    })

    return NextResponse.json({
      ok: true,
      from: { token: fromToken, amount: amt },
      to: { token: toToken, amount: received },
      usdValue,
    })
  } catch (err: any) {
    console.error('swap error:', err)
    return NextResponse.json({ error: err?.message || 'Swap failed' }, { status: 500 })
  }
}
