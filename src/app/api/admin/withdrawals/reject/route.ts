import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api'
import { isAdminEmail } from '@/lib/deposit-actions'
import { rejectWithdrawal } from '@/lib/withdrawal-actions'

/** POST /api/admin/withdrawals/reject  { id } — admin only */
export async function POST(req: NextRequest) {
  try {
    const { user, response } = await requireAuth()
    if (!user) return response!
    if (!isAdminEmail(user.email)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }
    const { id } = await req.json()
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
    const result = await rejectWithdrawal(id)
    const message =
      result === 'done' ? 'Withdrawal rejected. Funds returned to user.' :
      result === 'already' ? 'Withdrawal was already rejected.' :
      result === 'conflict' ? 'Withdrawal was approved; cannot reject.' :
      'Withdrawal not found.'
    return NextResponse.json({ ok: result === 'done' || result === 'already', result, message })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed' }, { status: 500 })
  }
}
