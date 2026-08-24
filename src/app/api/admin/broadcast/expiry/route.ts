import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/api'
import { isAdminEmail } from '@/lib/deposit-actions'

/**
 * PATCH /api/admin/broadcast/expiry
 * Body: { id: string, expiresAt: string | null }
 *   - expiresAt may be an ISO date string, "never", "" or null (clears the expiry).
 *
 * Allows the admin to edit the expiry of an existing broadcast after it has
 * been sent. isGift is also editable in the same call (optional).
 */
export async function PATCH(req: NextRequest) {
  try {
    const { user, response } = await requireAuth()
    if (!user) return response!
    if (!isAdminEmail(user.email)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await req.json().catch(() => ({} as any))
    const id = (body.id || '').toString().trim()
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    const existing = await db.broadcast.findUnique({ where: { id }, select: { id: true } })
    if (!existing) {
      return NextResponse.json({ error: 'Broadcast not found' }, { status: 404 })
    }

    // Build the update payload
    const data: { expiresAt?: Date | null; isGift?: boolean } = {}

    if (body.expiresAt !== undefined) {
      const raw = body.expiresAt
      if (raw === null || raw === '' || (typeof raw === 'string' && raw.toLowerCase() === 'never')) {
        data.expiresAt = null
      } else {
        const d = new Date(raw)
        if (isNaN(d.getTime())) {
          return NextResponse.json({ error: 'Invalid expiresAt date' }, { status: 400 })
        }
        data.expiresAt = d
      }
    }

    if (body.isGift !== undefined) {
      data.isGift = !!body.isGift
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
    }

    const updated = await db.broadcast.update({
      where: { id },
      data,
      select: { id: true, expiresAt: true, isGift: true },
    })

    return NextResponse.json({ ok: true, broadcast: updated })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed' }, { status: 500 })
  }
}
