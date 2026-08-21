import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/api'

const MAX_BYTES = 8 * 1024 * 1024

/**
 * POST /api/buy/upload — upload a payment screenshot.
 * Accepts multipart/form-data with a single `file` field (any image type).
 * Stores as base64 in PaymentProof table. Resilient to DB connection errors.
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
      return NextResponse.json({ error: 'File too large. Max 8 MB' }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const base64 = buffer.toString('base64')
    const dataUrl = `data:${mimeType};base64,${base64}`

    // Save to DB with retry on connection error
    let proof = null
    try {
      proof = await db.paymentProof.create({
        data: {
          userId: user.id,
          mimeType,
          fileName: file.name || 'screenshot',
          data: dataUrl,
          size: file.size,
        },
      })
    } catch (firstErr) {
      // Retry once on connection pool error (Vercel serverless)
      try {
        await new Promise((r) => setTimeout(r, 500))
        proof = await db.paymentProof.create({
          data: {
            userId: user.id,
            mimeType,
            fileName: file.name || 'screenshot',
            data: dataUrl,
            size: file.size,
          },
        })
      } catch (retryErr: any) {
        console.error('buy upload DB error:', retryErr)
        return NextResponse.json({ error: 'Database connection error. Please try again.' }, { status: 500 })
      }
    }

    return NextResponse.json({ url: dataUrl, id: proof.id, fileName: proof.fileName, size: proof.size })
  } catch (err: any) {
    console.error('buy upload error:', err)
    return NextResponse.json({ error: err?.message || 'Upload failed' }, { status: 500 })
  }
}
