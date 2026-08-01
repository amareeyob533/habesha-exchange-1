import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { isAdminEmail } from '@/lib/deposit-actions'

/**
 * GET /api/kyc/media?id=<mediaId>
 * Serves a KYC media file. Accessible to:
 *   - the owner of the media (the user who uploaded it)
 *   - the admin
 * If the stored `data` is a base64 data URL → returns the binary file directly.
 * If the stored `data` is an external URL (Vercel Blob) → redirects to it.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getCurrentUser()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const id = req.nextUrl.searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const media = await db.kycMedia.findUnique({ where: { id } })
    if (!media) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // Authorization: owner or admin only.
    const isOwner = media.userId === session.id
    const me = await db.user.findUnique({ where: { id: session.id }, select: { email: true } })
    const isAdmin = isAdminEmail(me?.email)
    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // If it's an external URL (Vercel Blob), redirect.
    if (media.data.startsWith('http://') || media.data.startsWith('https://')) {
      return NextResponse.redirect(media.data)
    }

    // Otherwise it's a base64 data URL: parse and return the binary.
    // Format: data:<mime>;base64,<payload>
    const match = media.data.match(/^data:([^;]+);base64,(.+)$/)
    if (!match) {
      return NextResponse.json({ error: 'Invalid media data' }, { status: 500 })
    }
    const mimeType = match[1]
    const base64 = match[2]
    const buffer = Buffer.from(base64, 'base64')
    return new NextResponse(buffer as any, {
      headers: {
        'Content-Type': mimeType,
        'Cache-Control': 'private, max-age=3600',
      },
    })
  } catch (err: any) {
    console.error('kyc media error:', err)
    return NextResponse.json({ error: err?.message || 'Failed' }, { status: 500 })
  }
}
