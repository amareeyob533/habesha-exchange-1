import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/api'

// Maximum avatar upload size: 5 MB (before client-side compression).
const MAX_BYTES = 5 * 1024 * 1024

/**
 * POST /api/user/avatar — upload a profile picture.
 *
 * Accepts multipart/form-data with a single `file` field (any image type).
 * The client compresses the image BEFORE uploading (see compressImage in
 * src/lib/compress-image.ts) so uploads are fast even on slow connections.
 *
 * Stores the avatar as a base64 data URL in the User.avatarUrl column —
 * works on Vercel's read-only serverless filesystem (no /public writes).
 *
 * Returns: { avatarUrl }
 */
export async function POST(req: NextRequest) {
  try {
    const { user, response } = await requireAuth()
    if (!user) return response!

    const formData = await req.formData()
    const file = formData.get('file')
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const mimeType = file.type || 'application/octet-stream'
    if (!mimeType.startsWith('image/')) {
      return NextResponse.json({ error: 'Only image files are allowed' }, { status: 400 })
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: `File too large. Max 5 MB. Your file is ${(file.size / 1024 / 1024).toFixed(1)} MB` },
        { status: 400 },
      )
    }

    // Read file → base64 data URL
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const base64 = buffer.toString('base64')
    const dataUrl = `data:${mimeType};base64,${base64}`

    // Save to the user record
    await db.user.update({
      where: { id: user.id },
      data: { avatarUrl: dataUrl },
    })

    return NextResponse.json({ avatarUrl: dataUrl })
  } catch (err: any) {
    console.error('avatar upload error:', err)
    return NextResponse.json({ error: err?.message || 'Upload failed' }, { status: 500 })
  }
}
