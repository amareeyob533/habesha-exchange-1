import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/api'
import { isAdminEmail } from '@/lib/deposit-actions'

/** GET /api/admin/support?status=open|resolved|all — admin lists all tickets */
export async function GET(req: NextRequest) {
  try {
    const { user, response } = await requireAuth()
    if (!user) return response!
    if (!isAdminEmail(user.email)) return NextResponse.json({ error: 'Admin only' }, { status: 403 })
    const status = req.nextUrl.searchParams.get('status') || 'open'
    const where = status === 'all' ? {} : { status }
    const tickets = await db.supportMessage.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { uid: true, email: true, username: true, name: true } },
        replies: { orderBy: { createdAt: 'asc' } },
      },
    })
    return NextResponse.json({ tickets, count: tickets.length })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message }, { status: 500 })
  }
}
