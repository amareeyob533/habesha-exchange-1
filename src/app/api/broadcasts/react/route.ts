import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/api'

/**
 * POST /api/broadcasts/react { broadcastId, type }
 * Toggles the user's reaction on a broadcast:
 *   - If no reaction exists → create one (upsert)
 *   - If a reaction already exists → delete it (toggle off)
 *
 * `type` defaults to "like".
 */
export async function POST(req: NextRequest) {
  try {
    const { user, response } = await requireAuth()
    if (!user) return response!

    const { broadcastId, type = 'like' } = await req.json()
    if (!broadcastId) {
      return NextResponse.json({ error: 'broadcastId is required' }, { status: 400 })
    }

    const broadcast = await db.broadcast.findUnique({ where: { id: broadcastId }, select: { id: true } })
    if (!broadcast) return NextResponse.json({ error: 'Broadcast not found' }, { status: 404 })

    const existing = await db.broadcastReaction.findUnique({
      where: { broadcastId_userId: { broadcastId, userId: user.id } },
      select: { id: true },
    })

    if (existing) {
      // Toggle off — remove the reaction.
      await db.broadcastReaction.delete({ where: { id: existing.id } })
      return NextResponse.json({ ok: true, reacted: false })
    }

    // Toggle on — create the reaction.
    await db.broadcastReaction.create({
      data: { broadcastId, userId: user.id, type },
    })
    return NextResponse.json({ ok: true, reacted: true })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed' }, { status: 500 })
  }
}
