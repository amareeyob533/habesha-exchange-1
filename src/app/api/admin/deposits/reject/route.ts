import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api'
import { isAdminEmail, rejectDeposit } from '@/lib/deposit-actions'

/** POST /api/admin/deposits/reject  { depositId } — admin only */
export async function POST(req: NextRequest) {
  try {
    const { user, response } = await requireAuth()
    if (!user) return response!
    if (!isAdminEmail(user.email)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }
    const { depositId } = await req.json()
    if (!depositId) return NextResponse.json({ error: 'depositId required' }, { status: 400 })
    const result = await rejectDeposit(depositId)
    const message =
      result === 'done' ? 'Deposit rejected. No balance credited.' :
      result === 'already' ? 'Deposit was already rejected.' :
      result === 'conflict' ? 'Deposit was approved; cannot reject.' :
      'Deposit not found.'
    return NextResponse.json({ ok: result === 'done' || result === 'already', result, message })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed' }, { status: 500 })
  }
}
