import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/api'
import { isAdminEmail } from '@/lib/deposit-actions'

/** POST /api/admin/users/unblock { userId } — admin only */
export async function POST(req: NextRequest) {
  try {
    const { user, response } = await requireAuth()
    if (!user) return response!
    if (!isAdminEmail(user.email)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }
    const { userId } = await req.json()
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

    await db.user.update({ where: { id: userId }, data: { isBlocked: false, blockedReason: null } })
    await db.notification.create({
      data: {
        userId,
        title: 'Account Unblocked',
        message: 'Your account has been restored. You can now sign in and use Habesha Exchange normally.',
        type: 'success',
      },
    })
    return NextResponse.json({ ok: true, message: 'User unblocked.' })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed' }, { status: 500 })
  }
}
