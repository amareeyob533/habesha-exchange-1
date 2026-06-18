import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/api'
import { isAdminEmail } from '@/lib/deposit-actions'

/** POST /api/admin/users/delete { userId } — admin only. Permanently deletes a user + all related data. */
export async function POST(req: NextRequest) {
  try {
    const { user, response } = await requireAuth()
    if (!user) return response!
    if (!isAdminEmail(user.email)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }
    const { userId } = await req.json()
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })
    if (userId === user.id) return NextResponse.json({ error: 'You cannot delete your own admin account' }, { status: 400 })

    const target = await db.user.findUnique({ where: { id: userId }, select: { username: true, email: true } })
    if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    // Cascade deletes handle balances, transactions, deposits, withdrawals, transfers, notifications, supportMessages.
    await db.user.delete({ where: { id: userId } })
    return NextResponse.json({ ok: true, message: `User @${target.username || target.email} permanently deleted.` })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed' }, { status: 500 })
  }
}
