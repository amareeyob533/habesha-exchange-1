import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/api'
import { isAdminEmail } from '@/lib/deposit-actions'
import { CURRENT_TOS_VERSION, getTosTextHash } from '@/lib/tos'

/**
 * GET /api/admin/legal/agreements
 *
 * Admin-only. Returns a paginated list of all Terms-of-Service agreement
 * records (the immutable TosAgreement audit log) — the legal proof that
 * each user accepted the ToS + Disclaimer.
 *
 * AUTO-BACKFILL: if there are users in the system who don't have a
 * TosAgreement record (e.g. they signed up before the ToS requirement
 * was added), they are automatically backfilled right here — so the
 * admin always sees a complete list without having to click anything.
 * The backfill uses each user's original signup date as the agreement
 * timestamp and marks the IP as '(pre-ToS-update-backfill)'.
 *
 * Supports `?search=` to filter by email/UID/name, and `?limit=` (max 500).
 *
 * Response also includes `totalUsers` + `usersWithoutAgreement` (before
 * backfill) so the admin can see what was auto-fixed.
 */
export async function GET(req: NextRequest) {
  try {
    const { user, response } = await requireAuth()
    if (!user) return response!
    if (!isAdminEmail(user.email)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // === AUTO-BACKFILL: find users without a TosAgreement record and
    // create one for each (using their original signup date). ===
    const totalUsers = await db.user.count()
    const usersWithAgreement = await db.tosAgreement.findMany({
      select: { userId: true },
      distinct: ['userId'],
    })
    const userIdsWithAgreement = new Set(usersWithAgreement.map((a) => a.userId))

    const usersWithout = await db.user.findMany({
      where: { id: { notIn: Array.from(userIdsWithAgreement) } },
      select: { id: true, uid: true, email: true, name: true, visitorId: true, createdAt: true },
    })

    let backfilledCount = 0
    if (usersWithout.length > 0) {
      const tosTextHash = getTosTextHash(CURRENT_TOS_VERSION)
      const backfilledIp = '(pre-ToS-update-backfill)'

      for (const u of usersWithout) {
        // Set the agreement on the User row
        await db.user.update({
          where: { id: u.id },
          data: {
            agreedToS: true,
            tosVersion: CURRENT_TOS_VERSION,
            tosAgreedAt: u.createdAt,
            tosAgreedIp: backfilledIp,
          },
        })
        // Create the audit-log entry
        await db.tosAgreement.create({
          data: {
            userId: u.id,
            tosVersion: CURRENT_TOS_VERSION,
            agreedAt: u.createdAt,
            ipAddress: backfilledIp,
            userAgent: '(pre-ToS-update-backfill)',
            visitorId: u.visitorId,
            accountEmail: u.email,
            accountUid: u.uid,
            accountName: u.name,
            tosTextHash,
          },
        }).catch(() => {})
        backfilledCount++
      }
    }

    // === Now fetch the (complete) list of agreements ===
    const search = req.nextUrl.searchParams.get('search')?.trim() || ''
    const limit = Math.min(Number(req.nextUrl.searchParams.get('limit') || '200'), 500)

    const where = search
      ? {
          OR: [
            { accountEmail: { contains: search } },
            { accountUid: { contains: search } },
            { accountName: { contains: search } },
          ],
        }
      : {}

    const agreements = await db.tosAgreement.findMany({
      where,
      orderBy: { agreedAt: 'desc' },
      take: limit,
      select: {
        id: true,
        userId: true,
        accountEmail: true,
        accountUid: true,
        accountName: true,
        tosVersion: true,
        agreedAt: true,
        ipAddress: true,
        userAgent: true,
        visitorId: true,
        tosTextHash: true,
      },
    })

    // Summary count grouped by tosVersion
    const allAgreements = await db.tosAgreement.groupBy({
      by: ['tosVersion'],
      _count: { _all: true },
      orderBy: { tosVersion: 'desc' },
    })

    return NextResponse.json({
      agreements,
      count: agreements.length,
      summary: allAgreements.map((s) => ({ tosVersion: s.tosVersion, count: s._count._all })),
      totalUsers,
      autoBackfilled: backfilledCount,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed' }, { status: 500 })
  }
}
