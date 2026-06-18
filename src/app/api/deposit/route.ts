import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/api'
import { getToken } from '@/lib/tokens'
import { notifyAdminDeposit } from '@/lib/email'

export async function POST(req: NextRequest) {
  try {
    const { user, response } = await requireAuth()
    if (!user) return response!

    const { token, network, amount } = await req.json()
    const tk = getToken(token)
    if (!tk) return NextResponse.json({ error: 'Invalid token' }, { status: 400 })
    if (tk.internalOnly) {
      return NextResponse.json({ error: 'This token cannot be deposited externally' }, { status: 400 })
    }
    const net = tk.networks.find((n) => n.name === network)
    if (!net) return NextResponse.json({ error: 'Invalid network' }, { status: 400 })
    const amt = Number(amount)
    if (!amt || amt <= 0) {
      return NextResponse.json({ error: 'Enter a valid amount' }, { status: 400 })
    }

    const deposit = await db.deposit.create({
      data: { userId: user.id, token, network, amount: amt, status: 'pending' },
    })
    await db.notification.create({
      data: {
        userId: user.id,
        title: 'Deposit Submitted',
        message: `Your deposit of ${amt} ${token} on ${network} is pending confirmation.`,
        type: 'info',
      },
    })

    // Email admin
    await notifyAdminDeposit({ uid: user.uid, amount: amt, token, network })

    return NextResponse.json({ ok: true, deposit })
  } catch (err: any) {
    console.error('deposit error:', err)
    return NextResponse.json({ error: err?.message || 'Deposit failed' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const { user, response } = await requireAuth()
    if (!user) return response!
    const deposits = await db.deposit.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({ deposits })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message }, { status: 500 })
  }
}
