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
      kycDocUrl: user.kycDocUrl,
      kycSelfieUrl: user.kycSelfieUrl,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user, response } = await requireAuth()
    if (!user) return response!

    const { level, docUrl, selfieUrl } = await req.json()
    if (level !== 'normal' && level !== 'high') {
      return NextResponse.json({ error: 'Invalid KYC level' }, { status: 400 })
    }
    if (level === 'high' && !docUrl) {
      return NextResponse.json({ error: 'National ID document is required for High KYC' }, { status: 400 })
    }

    await db.user.update({
      where: { id: user.id },
      data: {
        kycStatus: 'pending',
        kycSubmittedAt: new Date(),
        kycDocUrl: docUrl || null,
        kycSelfieUrl: selfieUrl || null,
      },
    })
    await db.notification.create({
      data: {
        userId: user.id,
        title: 'KYC Submitted',
        message:
          level === 'high'
            ? 'Your High KYC verification is under review. This usually takes a few seconds.'
            : 'Your KYC verification is under review. This usually takes a few seconds.',
        type: 'info',
      },
    })

    return NextResponse.json({ ok: true, kycStatus: 'pending' })
  } catch (err: any) {
    console.error('kyc error:', err)
    return NextResponse.json({ error: err?.message || 'KYC submission failed' }, { status: 500 })
  }
}
