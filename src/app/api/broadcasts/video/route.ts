import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import jwt from 'jsonwebtoken'

/**
 * GET /api/broadcasts/video?id=<broadcastId>&token=<jwt>
 * Serves the raw video bytes for a broadcast. Accessible to any authenticated
 * user (broadcasts are global announcements).
 *
 * Supports authentication via:
 * 1. Bearer header (standard)
 * 2. Cookie (same-origin)
 * 3. ?token=<jwt> query param (for <video> elements that can't send headers)
 */
export async function GET(req: NextRequest) {
  try {
    // Try standard auth first (cookie or Bearer header)
    let session = await getCurrentUser()

    // If that fails, try the query param token (for <video> elements)
    if (!session) {
      const queryToken = req.nextUrl.searchParams.get('token')
      if (queryToken) {
        const JWT_SECRET = process.env.JWT_SECRET || 'habesha-exchange-dev-secret-change-me'
        try {
          const payload = jwt.verify(queryToken, JWT_SECRET) as any
          if (payload?.userId) {
            const user = await db.user.findUnique({ where: { id: payload.userId }, select: { id: true } })
            if (user) session = user
          }
        } catch {
          // invalid token
        }
      }
    }

    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const id = req.nextUrl.searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const broadcast = await db.broadcast.findUnique({
      where: { id },
      select: { videoData: true, videoMime: true },
    })
    if (!broadcast) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (!broadcast.videoData) return NextResponse.json({ error: 'No video attached' }, { status: 404 })

    // If the videoData is a Blob URL (starts with http), redirect to it.
    // Vercel Blob URLs are publicly accessible, so no auth needed for the redirect.
    if (broadcast.videoData.startsWith('http://') || broadcast.videoData.startsWith('https://')) {
      return NextResponse.redirect(broadcast.videoData)
    }

    // Otherwise, it's a base64 data URL: data:<mime>;base64,<payload>
    const match = broadcast.videoData.match(/^data:([^;]+);base64,(.+)$/)
    if (!match) {
      return NextResponse.json({ error: 'Invalid video data' }, { status: 500 })
    }
    const mimeType = broadcast.videoMime || match[1]
    const buffer = Buffer.from(match[2], 'base64')

    return new NextResponse(buffer as any, {
      headers: {
        'Content-Type': mimeType,
        'Cache-Control': 'private, max-age=3600',
        'Accept-Ranges': 'bytes',
        'Content-Length': String(buffer.length),
      },
    })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed' }, { status: 500 })
  }
}
