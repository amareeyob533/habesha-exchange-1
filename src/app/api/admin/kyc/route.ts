import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api'
import { isAdminEmail } from '@/lib/deposit-actions'
import { fetchKycSubmissions } from '@/lib/kyc-actions'

/** GET /api/admin/kyc?status=pending|approved|rejected|all — admin only */
export async function GET(req: NextRequest) {
  try {
    const { user, response } = await requireAuth()
    if (!user) return response!
    if (!isAdminEmail(user.email)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }
    const status = req.nextUrl.searchParams.get('status') || 'pending'
    const submissions = await fetchKycSubmissions(status)
    return NextResponse.json({ submissions, count: submissions.length })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed' }, { status: 500 })
  }
}
