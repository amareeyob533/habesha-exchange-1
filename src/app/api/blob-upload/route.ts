import { NextRequest, NextResponse } from 'next/server'
import { issueSignedToken } from '@vercel/blob'
import { requireAuth } from '@/lib/api'
import { isAdminEmail } from '@/lib/deposit-actions'

/**
 * POST /api/blob-upload
 *
 * Generates a signed token so the admin can upload broadcast media
 * (video/image) DIRECTLY to Vercel Blob storage from the browser.
 * This bypasses Vercel's 4.5MB API route body size limit.
 */
export async function POST(req: NextRequest) {
  try {
    const { user, response } = await requireAuth()
    if (!user) return response!
    if (!isAdminEmail(user.email)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { pathname } = await req.json()
    const token = await issueSignedToken({
      token: process.env.BLOB_READ_WRITE_TOKEN,
      pathname: pathname || `broadcasts/${Date.now()}`,
      // Token valid for 10 minutes
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    })
    return NextResponse.json({ token })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Blob upload token failed' }, { status: 500 })
  }
}
