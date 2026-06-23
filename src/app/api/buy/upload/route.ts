import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/api'

const MAX_SIZE = 8 * 1024 * 1024 // 8MB for screenshots
const IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'webp']

function extToMime(ext: string): string {
  const map: Record<string, string> = {
    jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp',
  }
  return map[ext] || 'image/jpeg'
}

/** POST /api/buy/upload — upload a payment screenshot, returns { url } */
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
      return NextResponse.json({ error: 'File too large (max 8MB)' }, { status: 400 })
    }
    const ext = (file.name.split('.').pop() || '').toLowerCase()
    if (!IMAGE_EXTS.includes(ext)) {
      return NextResponse.json({ error: 'Only JPG, PNG, WEBP images allowed' }, { status: 400 })
    }
    const mimeType = extToMime(ext)

    // Vercel Blob if configured, otherwise base64 in DB.
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      try {
        const { put } = await import('@vercel/blob')
        const blob = await put(`buys/${user.id}-${Date.now()}-${file.name}`, file, {
          access: 'public', contentType: mimeType,
        })
        return NextResponse.json({ url: blob.url })
      } catch (err: any) {
        console.error('Blob upload failed, falling back to DB:', err)
      }
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const base64 = buffer.toString('base64')
    const dataUrl = `data:${mimeType};base64,${base64}`
    const proof = await db.paymentProof.create({
      data: { userId: user.id, mimeType, fileName: file.name, data: dataUrl, size: file.size },
    })
    return NextResponse.json({ url: `/api/buy/proof?id=${proof.id}` })
  } catch (err: any) {
    console.error('buy upload error:', err)
    return NextResponse.json({ error: err?.message || 'Upload failed' }, { status: 500 })
  }
}
