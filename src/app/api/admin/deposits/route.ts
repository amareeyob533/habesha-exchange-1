import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api'
import { isAdminEmail, fetchDeposits } from '@/lib/deposit-actions'

/** GET /api/admin/deposits?status=pending|approved|rejected|all  — admin only */
export async function GET(req: NextRequest) {
  try {
    const { user, response } = await requireAuth()
    if (!user) return response!
    if (!isAdminEmail(user.email)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }
    const status = req.nextUrl.searchParams.get('status') || 'pending'
    const where = status === 'all' ? undefined : status
    const deposits = await fetchDeposits(where)
    return NextResponse.json({ deposits, count: deposits.length })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed' }, { status: 500 })
  }
}
