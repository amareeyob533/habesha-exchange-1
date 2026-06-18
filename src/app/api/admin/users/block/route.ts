import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/api'
import { isAdminEmail } from '@/lib/deposit-actions'

/** POST /api/admin/users/block { userId, reason? } — admin only */
export async function POST(req: NextRequest) {
  try {
    const { user, response } = await requireAuth()
    if (!user) return response!
    if (!isAdminEmail(user.email)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }
    const { userId, reason } = await req.json()
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })
    if (userId === user.id) return NextResponse.json({ error: 'You cannot block your own admin account' }, { status: 400 })

    await db.user.update({ where: { id: userId }, data: { isBlocked: true, blockedReason: reason || null } })
    await db.notification.create({
      data: {
        userId,
        title: 'Account Blocked',
        message: reason ? `Your account has been blocked. Reason: ${reason}` : 'Your account has been blocked. Contact support for assistance.',
        type: 'warning',
      },
    })
    return NextResponse.json({ ok: true, message: 'User blocked. They will be signed out on next action.' })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed' }, { status: 500 })
  }
}
