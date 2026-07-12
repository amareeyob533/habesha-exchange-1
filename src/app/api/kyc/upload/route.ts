import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/api'

// Max upload size BEFORE client-side compression (the browser compresses
// images to ~150 KB before sending, but we still cap the upper bound).
const MAX_BYTES = 8 * 1024 * 1024

const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'image/avif',
  'image/gif',
  'image/bmp',
])

/**
 * POST /api/kyc/upload — upload ONE side (front | back) of the user's ID photo.
 *
 * Accepts multipart/form-data:
 *   - file: the image file (any common image type, max 8 MB)
 *   - side: "front" | "back"  (defaults to "front")
 *
 * Workflow:
 *   1. Find the user's existing DRAFT KycApplication (status="draft"). If none
 *      exists, create one. A single draft application holds ALL of the user's
 *      in-progress documents (front + back) until they submit.
 *   2. Create a KycDocument row linked to that draft application, with the
 *      requested `side` value.
 *   3. Return { id, url, side } — `url` can be used as an <img src> for the
 *      preview (served by /api/kyc/document?id=...).
 *
 * The actual submit (status=pending) happens in POST /api/kyc.
 *
 * Storage: base64 data URL in the KycDocument.data column — works on Vercel's
 * read-only serverless filesystem (no /public writes).
 */
export async function POST(req: NextRequest) {
  try {
    const { user, response } = await requireAuth()
    if (!user) return response!

    const formData = await req.formData()
    const file = formData.get('file')
    const side = (String(formData.get('side') || 'front').toLowerCase().trim() || 'front') as 'front' | 'back'

    if (side !== 'front' && side !== 'back') {
      return NextResponse.json({ error: 'Invalid side. Must be "front" or "back".' }, { status: 400 })
    }
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const mimeType = file.type || 'application/octet-stream'
    if (!ALLOWED_MIME.has(mimeType)) {
      return NextResponse.json({ error: 'Only image files are allowed (JPG, PNG, WEBP, HEIC, etc.)' }, { status: 400 })
    }
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

    // Find or create a DRAFT application for this user.
    // A draft holds the user's uploaded ID docs until they submit for review.
    let application = await db.kycApplication.findFirst({
      where: { userId: user.id, status: 'draft' },
      orderBy: { submittedAt: 'desc' },
    })
    if (!application) {
      application = await db.kycApplication.create({
        data: {
          userId: user.id,
          fullName: user.name || '',
          city: '',
          idType: '',
          status: 'draft',
        },
      })
    }

    // If the user already has a document for the SAME side on this draft,
    // replace it (delete the old one first so we don't accumulate duplicates).
    const existing = await db.kycDocument.findFirst({
      where: { applicationId: application.id, side },
      select: { id: true },
    })
    if (existing) {
      await db.kycDocument.delete({ where: { id: existing.id } })
    }

    // Create the new document row.
    const doc = await db.kycDocument.create({
      data: {
        applicationId: application.id,
        userId: user.id,
        side,
        mimeType,
        fileName: file.name || `${side}-id.jpg`,
        data: dataUrl,
        size: file.size,
      },
    })

    return NextResponse.json({
      id: doc.id,
      url: `/api/kyc/document?id=${doc.id}`,
      side,
    })
  } catch (err: any) {
    console.error('kyc upload error:', err)
    return NextResponse.json({ error: err?.message || 'Upload failed' }, { status: 500 })
  }
}
