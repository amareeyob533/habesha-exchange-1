import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api'
import { isAdminEmail } from '@/lib/deposit-actions'
import { approveKyc } from '@/lib/kyc-actions'

/** POST /api/admin/kyc/approve { userId } — admin only */
export async function POST(req: NextRequest) {
  try {
    const { user, response } = await requireAuth()
    if (!user) return response!
    if (!isAdminEmail(user.email)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }
    const { userId } = await req.json()
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })
    const result = await approveKyc(userId)
    const message =
      result === 'done' ? 'KYC approved. User can now deposit & withdraw.' :
      result === 'already' ? 'KYC was already approved.' :
      result === 'no_level' ? 'Could not determine KYC level.' :
      'User not found.'
    return NextResponse.json({ ok: result === 'done' || result === 'already', result, message })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed' }, { status: 500 })
  }
}
