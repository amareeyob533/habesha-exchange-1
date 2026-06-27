import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { TOKENS } from '@/lib/tokens'

export async function GET() {
  try {
    const sessionUser = await getCurrentUser()
    if (!sessionUser) {
      return NextResponse.json({ user: null }, { status: 200 })
    }

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

    // Blocked accounts: return a blocked flag so the client can sign them out.
    if (user.isBlocked) {
      return NextResponse.json({
        user: null,
        blocked: true,
        blockedReason: user.blockedReason || 'Your account has been blocked. Contact support.',
      })
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
        iconUrl: t.iconUrl || null,
      }
    })
    const totalUsd = balances.reduce((s, b) => s + b.usdValue, 0)

    return NextResponse.json({
      user: {
        id: user.id,
        uid: user.uid,
        email: user.email,
        username: user.username,
        name: user.name,
        avatarUrl: user.avatarUrl,
        provider: user.provider,
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
