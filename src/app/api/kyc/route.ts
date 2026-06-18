import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/api'

export async function GET() {
  try {
    const { user, response } = await requireAuth()
    if (!user) return response!
    return NextResponse.json({
      kycStatus: user.kycStatus,
      kycLevel: user.kycLevel,
      kycSubmittedAt: user.kycSubmittedAt,
      kycRequestedLevel: user.kycRequestedLevel,
      kycDocUrl: user.kycDocUrl,
      kycSelfieUrl: user.kycSelfieUrl,
      kycSelfieVideoUrl: user.kycSelfieVideoUrl,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user, response } = await requireAuth()
    if (!user) return response!

    const { level, docUrl, selfieUrl, selfieVideoUrl } = await req.json()
    if (level !== 'normal' && level !== 'high') {
      return NextResponse.json({ error: 'Invalid KYC level' }, { status: 400 })
    }
    // Live camera capture is mandatory for both levels.
    if (!selfieVideoUrl && !selfieUrl) {
      return NextResponse.json(
        { error: 'Live camera capture is required. Please record your face verification.' },
        { status: 400 },
      )
    }
    // ID card photo is mandatory for High KYC.
    if (level === 'high' && !docUrl) {
      return NextResponse.json(
        { error: 'National ID document photo is required for High KYC.' },
        { status: 400 },
      )
    }

    await db.user.update({
      where: { id: user.id },
      data: {
        kycStatus: 'pending',
        kycSubmittedAt: new Date(),
        kycRequestedLevel: level,
        kycDocUrl: docUrl || null,
        kycSelfieUrl: selfieUrl || null,
        kycSelfieVideoUrl: selfieVideoUrl || null,
      },
    })
    await db.notification.create({
      data: {
        userId: user.id,
        title: 'KYC Submitted for Review',
        message:
          level === 'high'
            ? 'Your High KYC verification (ID + live face video) has been submitted. Our admin team will review it shortly. You will be notified once approved or rejected.'
            : 'Your KYC verification (live face video) has been submitted. Our admin team will review it shortly. You will be notified once approved or rejected.',
        type: 'info',
      },
    })

    return NextResponse.json({ ok: true, kycStatus: 'pending' })
  } catch (err: any) {
    console.error('kyc error:', err)
    return NextResponse.json({ error: err?.message || 'KYC submission failed' }, { status: 500 })
  }
}
