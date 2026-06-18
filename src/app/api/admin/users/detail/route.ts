import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/api'
import { isAdminEmail } from '@/lib/deposit-actions'
import { TOKENS } from '@/lib/tokens'

/** GET /api/admin/users/detail?userId=... — full user detail incl. KYC media + balances (admin only) */
export async function GET(req: NextRequest) {
  try {
    const { user, response } = await requireAuth()
    if (!user) return response!
    if (!isAdminEmail(user.email)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }
    const userId = req.nextUrl.searchParams.get('userId')
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

    const u = await db.user.findUnique({
      where: { id: userId },
      include: {
        balances: true,
        transactions: { orderBy: { createdAt: 'desc' }, take: 20 },
      },
    })
    if (!u) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const balances = TOKENS.map((t) => {
      const bal = u.balances.find((b) => b.token === t.symbol)
      const amount = bal?.amount ?? 0
      return { symbol: t.symbol, name: t.name, amount, usdValue: amount * t.price, price: t.price, color: t.color, icon: t.icon }
    })
    const totalUsd = balances.reduce((s, b) => s + b.usdValue, 0)

    return NextResponse.json({
      user: {
        id: u.id,
        uid: u.uid,
        username: u.username,
        email: u.email,
        name: u.name,
        avatarUrl: u.avatarUrl,
        isBlocked: u.isBlocked,
        blockedReason: u.blockedReason,
        provider: u.provider,
        country: u.country,
        phone: u.phone,
        createdAt: u.createdAt,
        kycStatus: u.kycStatus,
        kycLevel: u.kycLevel,
        kycRequestedLevel: u.kycRequestedLevel,
        kycSubmittedAt: u.kycSubmittedAt,
        kycDocUrl: u.kycDocUrl,
        kycSelfieUrl: u.kycSelfieUrl,
        kycSelfieVideoUrl: u.kycSelfieVideoUrl,
      },
      balances,
      totalUsd,
      transactions: u.transactions,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed' }, { status: 500 })
  }
}
