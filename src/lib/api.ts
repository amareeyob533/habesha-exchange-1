import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { processAutoApprovals } from '@/lib/auto-approve'

/** Require an authenticated session. Returns { user, response } — response is null on success. */
export async function requireAuth() {
  const user = await getCurrentUser()
  if (!user) {
    return {
      user: null,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  }
  // Blocked accounts cannot use any authenticated endpoint.
  if (user.isBlocked) {
    return {
      user: null,
      response: NextResponse.json(
        {
          error: 'Your account has been blocked.',
          blocked: true,
          reason: user.blockedReason || 'Contact support for assistance.',
        },
        { status: 403 },
      ),
    }
  }
  await processAutoApprovals(user.id)
  // re-fetch with balances after auto-approvals may have changed them
  const fresh = await getCurrentUser()
  return { user: fresh, response: null }
}
