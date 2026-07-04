import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/api'

// Maximum upload size: 8 MB (Vercel serverless body limit is ~4.5 MB by default,
// so we compress/validate on the client side too. Anything bigger gets rejected
// with a friendly message before hitting the database.)
const MAX_BYTES = 8 * 1024 * 1024

// Accepted image MIME types — every common picture format.
// Browsers send screenshots as image/png or image/jpeg; phones often send
// image/webp or image/heic. We accept them all.
const ACCEPTED = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/heic',
  'image/heif',
  'image/gif',
  'image/bmp',
  'image/avif',
  'image/tiff',
])

/**
 * POST /api/buy/upload — upload a payment screenshot.
 *
 * Accepts multipart/form-data with a single `file` field (any image type).
 * Stores the image as a base64 data URL in the PaymentProof table (works on
 * Vercel's read-only serverless filesystem — no /public writes needed).
 *
 * Returns: { url, id }  — `url` is a data URL the client can preview directly,
 * `id` is the PaymentProof record id used later to serve the image to the admin.
 *
 * The image is automatically deleted from the database after the admin approves
 * or rejects the buy order (see /api/admin/buys/approve + reject routes).
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

    // Validate type — accept any image/*
    const mimeType = file.type || 'application/octet-stream'
    const isImage =
      mimeType.startsWith('image/') || ACCEPTED.has(mimeType.toLowerCase())
    if (!isImage) {
      return NextResponse.json(
        { error: 'Only image files are allowed (JPG, PNG, WEBP, HEIC, GIF, BMP, AVIF)' },
        { status: 400 },
      )
    }

    // Validate size
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: `File too large. Max 8 MB. Your file is ${(file.size / 1024 / 1024).toFixed(1)} MB` },
        { status: 400 },
      )
    }

    // Read file → base64 data URL
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const base64 = buffer.toString('base64')
    const dataUrl = `data:${mimeType};base64,${base64}`

    // Persist to DB (so admin can review it later via /api/buy/proof?id=...)
    const proof = await db.paymentProof.create({
      data: {
        userId: user.id,
        mimeType,
        fileName: file.name || 'screenshot',
        data: dataUrl,
        size: file.size,
      },
    })

    // The "url" we return is a data URL — the client can preview it immediately.
    // We also return the proof id so the buy-order route can reference it.
    return NextResponse.json({
      url: dataUrl,
      id: proof.id,
      fileName: proof.fileName,
      size: proof.size,
    })
  } catch (err: any) {
    console.error('buy upload error:', err)
    return NextResponse.json(
      { error: err?.message || 'Upload failed' },
      { status: 500 },
    )
  }
}
