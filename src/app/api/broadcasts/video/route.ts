import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/api'

/**
 * GET /api/broadcasts/video?id=<broadcastId>
 * Serves the raw video bytes for a broadcast. Accessible to any authenticated
 * user (broadcasts are global announcements).
 */
export async function GET(req: NextRequest) {
  try {
    const { user, response } = await requireAuth()
    if (!user) return response!

    const id = req.nextUrl.searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const broadcast = await db.broadcast.findUnique({
      where: { id },
      select: { videoData: true, videoMime: true },
    })
    if (!broadcast) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (!broadcast.videoData) return NextResponse.json({ error: 'No video attached' }, { status: 404 })

    // The stored data is a base64 data URL: data:<mime>;base64,<payload>
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
