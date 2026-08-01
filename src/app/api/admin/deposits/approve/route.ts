import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api'
import { isAdminEmail, approveDeposit } from '@/lib/deposit-actions'

/** POST /api/admin/deposits/approve  { depositId } — admin only */
export async function POST(req: NextRequest) {
  try {
    const { user, response } = await requireAuth()
    if (!user) return response!
    if (!isAdminEmail(user.email)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }
    const { depositId } = await req.json()
    if (!depositId) return NextResponse.json({ error: 'depositId required' }, { status: 400 })
    const result = await approveDeposit(depositId)
    const message =
      result === 'done' ? 'Deposit approved. Balance credited.' :
      result === 'already' ? 'Deposit was already approved.' :
      result === 'conflict' ? 'Deposit was rejected; cannot approve.' :
      'Deposit not found.'
    return NextResponse.json({ ok: result === 'done' || result === 'already', result, message })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed' }, { status: 500 })
  }
}
