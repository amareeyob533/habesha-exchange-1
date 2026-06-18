import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/api'
import { getToken } from '@/lib/tokens'

export async function POST(req: NextRequest) {
  try {
    const { user, response } = await requireAuth()
    if (!user) return response!

    const { token, network, amount, address } = await req.json()
    const tk = getToken(token)
    if (!tk) return NextResponse.json({ error: 'Invalid token' }, { status: 400 })
    const amt = Number(amount)
    if (!amt || amt <= 0) return NextResponse.json({ error: 'Enter a valid amount' }, { status: 400 })
    if (!address || !String(address).trim()) {
      return NextResponse.json({ error: 'Recipient is required' }, { status: 400 })
    }

    // Habesha token: internal transfers only
    if (tk.internalOnly && network !== 'internal') {
      return NextResponse.json(
        { error: 'Habesha Token can only be transferred internally between Habesha Exchange users.' },
        { status: 400 },
      )
    }

    // Check balance
    const bal = await db.balance.findUnique({
      where: { userId_token: { userId: user.id, token } },
    })
    const available = bal?.amount ?? 0
    if (amt > available) {
      return NextResponse.json({ error: `Insufficient ${token} balance` }, { status: 400 })
    }

    if (network === 'internal') {
      // address is the target 6-digit UID
      const targetUid = String(address).trim()
      if (targetUid === user.uid) {
        return NextResponse.json({ error: 'You cannot transfer to your own UID' }, { status: 400 })
      }
      const recipient = await db.user.findUnique({ where: { uid: targetUid } })
      if (!recipient) {
        return NextResponse.json({ error: `No user found with UID ${targetUid}` }, { status: 404 })
      }

      await db.$transaction(async (tx) => {
        // debit sender
        await tx.balance.update({
          where: { userId_token: { userId: user.id, token } },
          data: { amount: available - amt },
        })
        // credit recipient
        const recBal = await tx.balance.findUnique({
          where: { userId_token: { userId: recipient.id, token } },
        })
        if (recBal) {
          await tx.balance.update({
            where: { id: recBal.id },
            data: { amount: recBal.amount + amt },
          })
        } else {
          await tx.balance.create({ data: { userId: recipient.id, token, amount: amt } })
        }
        // records
        await tx.transfer.create({
          data: { fromUserId: user.id, toUserId: recipient.id, token, amount: amt, status: 'completed' },
        })
        await tx.transaction.create({
          data: {
            userId: user.id,
            type: 'transfer_out',
            token,
            amount: amt,
            status: 'completed',
            counterpartyUid: targetUid,
            network: 'internal',
            note: `Internal transfer to UID ${targetUid}`,
          },
        })
        await tx.transaction.create({
          data: {
            userId: recipient.id,
            type: 'transfer_in',
            token,
            amount: amt,
            status: 'completed',
            counterpartyUid: user.uid,
            network: 'internal',
            note: `Internal transfer from UID ${user.uid}`,
          },
        })
        await tx.notification.create({
          data: {
            userId: user.id,
            title: 'Transfer Sent',
            message: `${amt} ${token} sent to UID ${targetUid}.`,
            type: 'success',
          },
        })
        await tx.notification.create({
          data: {
            userId: recipient.id,
            title: 'Transfer Received',
            message: `You received ${amt} ${token} from UID ${user.uid}.`,
            type: 'success',
          },
        })
      })

      return NextResponse.json({ ok: true, mode: 'internal' })
    }

    // External withdrawal: deduct immediately, mark pending, auto-complete later
    await db.$transaction(async (tx) => {
      await tx.balance.update({
        where: { userId_token: { userId: user.id, token } },
        data: { amount: available - amt },
      })
      await tx.withdrawal.create({
        data: { userId: user.id, token, network, amount: amt, address, status: 'pending' },
      })
      await tx.notification.create({
        data: {
          userId: user.id,
          title: 'Withdrawal Submitted',
          message: `Your withdrawal of ${amt} ${token} to ${String(address).slice(0, 12)}... is processing.`,
          type: 'info',
        },
      })
    })

    return NextResponse.json({ ok: true, mode: 'external' })
  } catch (err: any) {
    console.error('withdraw error:', err)
    return NextResponse.json({ error: err?.message || 'Withdrawal failed' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const { user, response } = await requireAuth()
    if (!user) return response!
    const withdrawals = await db.withdrawal.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({ withdrawals })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message }, { status: 500 })
  }
}
