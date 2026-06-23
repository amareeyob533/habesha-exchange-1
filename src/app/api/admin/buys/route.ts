import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/api'
import { isAdminEmail } from '@/lib/deposit-actions'

/** GET /api/admin/buys?status=pending|approved|rejected|all — admin only */
export async function GET(req: NextRequest) {
  try {
    const { user, response } = await requireAuth()
    if (!user) return response!
    if (!isAdminEmail(user.email)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }
    const status = req.nextUrl.searchParams.get('status') || 'pending'
    const where = status === 'all' ? {} : { status }
    const orders = await db.buyOrder.findMany({
      where,
      include: { user: { select: { id: true, uid: true, email: true, username: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({ orders, count: orders.length })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed' }, { status: 500 })
  }
}
