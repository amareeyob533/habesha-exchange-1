import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/api'

const MAX_SIZE = 12 * 1024 * 1024 // 12MB (short 4s webcam clips are well under this)
const IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'webp']
const VIDEO_EXTS = ['webm', 'mp4', 'mov']

function extToMime(ext: string): string {
  const map: Record<string, string> = {
    jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp',
    webm: 'video/webm', mp4: 'video/mp4', mov: 'video/quicktime',
  }
  return map[ext] || 'application/octet-stream'
}

/**
 * POST /api/kyc/upload  (multipart form, field "file")
 *
 * Stores the file and returns { url, kind }.
 *
 * Storage strategy (works on Vercel's read-only filesystem AND local SQLite):
 *  1. If BLOB_READ_WRITE_TOKEN is set → use Vercel Blob (production).
 *  2. Otherwise → store as base64 data URL in the KycMedia DB table, return a
 *     /api/kyc/media?id=<id> URL. (Zero config — works everywhere.)
 */
export async function POST(req: NextRequest) {
  try {
    const { user, response } = await requireAuth()
    if (!user) return response!

    const formData = await req.formData()
    const file = formData.get('file')
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'File too large (max 12MB)' }, { status: 400 })
    }
    const ext = (file.name.split('.').pop() || '').toLowerCase()
    if (!IMAGE_EXTS.includes(ext) && !VIDEO_EXTS.includes(ext)) {
      return NextResponse.json(
        { error: 'Only JPG, PNG, WEBP images or WEBM/MP4 videos allowed' },
        { status: 400 },
      )
    }
    const kind = VIDEO_EXTS.includes(ext) ? 'video' : 'image'
    const mimeType = extToMime(ext)

    // --- Strategy 1: Vercel Blob (production) ---
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      try {
        const { put } = await import('@vercel/blob')
        const blob = await put(`kyc/${user.id}-${Date.now()}-${file.name}`, file, {
          access: 'public',
          contentType: mimeType,
        })
        return NextResponse.json({ url: blob.url, kind })
      } catch (err: any) {
        console.error('Blob upload failed, falling back to DB storage:', err)
        // fall through to strategy 2
      }
    }

    // --- Strategy 2: base64 in database (zero-config fallback) ---
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const base64 = buffer.toString('base64')
    const dataUrl = `data:${mimeType};base64,${base64}`

    const media = await db.kycMedia.create({
      data: {
        userId: user.id,
        kind,
        mimeType,
        fileName: file.name,
        data: dataUrl,
        size: file.size,
      },
    })
    const url = `/api/kyc/media?id=${media.id}`
    return NextResponse.json({ url, kind })
  } catch (err: any) {
    console.error('upload error:', err)
    return NextResponse.json({ error: err?.message || 'Upload failed' }, { status: 500 })
  }
}
