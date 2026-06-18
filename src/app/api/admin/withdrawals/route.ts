import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api'
import { isAdminEmail } from '@/lib/deposit-actions'
import { fetchWithdrawals } from '@/lib/withdrawal-actions'

/** GET /api/admin/withdrawals?status=pending|completed|rejected|all  — admin only */
export async function GET(req: NextRequest) {
  try {
    const { user, response } = await requireAuth()
    if (!user) return response!
    if (!isAdminEmail(user.email)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }
    const status = req.nextUrl.searchParams.get('status') || 'pending'
    const where = status === 'all' ? undefined : status
    const withdrawals = await fetchWithdrawals(where)
    return NextResponse.json({ withdrawals, count: withdrawals.length })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed' }, { status: 500 })
  }
}
