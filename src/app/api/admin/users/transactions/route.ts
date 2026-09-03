import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/api'
import { isAdminEmail } from '@/lib/deposit-actions'
import { TOKENS } from '@/lib/tokens'

/**
 * PATCH /api/admin/users/transactions
 *
 * Admin-only. Edits an existing transaction.
 * Body: { id, type?, token?, amount?, status?, note?, network?, address?, counterpartyUid? }
 *
 * Only the fields you send are updated. Returns the updated transaction.
 *
 * Notes:
 * - token must be one of the supported TOKENS (if provided).
 * - type must be one of: deposit | withdraw | transfer_in | transfer_out | airdrop | refund (if provided).
 * - status must be one of: pending | completed | failed (if provided).
 * - amount must be a positive number (if provided).
 */
export async function PATCH(req: NextRequest) {
  try {
    const { user, response } = await requireAuth()
    if (!user) return response!
    if (!isAdminEmail(user.email)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }
    const body = await req.json()
    const {
      id, type, token, amount, status, note, network, address, counterpartyUid,
    } = body as {
      id: string
      type?: string
      token?: string
      amount?: number
      status?: string
      note?: string
      network?: string | null
      address?: string | null
      counterpartyUid?: string | null
    }
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const allowedTypes = ['deposit', 'withdraw', 'transfer_in', 'transfer_out', 'airdrop', 'refund']
    const allowedStatuses = ['pending', 'completed', 'failed']

    if (type && !allowedTypes.includes(type)) {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
    }
    if (token && !TOKENS.find((t) => t.symbol === token)) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 400 })
    }
    if (status && !allowedStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }
    if (amount !== undefined) {
      const amt = Number(amount)
      if (!Number.isFinite(amt) || amt < 0) {
        return NextResponse.json({ error: 'amount must be a non-negative number' }, { status: 400 })
      }
    }

    const existing = await db.transaction.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })

    const data: Record<string, unknown> = {}
    if (type) data.type = type
    if (token) data.token = token
    if (amount !== undefined) data.amount = Number(amount)
    if (status) data.status = status
    if (note !== undefined) data.note = note === '' ? null : note
    if (network !== undefined) data.network = network === '' ? null : network
    if (address !== undefined) data.address = address === '' ? null : address
    if (counterpartyUid !== undefined) data.counterpartyUid = counterpartyUid === '' ? null : counterpartyUid

    const updated = await db.transaction.update({ where: { id }, data })
    return NextResponse.json({ ok: true, transaction: updated })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed' }, { status: 500 })
  }
}

/**
 * DELETE /api/admin/users/transactions
 *
 * Admin-only. Permanently deletes a transaction by id.
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

    const existing = await db.transaction.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })

    await db.transaction.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed' }, { status: 500 })
  }
}
