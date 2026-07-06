import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/api'
import { cleanupExpiredKyc } from '@/lib/kyc-helpers'
import { sendPushNotification } from '@/lib/push'

const VALID_ID_TYPES = new Set(['driver_license', 'national_id', 'passport'])

/** GET /api/kyc — current user's KYC status */
export async function GET() {
  try {
    const { user, response } = await requireAuth()
    if (!user) return response!
    await cleanupExpiredKyc()
    return NextResponse.json({
      kycStatus: user.kycStatus,
      kycSubmittedAt: user.kycSubmittedAt,
      kycApprovedAt: user.kycApprovedAt,
      kycFullName: user.kycFullName,
      kycCity: user.kycCity,
      kycIdType: user.kycIdType,
      kycRejectReason: user.kycRejectReason,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message }, { status: 500 })
  }
}

/**
 * POST /api/kyc — submit KYC application (Exness-style 2-step).
 * Body: { fullName, city, idType, documentId }
 *   - fullName: step 1 (required, 2+ chars)
 *   - city: step 1 (required, 2+ chars)
 *   - idType: step 2 (driver_license | national_id | passport)
 *   - documentId: id returned by /api/kyc/upload (the uploaded ID photo)
 */
export async function POST(req: NextRequest) {
  try {
    const { user, response } = await requireAuth()
    if (!user) return response!
    await cleanupExpiredKyc()

    // If already approved, don't allow re-submission.
    if (user.kycStatus === 'approved') {
      return NextResponse.json({ error: 'Your KYC is already approved.' }, { status: 400 })
    }
    // If pending, block re-submission (admin must reject first).
    if (user.kycStatus === 'pending') {
      return NextResponse.json({ error: 'Your KYC is already under review. Please wait for the admin to respond.' }, { status: 400 })
    }

    const { fullName, city, idType, documentId } = await req.json()
    if (!fullName || String(fullName).trim().length < 2) {
      return NextResponse.json({ error: 'Please enter your full name (step 1).' }, { status: 400 })
    }
    if (!city || String(city).trim().length < 2) {
      return NextResponse.json({ error: 'Please enter your city (step 1).' }, { status: 400 })
    }
    if (!idType || !VALID_ID_TYPES.has(idType)) {
      return NextResponse.json({ error: 'Please choose a valid ID type (step 2).' }, { status: 400 })
    }
    if (!documentId) {
      return NextResponse.json({ error: 'Please upload a photo of your ID (step 2).' }, { status: 400 })
    }

    // Verify the uploaded document exists and belongs to this user.
    const doc = await db.kycDocument.findUnique({
      where: { id: documentId },
    })
    if (!doc || doc.userId !== user.id) {
      return NextResponse.json({ error: 'Uploaded document not found. Please upload your ID photo again.' }, { status: 400 })
    }

    // Create the application and link the document.
    const application = await db.kycApplication.create({
      data: {
        userId: user.id,
        fullName: String(fullName).trim(),
        city: String(city).trim(),
        idType,
        status: 'pending',
      },
    })
    // Link the document to the new application.
    await db.kycDocument.update({
      where: { id: doc.id },
      data: { applicationId: application.id },
    })

    // Update the user record so the UI reflects "pending".
    await db.user.update({
      where: { id: user.id },
      data: {
        kycStatus: 'pending',
        kycSubmittedAt: new Date(),
        kycFullName: String(fullName).trim(),
        kycCity: String(city).trim(),
        kycIdType: idType,
        kycRejectReason: null,
      },
    })
    await db.notification.create({
      data: {
        userId: user.id,
        title: 'KYC Submitted for Review',
        message: 'Your identity verification has been submitted. Our admin team will review it shortly. You will be notified once approved or rejected.',
        type: 'info',
      },
    })
    await sendPushNotification(user.id, { title: 'KYC Submitted for Review', body: 'Your identity verification has been submitted. Our admin team will review it shortly. You will be notified once approved or rejected.' }).catch(() => {})

    return NextResponse.json({ ok: true, kycStatus: 'pending' })
  } catch (err: any) {
    console.error('kyc submit error:', err)
    return NextResponse.json({ error: err?.message || 'KYC submission failed' }, { status: 500 })
  }
}
