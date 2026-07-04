import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/api'
import { isAdminEmail } from '@/lib/deposit-actions'
import { KYC_RETENTION_DAYS, cleanupExpiredKyc } from '@/lib/kyc-helpers'

/**
 * POST /api/admin/kyc/approve { applicationId }
 *
 * Approves a KYC application. The user's kycStatus becomes "approved" and
 * kycApprovedAt is set to now. The ID document is KEPT for KYC_RETENTION_DAYS
 * (2 days) so the admin can still review/download it; a `deleteAfter` timestamp
 * is written on the document. Lazy cleanup in /api/kyc/* deletes it once that
 * timestamp passes.
 */
export async function POST(req: NextRequest) {
  try {
    const { user, response } = await requireAuth()
    if (!user) return response!
    if (!isAdminEmail(user.email)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { applicationId } = await req.json()
    if (!applicationId) {
      return NextResponse.json({ error: 'applicationId required' }, { status: 400 })
    }

    const app = await db.kycApplication.findUnique({
      where: { id: applicationId },
      include: { document: true },
    })
    if (!app) return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    if (app.status === 'approved') {
      return NextResponse.json({ ok: true, message: 'Already approved.' })
    }

    const now = new Date()
    const deleteAfter = new Date(now.getTime() + KYC_RETENTION_DAYS * 24 * 60 * 60 * 1000)

    await db.$transaction(async (tx) => {
      await tx.kycApplication.update({
        where: { id: app.id },
        data: { status: 'approved', reviewedAt: now, reviewedBy: user.id },
      })
      if (app.document) {
        await tx.kycDocument.update({
          where: { id: app.document.id },
          data: { deleteAfter },
        })
      }
      await tx.user.update({
        where: { id: app.userId },
        data: {
          kycStatus: 'approved',
          kycApprovedAt: now,
          kycRejectReason: null,
        },
      })
      await tx.notification.create({
        data: {
          userId: app.userId,
          title: 'KYC Approved ✓',
          message: 'Your identity verification has been approved. You now have unlimited deposit and withdrawal limits.',
          type: 'success',
        },
      })
    })

    // Opportunistic cleanup of any expired documents.
    await cleanupExpiredKyc()

    return NextResponse.json({
      ok: true,
      message: `KYC approved. The ID document will be auto-deleted in ${KYC_RETENTION_DAYS} days.`,
      deleteAfter: deleteAfter.toISOString(),
    })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed' }, { status: 500 })
  }
}
