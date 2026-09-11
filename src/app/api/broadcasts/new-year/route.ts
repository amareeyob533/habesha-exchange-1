import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/api'
import { sendPushNotification } from '@/lib/push'

/**
 * POST /api/broadcasts/new-year
 *
 * Idempotent auto-seed for the Ethiopian New Year (Enkutatash) broadcast.
 *
 * Called by the client when the dashboard loads and no New Year broadcast
 * has been seen yet. If the broadcast doesn't exist yet, it creates it
 * (as the admin) + fans out a Notification row to every user + sends a
 * push to every user. If it already exists, returns the existing one.
 *
 * This makes the New Year popup work on production without needing the
 * admin to manually send the broadcast from the panel — the first user
 * to load the dashboard after deploying triggers the seed.
 *
 * Auth required: any signed-in user can trigger the seed (the broadcast
 * is always created by the configured admin email).
 */
export async function POST() {
  try {
    const { user, response } = await requireAuth()
    if (!user) return response!

    // The canonical New Year broadcast content.
    const TITLE = 'እንኳን ለ2019 ዓ.ም. ዘመን መለወጫ በዓል አደረሰዎ! 🌼'
    const MESSAGE =
      'ውድ ደንበኛችን እንኳን ለ2019 ዓ.ም. የዘመን መለወጫ በዓል አደረሰዎ!🌼 በዓሉ የሰላም እና የደስታ እንዲሆንልዎ እንመኛለን!\n\nHABESHA EXCHANGE ✅️'

    // Look for an existing New Year broadcast by title/message match.
    // We use plain string contains (case-sensitive is fine here since the
    // Amharic title is always the same). This works on both SQLite (dev)
    // and Postgres (production).
    const existing = await db.broadcast.findFirst({
      where: {
        OR: [
          { title: { contains: 'ዓ.ም' } },
          { title: { contains: 'New Year' } },
          { title: { contains: 'Enkutatash' } },
          { message: { contains: '🌼' } },
          { message: { contains: 'የዘመን መለወጫ' } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 1,
    })

    if (existing) {
      // Already seeded — return it so the caller can mark it seen.
      return NextResponse.json({ ok: true, seeded: false, broadcast: { id: existing.id, title: existing.title, message: existing.message, createdAt: existing.createdAt } })
    }

    // Find the admin user to attach as the broadcast author.
    const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'amareeyob533@gmail.com'
    const admin = await db.user.findUnique({ where: { email: adminEmail }, select: { id: true } })
    if (!admin) {
      // Admin doesn't exist yet on this DB (e.g. fresh deploy). We can't
      // create a broadcast without an adminId. Return empty so the popup
      // just doesn't show — the user will see it once the admin signs up.
      return NextResponse.json({ ok: false, reason: 'no_admin' }, { status: 200 })
    }

    // Create the broadcast.
    const broadcast = await db.broadcast.create({
      data: {
        adminId: admin.id,
        title: TITLE,
        message: MESSAGE,
        videoData: null,
        videoMime: null,
        videoSize: 0,
        isGift: false,
        expiresAt: null, // never expires
      },
    })

    // Fan-out: create a Notification row for EVERY user so it shows in their
    // notification panel. Batched for SQLite/Postgres parameter limits.
    const users = await db.user.findMany({ select: { id: true } })
    if (users.length > 0) {
      const CHUNK = 200
      for (let i = 0; i < users.length; i += CHUNK) {
        const slice = users.slice(i, i + CHUNK)
        await db.notification.createMany({
          data: slice.map((u) => ({
            userId: u.id,
            title: TITLE,
            message: MESSAGE,
            type: 'info',
          })),
        })
      }
    }

    // Send a web push notification to every user (best-effort, non-blocking).
    if (users.length > 0) {
      const pushTitle = `Broadcast: ${TITLE}`
      const pushBody = MESSAGE.length > 120 ? MESSAGE.slice(0, 120) + '…' : MESSAGE
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

    return NextResponse.json({ ok: true, seeded: true, broadcast: { id: broadcast.id, title: broadcast.title, message: broadcast.message, createdAt: broadcast.createdAt } })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed' }, { status: 500 })
  }
}
