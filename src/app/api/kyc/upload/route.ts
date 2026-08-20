import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/api'

const MAX_BYTES = 8 * 1024 * 1024

/**
 * POST /api/kyc/upload — upload an ID photo for KYC (front or back).
 * Accepts multipart/form-data with `file` and `side` (front|back) fields.
 * Stores as base64 in KycDocument table. Resilient to DB connection errors.
 */
export async function POST(req: NextRequest) {
  try {
    const { user, response } = await requireAuth()
    if (!user) return response!

    const formData = await req.formData()
    const file = formData.get('file')
    const side = (formData.get('side') as string) || 'front'

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (side !== 'front' && side !== 'back') {
      return NextResponse.json({ error: 'Invalid side. Must be "front" or "back".' }, { status: 400 })
    }

    const mimeType = file.type || 'application/octet-stream'
    if (!mimeType.startsWith('image/')) {
      return NextResponse.json({ error: 'Only image files are allowed' }, { status: 400 })
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'File too large. Max 8 MB' }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const base64 = buffer.toString('base64')
    const dataUrl = `data:${mimeType};base64,${base64}`

    // Create a draft KYC application if none exists, then attach the document
    let draftApp = await db.kycApplication.findFirst({
      where: { userId: user.id, status: 'draft' },
      orderBy: { submittedAt: 'desc' },
    })

    if (!draftApp) {
      try {
        draftApp = await db.kycApplication.create({
          data: {
            userId: user.id,
            fullName: '(draft)',
            city: '(draft)',
            idType: 'national_id',
            status: 'draft',
          },
        })
      } catch (firstErr) {
        // Retry on connection error
        await new Promise((r) => setTimeout(r, 500))
        draftApp = await db.kycApplication.create({
          data: {
            userId: user.id,
            fullName: '(draft)',
            city: '(draft)',
            idType: 'national_id',
            status: 'draft',
          },
        })
      }
    }

    // Delete any existing document for this side (no duplicates)
    try {
      await db.kycDocument.deleteMany({
        where: { applicationId: draftApp.id, userId: user.id, side },
      })
    } catch {
      // best-effort
    }

    // Create the document with retry
    let doc = null
    try {
      doc = await db.kycDocument.create({
        data: {
          applicationId: draftApp.id,
          userId: user.id,
          side,
          mimeType,
          fileName: file.name || 'id-document',
          data: dataUrl,
          size: file.size,
        },
      })
    } catch (firstErr) {
      await new Promise((r) => setTimeout(r, 500))
      doc = await db.kycDocument.create({
        data: {
          applicationId: draftApp.id,
          userId: user.id,
          side,
          mimeType,
          fileName: file.name || 'id-document',
          data: dataUrl,
          size: file.size,
        },
      })
    }

    return NextResponse.json({ id: doc.id, url: dataUrl, side, fileName: doc.fileName, size: doc.size })
  } catch (err: any) {
    console.error('kyc upload error:', err)
    return NextResponse.json({ error: err?.message || 'Upload failed' }, { status: 500 })
  }
}
