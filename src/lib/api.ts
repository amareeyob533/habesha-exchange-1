import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'

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
  return { user, response: null }
}
