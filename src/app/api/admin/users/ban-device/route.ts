import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/api'
import { isAdminEmail } from '@/lib/deposit-actions'
import { banDevice, unbanDevice } from '@/lib/device-ban'

/**
 * POST /api/admin/users/ban-device
 *
 * Admin-only. Bans a device so it can no longer be used to create new
 * accounts. The device is identified by the visitorId stored on a User row
 * (collected at signup via ThumbmarkJS).
 *
 * Body: { userId, reason? }
 *   - looks up the user's visitorId from the User table
 *   - inserts it into BannedDevice (idempotent — if already banned, updates reason)
 *
 * Returns 200 on success, 404 if the user has no visitorId on file
 * (e.g. signed up before device fingerprinting was enabled).
 */
export async function POST(req: NextRequest) {
  try {
    const { user, response } = await requireAuth()
    if (!user) return response!
    if (!isAdminEmail(user.email)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }
    const { userId, reason } = await req.json()
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

    const target = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, uid: true, username: true, visitorId: true },
    })
    if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 })
    if (!target.visitorId) {
      return NextResponse.json(
        { error: 'This user has no device fingerprint on file (signed up before device tracking was enabled).', noFingerprint: true },
        { status: 404 },
      )
    }

    const result = await banDevice(target.visitorId, { userId: target.id, reason })
    const message =
      result === 'done' ? `Device banned. @${target.username || target.uid} can no longer create new accounts from this device.` :
      result === 'already' ? 'This device was already banned. Reason updated.' :
      'Invalid visitorId.'
    return NextResponse.json({ ok: result === 'done' || result === 'already', result, message, visitorId: target.visitorId })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed' }, { status: 500 })
  }
}

/**
 * DELETE /api/admin/users/ban-device
 *
 * Admin-only. Removes a device ban (un-ban).
 * Body: { visitorId }
 */
export async function DELETE(req: NextRequest) {
  try {
    const { user, response } = await requireAuth()
    if (!user) return response!
    if (!isAdminEmail(user.email)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }
    const { visitorId } = await req.json()
    if (!visitorId) return NextResponse.json({ error: 'visitorId required' }, { status: 400 })

    const result = await unbanDevice(visitorId)
    const message = result === 'done' ? 'Device un-banned. New signups from this device are allowed again.' : 'Device was not banned.'
    return NextResponse.json({ ok: result === 'done', result, message })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed' }, { status: 500 })
  }
}
