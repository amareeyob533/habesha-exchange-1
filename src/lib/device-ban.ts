import { db } from '@/lib/db'

/**
 * Device-ban helpers.
 *
 * Uses the `BannedDevice` table (Prisma). A "device" is identified by a
 * visitorId string produced client-side by ThumbmarkJS (or FingerprintJS).
 *
 * Flow:
 *   1. Client generates a visitorId (see src/lib/fingerprint.ts — client side).
 *   2. On signup, the server calls `isDeviceBanned(visitorId)` — if true,
 *      signup is rejected with "This device is restricted from creating
 *      new accounts."
 *   3. If not banned, the visitorId is stored on the User row
 *      (`user.visitorId`) so the admin can later ban that device from the
 *      user's profile.
 *   4. The admin calls `banDevice(visitorId, userId?, reason?)` to insert a
 *      row into BannedDevice. Future signups from that device are blocked.
 */

/** Returns true if the given visitorId is in the banned_devices table. */
export async function isDeviceBanned(visitorId?: string | null): Promise<boolean> {
  if (!visitorId || typeof visitorId !== 'string') return false
  try {
    const row = await db.bannedDevice.findUnique({
      where: { visitorId },
      select: { id: true },
    })
    return !!row
  } catch {
    // On transient DB errors, fail OPEN (allow signup) — better UX than
    // blocking legitimate users because the DB was briefly unreachable.
    return false
  }
}

/**
 * Insert a visitorId into the banned_devices table.
 * Idempotent — if the device is already banned, returns 'already'.
 * Returns 'done' on a fresh ban, 'invalid' if visitorId is missing.
 */
export async function banDevice(
  visitorId: string,
  meta?: { userId?: string; reason?: string },
): Promise<'done' | 'already' | 'invalid'> {
  if (!visitorId || typeof visitorId !== 'string') return 'invalid'
  try {
    const existing = await db.bannedDevice.findUnique({
      where: { visitorId },
      select: { id: true },
    })
    if (existing) {
      // Optionally update the reason / userId on re-ban.
      if (meta?.reason || meta?.userId) {
        await db.bannedDevice.update({
          where: { visitorId },
          data: {
            reason: meta.reason ?? undefined,
            userId: meta.userId ?? undefined,
          },
        })
      }
      return 'already'
    }
    await db.bannedDevice.create({
      data: {
        visitorId,
        userId: meta?.userId ?? null,
        reason: meta?.reason ?? null,
      },
    })
    return 'done'
  } catch (err) {
    console.error('banDevice failed:', err)
    throw err
  }
}

/** Remove a visitorId from banned_devices (un-ban a device). */
export async function unbanDevice(visitorId: string): Promise<'done' | 'not_found'> {
  if (!visitorId) return 'not_found'
  try {
    const existing = await db.bannedDevice.findUnique({
      where: { visitorId },
      select: { id: true },
    })
    if (!existing) return 'not_found'
    await db.bannedDevice.delete({ where: { visitorId } })
    return 'done'
  } catch (err) {
    console.error('unbanDevice failed:', err)
    throw err
  }
}
