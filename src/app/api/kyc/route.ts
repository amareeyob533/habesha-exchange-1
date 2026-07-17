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
 * Body: { fullName, city, idType, documents }
 *   - fullName: step 1 (required, 2+ chars)
 *   - city: step 1 (required, 2+ chars)
 *   - idType: step 2 (driver_license | national_id | passport)
 *   - documents: array of document IDs returned by /api/kyc/upload.
 *                Must contain BOTH a "front" and a "back" document.
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

    const body = await req.json()
    const fullName = body.fullName
    const city = body.city
    const idType = body.idType
    // Accept either a `documents` array (new) or a single `documentId`
    // (back-compat with older clients).
    const documents: string[] = Array.isArray(body.documents)
      ? body.documents.filter((d: any) => typeof d === 'string' && d.trim())
      : body.documentId
        ? [body.documentId]
        : []

    if (!fullName || String(fullName).trim().length < 2) {
      return NextResponse.json({ error: 'Please enter your full name (step 1).' }, { status: 400 })
    }
    if (!city || String(city).trim().length < 2) {
      return NextResponse.json({ error: 'Please enter your city (step 1).' }, { status: 400 })
    }
    if (!idType || !VALID_ID_TYPES.has(idType)) {
      return NextResponse.json({ error: 'Please choose a valid ID type (step 2).' }, { status: 400 })
    }
    if (documents.length === 0) {
      return NextResponse.json({ error: 'Please upload photos of your ID (front and back).' }, { status: 400 })
    }

    // Verify the uploaded documents exist, belong to this user, and include
    // BOTH a front and a back side.
    const docs = await db.kycDocument.findMany({
      where: { id: { in: documents } },
    })
    if (docs.length !== documents.length) {
      return NextResponse.json({ error: 'One or more uploaded documents were not found. Please upload your ID photos again.' }, { status: 400 })
    }
    for (const d of docs) {
      if (d.userId !== user.id) {
        return NextResponse.json({ error: 'Uploaded document does not belong to your account.' }, { status: 400 })
      }
    }
    const hasFront = docs.some((d) => d.side === 'front')
    const hasBack = docs.some((d) => d.side === 'back')
    if (!hasFront || !hasBack) {
      return NextResponse.json({ error: 'Please upload BOTH the front and the back of your ID.' }, { status: 400 })
    }

    // Find or create the application record.
    let application = await db.kycApplication.findFirst({
      where: { userId: user.id, status: 'draft' },
      orderBy: { submittedAt: 'desc' },
    })
    if (!application) {
      application = await db.kycApplication.create({
        data: {
          userId: user.id,
          fullName: String(fullName).trim(),
          city: String(city).trim(),
          idType,
          status: 'pending',
        },
      })
    } else {
      // Promote the draft to "pending" with the user-supplied info.
      application = await db.kycApplication.update({
        where: { id: application.id },
        data: {
          fullName: String(fullName).trim(),
          city: String(city).trim(),
          idType,
          status: 'pending',
          submittedAt: new Date(),
          rejectReason: null,
        },
      })
    }

    // Ensure ALL uploaded documents are linked to this application. (The
    // upload route already links them to the draft, but a document may have
    // been created against an older draft — re-link it here to be safe.)
    await db.kycDocument.updateMany({
      where: { id: { in: documents } },
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
