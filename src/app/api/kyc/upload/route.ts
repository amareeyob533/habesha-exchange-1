import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/api'

// Max ID document upload size: 8 MB.
const MAX_BYTES = 8 * 1024 * 1024

/**
 * POST /api/kyc/upload — upload an ID photo for KYC (step 2).
 *
 * Accepts multipart/form-data with a single `file` field — ANY image type.
 * Stores the image as base64 in the KycDocument table (works on Vercel's
 * read-only filesystem). The document is initially unlinked (no applicationId)
 * and gets linked to a KycApplication when the user submits the full form via
 * /api/kyc.
 *
 * Returns: { id, url, fileName, size }
 *   - id: the KycDocument record id (send this back in /api/kyc as documentId)
 *   - url: a data URL the client can preview immediately
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

    // Accept ANY image type (PNG, JPEG, WEBP, HEIC from iPhone, GIF, BMP, AVIF, TIFF…)
    const mimeType = file.type || 'application/octet-stream'
    const isImage = mimeType.startsWith('image/')
    if (!isImage) {
      return NextResponse.json(
        { error: 'Only image files are allowed. Please upload a photo of your ID.' },
        { status: 400 },
      )
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

    // Store in KycDocument. applicationId is required by the schema (unique),
    // so we create the document with a temporary placeholder and link it on
    // /api/kyc submit. To satisfy the unique constraint we generate a cuid-like
    // placeholder by creating the document first, then it gets reassigned.
    // Simpler: create the document WITHOUT an application by making the relation
    // optional. But our schema marks applicationId as required + unique.
    // So: create a draft KycApplication now, link the document to it, and if
    // the user never submits the final form the draft is just orphaned (cleaned
    // up by the next submission's draft replacement).
    const draftApp = await db.kycApplication.create({
      data: {
        userId: user.id,
        fullName: '(draft)',
        city: '(draft)',
        idType: 'national_id',
        status: 'draft',
      },
    })
    const doc = await db.kycDocument.create({
      data: {
        applicationId: draftApp.id,
        userId: user.id,
        mimeType,
        fileName: file.name || 'id-document',
        data: dataUrl,
        size: file.size,
      },
    })

    return NextResponse.json({
      id: doc.id,
      draftApplicationId: draftApp.id,
      url: dataUrl,
      fileName: doc.fileName,
      size: doc.size,
    })
  } catch (err: any) {
    console.error('kyc upload error:', err)
    return NextResponse.json(
      { error: err?.message || 'Upload failed' },
      { status: 500 },
    )
  }
}
