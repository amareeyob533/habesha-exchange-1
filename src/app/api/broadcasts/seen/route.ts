import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/api'

/**
 * POST /api/broadcasts/seen { broadcastId }
 * Marks a broadcast as seen by the current user (upsert — idempotent).
 */
export async function POST(req: NextRequest) {
  try {
    const { user, response } = await requireAuth()
    if (!user) return response!

    const { broadcastId } = await req.json()
    if (!broadcastId) {
      return NextResponse.json({ error: 'broadcastId is required' }, { status: 400 })
    }

    // Verify the broadcast exists.
    const broadcast = await db.broadcast.findUnique({ where: { id: broadcastId }, select: { id: true } })
    if (!broadcast) return NextResponse.json({ error: 'Broadcast not found' }, { status: 404 })

    await db.broadcastSeen.upsert({
      where: { broadcastId_userId: { broadcastId, userId: user.id } },
      update: { seenAt: new Date() },
      create: { broadcastId, userId: user.id },
    })

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed' }, { status: 500 })
  }
}
