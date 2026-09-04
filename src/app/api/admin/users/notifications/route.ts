import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/api'
import { isAdminEmail } from '@/lib/deposit-actions'

/**
 * PATCH /api/admin/users/notifications
 *
 * Admin-only. Edits an existing notification's title / message / type.
 * Body: { id, title?, message?, type? }
 *
 * Only the fields you send are updated. Returns the updated notification.
 */
export async function PATCH(req: NextRequest) {
  try {
    const { user, response } = await requireAuth()
    if (!user) return response!
    if (!isAdminEmail(user.email)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }
    const body = await req.json()
    const { id, title, message, type } = body as {
      id: string
      title?: string
      message?: string
      type?: string
    }
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    // Validate type if provided.
    const allowedTypes = ['info', 'success', 'warning']
    if (type && !allowedTypes.includes(type)) {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
    }

    const existing = await db.notification.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: 'Notification not found' }, { status: 404 })

    const data: { title?: string; message?: string; type?: string } = {}
    if (typeof title === 'string' && title.trim()) data.title = title.trim()
    if (typeof message === 'string') data.message = message
    if (type) data.type = type

    const updated = await db.notification.update({ where: { id }, data })
    return NextResponse.json({ ok: true, notification: updated })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed' }, { status: 500 })
  }
}

/**
 * DELETE /api/admin/users/notifications
 *
 * Admin-only. Permanently deletes a notification by id.
 * Body: { id }
 */
export async function DELETE(req: NextRequest) {
  try {
    const { user, response } = await requireAuth()
    if (!user) return response!
    if (!isAdminEmail(user.email)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }
    const body = await req.json()
    const { id } = body as { id: string }
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const existing = await db.notification.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: 'Notification not found' }, { status: 404 })

    await db.notification.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed' }, { status: 500 })
  }
}
