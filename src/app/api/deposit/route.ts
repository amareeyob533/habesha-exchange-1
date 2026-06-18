import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/api'
import { getToken } from '@/lib/tokens'
import { notifyAdminDeposit } from '@/lib/email'
import { signApprovalToken, getBaseUrl } from '@/lib/deposit-approval'

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
        message: `Your deposit of ${amt} ${token} on ${network} is pending admin confirmation. You'll be notified once it's credited.`,
        type: 'info',
      },
    })

    // Build signed one-click approve / reject links and email them to the admin.
    const base = getBaseUrl(req)
    const approveUrl = `${base}/api/deposit/approve?token=${signApprovalToken(deposit.id, 'approve')}`
    const rejectUrl = `${base}/api/deposit/reject?token=${signApprovalToken(deposit.id, 'reject')}`
    await notifyAdminDeposit({ uid: user.uid, amount: amt, token, network, approveUrl, rejectUrl })

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
