import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/api'
import { isAdminEmail } from '@/lib/deposit-actions'

/** GET /api/admin/cards — list all users with card balance > 0 or KYC approved */
export async function GET() {
  try {
    const { user, response } = await requireAuth()
    if (!user) return response!
    if (!isAdminEmail(user.email)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Find all verified users with their card balances
    const users = await db.user.findMany({
      where: {
        kycStatus: 'approved',
        cardBalance: { gt: 0 },
      },
      select: {
        id: true,
        uid: true,
        email: true,
        username: true,
        name: true,
        kycFullName: true,
        cardBalance: true,
        createdAt: true,
      },
      orderBy: { cardBalance: 'desc' },
    })

    return NextResponse.json({ users, count: users.length })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed' }, { status: 500 })
  }
}
