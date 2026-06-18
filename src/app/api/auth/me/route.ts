import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { processAutoApprovals } from '@/lib/auto-approve'
import { TOKENS } from '@/lib/tokens'

export async function GET() {
  try {
    const sessionUser = await getCurrentUser()
    if (!sessionUser) {
      return NextResponse.json({ user: null }, { status: 200 })
    }
    await processAutoApprovals(sessionUser.id)

    const user = await db.user.findUnique({
      where: { id: sessionUser.id },
      include: {
        balances: true,
        notifications: { orderBy: { createdAt: 'desc' }, take: 20 },
      },
    })
    if (!user) {
      return NextResponse.json({ user: null }, { status: 200 })
    }

    // Build balances with USD value
    const balances = TOKENS.map((t) => {
      const bal = user.balances.find((b) => b.token === t.symbol)
      const amount = bal?.amount ?? 0
      return {
        symbol: t.symbol,
        name: t.name,
        amount,
        usdValue: amount * t.price,
        price: t.price,
        color: t.color,
        icon: t.icon,
      }
    })
    const totalUsd = balances.reduce((s, b) => s + b.usdValue, 0)

    return NextResponse.json({
      user: {
        id: user.id,
        uid: user.uid,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
        provider: user.provider,
        kycStatus: user.kycStatus,
        kycLevel: user.kycLevel,
        country: user.country,
        phone: user.phone,
        createdAt: user.createdAt,
      },
      balances,
      totalUsd,
      notifications: user.notifications,
    })
  } catch (err: any) {
    console.error('me error:', err)
    return NextResponse.json({ error: err?.message || 'Failed' }, { status: 500 })
  }
}
