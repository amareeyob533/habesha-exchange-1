import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/api'
import { isAdminEmail } from '@/lib/deposit-actions'

/**
 * GET /api/admin/users/devices?userId=...
 *
 * Admin-only. Returns whether the given user's device is currently banned,
 * plus the ban record (reason, date) if so. Used by the admin user profile
 * drawer to render the Ban Device / Un-ban Device button state.
 */
export async function GET(req: NextRequest) {
  try {
    const { user, response } = await requireAuth()
    if (!user) return response!
    if (!isAdminEmail(user.email)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }
    const userId = req.nextUrl.searchParams.get('userId')
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

    const target = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, visitorId: true },
    })
    if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    if (!target.visitorId) {
      return NextResponse.json({ visitorId: null, banned: false, banRecord: null })
    }

    const banRecord = await db.bannedDevice.findUnique({
      where: { visitorId: target.visitorId },
      select: { id: true, visitorId: true, reason: true, createdAt: true, userId: true },
    })

    return NextResponse.json({
      visitorId: target.visitorId,
      banned: !!banRecord,
      banRecord,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed' }, { status: 500 })
  }
}
