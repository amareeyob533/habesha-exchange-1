import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/api'
import { sendPushNotification } from '@/lib/push'

const AUTOREPUSH_MS = 2 * 60 * 1000 // 2 minutes

/**
 * GET /api/broadcasts
 * Lists the 20 most recent broadcasts for the current user. Each broadcast
 * includes:
 *   - seen: whether the user has a BroadcastSeen row
 *   - reaction: the user's reaction type ("like") or null
 *   - reactionCount: total reactions on this broadcast
 *   - hasVideo: boolean (we do NOT send videoData here — fetch via /api/broadcasts/video)
 *
 * AUTO-REPUSH: for every broadcast the user hasn't seen AND that was created
 * more than 2 minutes ago, we lazily send another push notification. This is
 * checked on every fetch so it doesn't need a background cron.
 */
export async function GET() {
  try {
    const { user, response } = await requireAuth()
    if (!user) return response!

    const broadcasts = await db.broadcast.findMany({
      where: {
        // Only show broadcasts that haven't expired.
        // null expiresAt means it never expires.
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: {
        reactions: { where: { userId: user.id }, select: { type: true } },
        seenBy: { where: { userId: user.id }, select: { id: true } },
        _count: { select: { reactions: true } },
      },
    })

    const now = Date.now()
    const repush: Promise<void>[] = []

    const list = broadcasts.map((b) => {
      const seen = b.seenBy.length > 0
      const reaction = b.reactions[0]?.type || null
      const ageMs = now - new Date(b.createdAt).getTime()
      // Lazy auto-repush: unseen + >2 min old → fire another push.
      if (!seen && ageMs > AUTOREPUSH_MS) {
        const pushTitle = `Broadcast: ${b.title}`
        const pushBody = b.message.length > 120 ? b.message.slice(0, 120) + '…' : b.message
        repush.push(
          sendPushNotification(user.id, { title: pushTitle, body: pushBody, url: '/', tag: `broadcast-${b.id}` }).catch(() => {}),
        )
      }
      return {
        id: b.id,
        title: b.title,
        message: b.message,
        hasVideo: !!b.videoData,
        videoMime: b.videoMime,
        videoSize: b.videoSize,
        createdAt: b.createdAt,
        expiresAt: b.expiresAt,
        isGift: b.isGift,
        seen,
        reaction,
        reactionCount: b._count.reactions,
      }
    })

    // Fire-and-await the repushes (but don't block the response too long).
    if (repush.length > 0) {
      await Promise.all(repush)
    }

    return NextResponse.json({ broadcasts: list })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed' }, { status: 500 })
  }
}
