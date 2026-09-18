import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/api'
import { isAdminEmail } from '@/lib/deposit-actions'

/**
 * GET /api/admin/legal/agreements
 *
 * Admin-only. Returns a paginated list of all Terms-of-Service agreement
 * records (the immutable TosAgreement audit log) — the legal proof that
 * each user accepted the ToS + Disclaimer.
 *
 * Supports `?search=` to filter by email/UID/name, and `?limit=` (max 500).
 *
 * Each record includes: accountEmail, accountUid, accountName, tosVersion,
 * agreedAt (UTC ISO), ipAddress, userAgent, visitorId, tosTextHash.
 */
export async function GET(req: NextRequest) {
  try {
    const { user, response } = await requireAuth()
    if (!user) return response!
    if (!isAdminEmail(user.email)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

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

    // Also get a summary count grouped by tosVersion
    const allAgreements = await db.tosAgreement.groupBy({
      by: ['tosVersion'],
      _count: { _all: true },
      orderBy: { tosVersion: 'desc' },
    })

    return NextResponse.json({
      agreements,
      count: agreements.length,
      summary: allAgreements.map((s) => ({ tosVersion: s.tosVersion, count: s._count._all })),
    })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed' }, { status: 500 })
  }
}
