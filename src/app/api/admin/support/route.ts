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
    try {
      const tickets = await db.supportMessage.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { uid: true, email: true, username: true, name: true } },
          replies: { orderBy: { createdAt: 'asc' } },
        },
      })
      return NextResponse.json({ tickets, count: tickets.length })
    } catch (dbErr: any) {
      console.error('Admin support DB error:', dbErr?.message)
      if (dbErr?.message?.includes('does not exist') || dbErr?.code === 'P2021') {
        return NextResponse.json({ tickets: [], count: 0 })
      }
      throw dbErr
    }
  } catch (err: any) {
    console.error('Admin support error:', err)
    return NextResponse.json({ tickets: [], count: 0, error: err?.message }, { status: 500 })
  }
}
