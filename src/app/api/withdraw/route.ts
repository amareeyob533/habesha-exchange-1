import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/api'
import { getToken, ETB_RATE, BANKS } from '@/lib/tokens'

export async function POST(req: NextRequest) {
  try {
    const { user, response } = await requireAuth()
    if (!user) return response!

    const { token, network, amount, address, bankName, accountName } = await req.json()
    const tk = getToken(token)
    if (!tk) return NextResponse.json({ error: 'Invalid token' }, { status: 400 })
    const amt = Number(amount)
    if (!amt || amt <= 0) return NextResponse.json({ error: 'Enter a valid amount' }, { status: 400 })

    // Habesha token: internal transfers only
    if (tk.internalOnly && network !== 'internal') {
      return NextResponse.json(
        { error: 'Habesha Token can only be transferred internally between Habesha Exchange users.' },
        { status: 400 },
      )
    }

    // Bank withdrawal: token MUST be USDT (users exchange to USDT first), bank must be valid.
    if (network === 'bank') {
      if (token !== 'USDT') {
        return NextResponse.json(
          { error: 'Bank withdrawals require USDT. Use the Exchange to convert your tokens to USDT first.' },
          { status: 400 },
        )
      }
      if (!bankName || !BANKS.some((b) => b.code === bankName)) {
        return NextResponse.json({ error: 'Select a valid bank' }, { status: 400 })
      }
      if (!accountName || !String(accountName).trim()) {
        return NextResponse.json({ error: 'Account holder name is required' }, { status: 400 })
      }
      if (!address || !String(address).trim()) {
        return NextResponse.json({ error: 'Bank account number is required' }, { status: 400 })
      }
    } else {
      // Non-bank: address required (internal UID or external wallet)
      if (!address || !String(address).trim()) {
        return NextResponse.json({ error: 'Recipient is required' }, { status: 400 })
      }
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

    // External + Bank withdrawal: deduct immediately, mark pending (admin approves later).
    await db.$transaction(async (tx) => {
      await tx.balance.update({
        where: { userId_token: { userId: user.id, token } },
        data: { amount: available - amt },
      })
      const withdrawalData: any = {
        userId: user.id,
        token,
        network,
        amount: amt,
        address,
        status: 'pending',
      }
      if (network === 'bank') {
        const birr = amt * ETB_RATE
        withdrawalData.bankName = bankName
        withdrawalData.accountName = accountName.trim()
        withdrawalData.birrAmount = birr
      }
      await tx.withdrawal.create({ data: withdrawalData })
      await tx.notification.create({
        data: {
          userId: user.id,
          title: network === 'bank' ? 'Bank Withdrawal Submitted' : 'Withdrawal Submitted',
          message:
            network === 'bank'
              ? `Your bank withdrawal of ${amt} USDT (≈ ${(amt * ETB_RATE).toLocaleString('en-US')} ETB) to ${bankName} is pending admin approval. You'll be notified once processed.`
              : `Your withdrawal of ${amt} ${token} to ${String(address).slice(0, 12)}... is pending admin approval. You'll be notified once it's processed.`,
          type: 'info',
        },
      })
    })

    return NextResponse.json({ ok: true, mode: network === 'bank' ? 'bank' : 'external' })
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
