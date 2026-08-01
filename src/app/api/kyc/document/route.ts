import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { isAdminEmail } from '@/lib/deposit-actions'

/**
 * GET /api/kyc/document?id=<docId>&download=true
 *
 * Serves a KYC ID document image. Only the document owner or an admin can
 * view it. When `download=true` is passed, the response carries a
 * Content-Disposition: attachment header so the admin can save the image to
 * their device.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getCurrentUser()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const id = req.nextUrl.searchParams.get('id')
    const download = req.nextUrl.searchParams.get('download') === 'true'
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const doc = await db.kycDocument.findUnique({ where: { id } })
    if (!doc) return NextResponse.json({ error: 'Document not found. It may have been auto-deleted after the retention period.' }, { status: 404 })

    // Owner or admin only.
    const isOwner = doc.userId === session.id
    const me = await db.user.findUnique({ where: { id: session.id }, select: { email: true } })
    const isAdmin = isAdminEmail(me?.email)
    if (!isOwner && !isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    // Parse the data URL → binary buffer.
    const match = doc.data.match(/^data:([^;]+);base64,(.+)$/)
    if (!match) {
      // Maybe it's an external URL (http/https) — redirect to it.
      if (doc.data.startsWith('http://') || doc.data.startsWith('https://')) {
        return NextResponse.redirect(doc.data)
      }
      return NextResponse.json({ error: 'Invalid document data' }, { status: 500 })
    }
    const mimeType = match[1]
    const buffer = Buffer.from(match[2], 'base64')

    const headers: Record<string, string> = {
      'Content-Type': mimeType,
      'Cache-Control': 'private, max-age=3600',
    }
    if (download) {
      // Force download with the original filename.
      const safeName = (doc.fileName || 'id-document').replace(/[^\w.-]/g, '_')
      headers['Content-Disposition'] = `attachment; filename="${safeName}"`
    }

    return new NextResponse(buffer as any, { headers })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed' }, { status: 500 })
  }
}
