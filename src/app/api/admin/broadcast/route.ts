import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/api'
import { isAdminEmail } from '@/lib/deposit-actions'
import { sendPushNotification } from '@/lib/push'

const MAX_VIDEO_BYTES = 10 * 1024 * 1024 // 10 MB

/**
 * GET /api/admin/broadcast
 * Returns all broadcasts (admin only), most recent first.
 */
export async function GET() {
  try {
    const { user, response } = await requireAuth()
    if (!user) return response!
    if (!isAdminEmail(user.email)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const broadcasts = await db.broadcast.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        _count: { select: { reactions: true, seenBy: true } },
      },
    })

    // Strip videoData (it can be huge) — admin list view doesn't need the bytes.
    const list = broadcasts.map((b) => ({
      id: b.id,
      title: b.title,
      message: b.message,
      hasVideo: !!b.videoData,
      videoMime: b.videoMime,
      videoSize: b.videoSize,
      createdAt: b.createdAt,
      reactionCount: b._count.reactions,
      seenCount: b._count.seenBy,
    }))

    return NextResponse.json({ broadcasts: list, count: list.length })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed' }, { status: 500 })
  }
}

/**
 * POST /api/admin/broadcast  (multipart/form-data)
 * Fields: title, message, file (optional video, max 10 MB)
 *
 * Creates a broadcast, then:
 *   1. Creates a Notification row for every user (so it shows in their panel).
 *   2. Sends a web push notification to every user.
 */
export async function POST(req: NextRequest) {
  try {
    const { user, response } = await requireAuth()
    if (!user) return response!
    if (!isAdminEmail(user.email)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const form = await req.formData()
    const title = (form.get('title') as string | null)?.trim()
    const message = (form.get('message') as string | null)?.trim()
    const file = form.get('file')

    if (!title || !message) {
      return NextResponse.json({ error: 'Title and message are required' }, { status: 400 })
    }

    let videoData: string | null = null
    let videoMime: string | null = null
    let videoSize = 0

    if (file && file instanceof File) {
      // Accept any video/* type. Reject non-videos and oversize files.
      if (!file.type.startsWith('video/')) {
        return NextResponse.json({ error: 'File must be a video' }, { status: 400 })
      }
      if (file.size > MAX_VIDEO_BYTES) {
        return NextResponse.json({ error: 'Video must be 10 MB or less' }, { status: 400 })
      }
      videoMime = file.type
      videoSize = file.size
      const buf = Buffer.from(await file.arrayBuffer())
      videoData = `data:${videoMime};base64,${buf.toString('base64')}`
    }

    // Create the broadcast row.
    const broadcast = await db.broadcast.create({
      data: {
        adminId: user.id,
        title,
        message,
        videoData,
        videoMime,
        videoSize,
      },
    })

    // Fan-out: create a Notification row for EVERY user so it shows in their
    // notification panel. We do this in batches to stay within SQLite parameter limits.
    const users = await db.user.findMany({ select: { id: true } })
    if (users.length > 0) {
      const CHUNK = 200
      for (let i = 0; i < users.length; i += CHUNK) {
        const slice = users.slice(i, i + CHUNK)
        await db.notification.createMany({
          data: slice.map((u) => ({
            userId: u.id,
            title,
            message,
            type: 'info',
          })),
        })
      }
    }

    // Send a web push notification to every user (best-effort, non-blocking).
    if (users.length > 0) {
      const pushTitle = `Broadcast: ${title}`
      const pushBody = message.length > 120 ? message.slice(0, 120) + '…' : message
      const PUSH_CONCURRENCY = 8
      let cursor = 0
      const workers: Promise<void>[] = []
      const runNext = async (): Promise<void> => {
        while (cursor < users.length) {
          const idx = cursor++
          const u = users[idx]
          await sendPushNotification(u.id, { title: pushTitle, body: pushBody, url: '/', tag: `broadcast-${broadcast.id}` }).catch(() => {})
        }
      }
      for (let w = 0; w < PUSH_CONCURRENCY; w++) workers.push(runNext())
      await Promise.all(workers)
    }

    return NextResponse.json({ ok: true, broadcast: { id: broadcast.id, title: broadcast.title } })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed' }, { status: 500 })
  }
}
