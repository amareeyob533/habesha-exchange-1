import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api'
import { isAdminEmail } from '@/lib/deposit-actions'
import { rejectKyc } from '@/lib/kyc-actions'

/** POST /api/admin/kyc/reject { userId } — admin only */
export async function POST(req: NextRequest) {
  try {
    const { user, response } = await requireAuth()
    if (!user) return response!
    if (!isAdminEmail(user.email)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }
    const { userId } = await req.json()
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })
    const result = await rejectKyc(userId)
    const message =
      result === 'done' ? 'KYC rejected. User notified and can re-apply.' :
      result === 'already' ? 'KYC was already rejected.' :
      'User not found.'
    return NextResponse.json({ ok: result === 'done' || result === 'already', result, message })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed' }, { status: 500 })
  }
}
