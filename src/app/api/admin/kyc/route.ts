import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/api'
import { isAdminEmail } from '@/lib/deposit-actions'
import { cleanupExpiredKyc, KYC_RETENTION_DAYS } from '@/lib/kyc-helpers'

/**
 * GET /api/admin/kyc?status=pending|approved|rejected|all
 *
 * Returns KYC applications for the admin to review. Each item includes the
 * user info and a `documentId` the admin can use to view/download the ID photo
 * via /api/kyc/document?id=...&download=true.
 */
export async function GET(req: NextRequest) {
  try {
    const { user, response } = await requireAuth()
    if (!user) return response!
    if (!isAdminEmail(user.email)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }
    await cleanupExpiredKyc()

    const status = req.nextUrl.searchParams.get('status') || 'pending'
    const where = status === 'all' ? {} : { status }
    if (status === 'pending') {
      // Exclude draft applications (created during upload, not yet submitted).
      Object.assign(where, { status: 'pending' })
    }

    const applications = await db.kycApplication.findMany({
      where,
      include: {
        user: {
          select: { id: true, uid: true, email: true, username: true, name: true },
        },
        document: { select: { id: true, fileName: true, mimeType: true, size: true, deleteAfter: true } },
      },
      orderBy: { submittedAt: 'desc' },
      take: 100,
    })

    // Filter out draft applications.
    const filtered = applications.filter((a) => a.status !== 'draft')

    return NextResponse.json({
      applications: filtered,
      retentionDays: KYC_RETENTION_DAYS,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed' }, { status: 500 })
  }
}
