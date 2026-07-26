import { NextRequest, NextResponse } from 'next/server'
import { handleUpload } from '@vercel/blob'
import { requireAuth } from '@/lib/api'
import { isAdminEmail } from '@/lib/deposit-actions'

/**
 * POST /api/blob-upload
 *
 * Generates a client upload token so the admin can upload broadcast media
 * (video/image) DIRECTLY to Vercel Blob storage from the browser.
 *
 * This bypasses Vercel's 4.5MB API route body size limit — the file goes
 * straight from the browser to Vercel's Blob servers, not through our API.
 *
 * Only the admin can call this endpoint. The client uses @vercel/blob/client's
 * upload() function with handleUploadUrl: '/api/blob-upload'.
 */
export async function POST(req: NextRequest) {
  try {
    const { user, response } = await requireAuth()
    if (!user) return response!
    if (!isAdminEmail(user.email)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await req.json()
    const jsonResponse = await handleUpload({
      token: process.env.BLOB_READ_WRITE_TOKEN,
      request: body,
    })
    return NextResponse.json(jsonResponse)
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Blob upload failed' }, { status: 500 })
  }
}
