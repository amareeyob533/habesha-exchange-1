import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/api'

export async function GET() {
  try {
    const { user, response } = await requireAuth()
    if (!user) return response!
    const transactions = await db.transaction.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })
    const transfers = await db.transfer.findMany({
      where: { OR: [{ fromUserId: user.id }, { toUserId: user.id }] },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { fromUser: { select: { uid: true, name: true } }, toUser: { select: { uid: true, name: true } } },
    })
    return NextResponse.json({ transactions, transfers })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message }, { status: 500 })
  }
}
