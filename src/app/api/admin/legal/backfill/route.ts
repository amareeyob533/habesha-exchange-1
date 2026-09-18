import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/api'
import { isAdminEmail } from '@/lib/deposit-actions'
import { CURRENT_TOS_VERSION, getTosTextHash } from '@/lib/tos'

/**
 * POST /api/admin/legal/backfill
 *
 * Admin-only. One-time backfill: marks all existing users who signed up
 * BEFORE the ToS-requirement update as having agreed to the Terms of
 * Service. This is useful for legal continuity — every user on the
 * platform gets a recorded ToS acceptance, even retroactively.
 *
 * For each user without a recorded agreement:
 *   - Sets agreedToS=true, tosVersion, tosAgreedAt (their original signup
 *     date), tosAgreedIp='(pre-ToS-update-backfill)'
 *   - Creates a TosAgreement audit-log entry with the same snapshot data
 *     + the SHA-256 hash of the current ToS text.
 *
 * Idempotent — safe to call multiple times. Returns a summary of how many
 * users were backfilled + how many already had agreements.
 */
export async function POST(req: NextRequest) {
  try {
    const { user, response } = await requireAuth()
    if (!user) return response!
    if (!isAdminEmail(user.email)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const tosTextHash = getTosTextHash(CURRENT_TOS_VERSION)
    const backfilledIp = '(pre-ToS-update-backfill)'

    // Find all users who don't have a recorded ToS agreement.
    const users = await db.user.findMany({
      where: { agreedToS: false },
      select: { id: true, uid: true, email: true, name: true, visitorId: true, createdAt: true, kycFullName: true, kycIdType: true, kycCity: true, kycStatus: true },
    })

    let updated = 0
    let logged = 0

    for (const u of users) {
      // Update the User row
      await db.user.update({
        where: { id: u.id },
        data: {
          agreedToS: true,
          tosVersion: CURRENT_TOS_VERSION,
          tosAgreedAt: u.createdAt,
          tosAgreedIp: backfilledIp,
        },
      })
      updated++

      // Create the TosAgreement audit-log entry (if not already exists)
      const existing = await db.tosAgreement.findFirst({
        where: { userId: u.id, tosVersion: CURRENT_TOS_VERSION },
      })
      if (!existing) {
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
            // KYC snapshot at time of backfill
            kycFullName: u.kycFullName,
            kycIdType: u.kycIdType,
            kycCity: u.kycCity,
            kycStatus: u.kycStatus,
          },
        })
        logged++
      }
    }

    const totalAgreements = await db.tosAgreement.count()

    return NextResponse.json({
      ok: true,
      backfilled: updated,
      auditEntriesCreated: logged,
      totalAgreements,
      tosVersion: CURRENT_TOS_VERSION,
      tosTextHash,
      message: updated === 0
        ? 'All users already have a recorded ToS agreement. Nothing to backfill.'
        : `Backfilled ${updated} user(s) with ToS version ${CURRENT_TOS_VERSION}. ${logged} audit-log entries created. Total agreements: ${totalAgreements}.`,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed' }, { status: 500 })
  }
}
