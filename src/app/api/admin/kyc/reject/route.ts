import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/api'
import { isAdminEmail } from '@/lib/deposit-actions'
import { sendPushNotification } from '@/lib/push'

/**
 * POST /api/admin/kyc/reject { applicationId, reason? }
 *
 * Rejects a KYC application. The user's kycStatus becomes "rejected" and ALL
 * ID documents (front + back) are DELETED IMMEDIATELY (rejected applications
 * don't need the 2-day retention — only approved ones do, so the admin can
 * re-review).
 */
export async function POST(req: NextRequest) {
  try {
    const { user, response } = await requireAuth()
    if (!user) return response!
    if (!isAdminEmail(user.email)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { applicationId, reason } = await req.json()
    if (!applicationId) {
      return NextResponse.json({ error: 'applicationId required' }, { status: 400 })
    }

    const app = await db.kycApplication.findUnique({
      where: { id: applicationId },
      include: { documents: true },
    })
    if (!app) return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    if (app.status === 'rejected') {
      return NextResponse.json({ ok: true, message: 'Already rejected.' })
    }

    const now = new Date()
    await db.$transaction(async (tx) => {
      await tx.kycApplication.update({
        where: { id: app.id },
        data: {
          status: 'rejected',
          rejectReason: reason || null,
          reviewedAt: now,
          reviewedBy: user.id,
        },
      })
      // Delete ALL linked documents immediately on rejection (front + back).
      if (app.documents.length > 0) {
        await tx.kycDocument.deleteMany({
          where: { id: { in: app.documents.map((d) => d.id) } },
        })
      }
      await tx.user.update({
        where: { id: app.userId },
        data: {
          kycStatus: 'rejected',
          kycRejectReason: reason || null,
        },
      })
      await tx.notification.create({
        data: {
          userId: app.userId,
          title: 'KYC Rejected',
          message: reason
            ? `Your KYC verification was rejected. Reason: ${reason}. You can re-submit your verification after reviewing the requirements.`
            : 'Your KYC verification was rejected. You can re-submit your verification after reviewing the requirements.',
          type: 'warning',
        },
      })
    }, { timeout: 15000 })

    // Push notification AFTER the transaction commits.
    await sendPushNotification(app.userId, {
      title: 'KYC Rejected',
      body: reason
        ? `Your KYC verification was rejected. Reason: ${reason}. You can re-submit your verification after reviewing the requirements.`
        : 'Your KYC verification was rejected. You can re-submit your verification after reviewing the requirements.',
    }).catch(() => {})

    return NextResponse.json({ ok: true, message: 'KYC rejected. User notified. ID documents deleted.' })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed' }, { status: 500 })
  }
}
