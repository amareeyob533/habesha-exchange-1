import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/api'

/** POST /api/push/unsubscribe { endpoint } — removes a push subscription. */
export async function POST(req: NextRequest) {
  try {
    const { user, response } = await requireAuth()
    if (!user) return response!

    const { endpoint } = await req.json()
    if (!endpoint) return NextResponse.json({ error: 'endpoint required' }, { status: 400 })

    await db.pushSubscription.deleteMany({ where: { endpoint, userId: user.id } })
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed' }, { status: 500 })
  }
}
