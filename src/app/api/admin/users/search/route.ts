import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/api'
import { isAdminEmail } from '@/lib/deposit-actions'

/** GET /api/admin/users/search?q=foo — search by username, uid, or email (admin only) */
export async function GET(req: NextRequest) {
  try {
    const { user, response } = await requireAuth()
    if (!user) return response!
    if (!isAdminEmail(user.email)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }
    const q = (req.nextUrl.searchParams.get('q') || '').trim().toLowerCase()
    if (!q) return NextResponse.json({ users: [] })
    // Search username (contains), uid (exact-ish), email (contains), name (contains)
    const users = await db.user.findMany({
      where: {
        OR: [
          { username: { contains: q } },
          { uid: { contains: q } },
          { email: { contains: q } },
          { name: { contains: q } },
        ],
      },
      select: {
        id: true, uid: true, username: true, email: true, name: true,
        isBlocked: true, createdAt: true,
        avatarUrl: true,
      },
      take: 20,
      orderBy: { createdAt: 'desc' },
    })
    // Attach total balance (USD) per user for the list
    const withTotals = await Promise.all(
      users.map(async (u) => {
        const balances = await db.balance.findMany({ where: { userId: u.id } })
        const totalUsd = balances.reduce((s, b) => s + b.amount, 0) // crude; real USD needs prices, kept simple for list
        return { ...u, totalUsd: totalUsd }
      }),
    )
    return NextResponse.json({ users: withTotals })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed' }, { status: 500 })
  }
}
